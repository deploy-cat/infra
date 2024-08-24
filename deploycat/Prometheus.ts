import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type PrometheusOptions = {
  namespaceName: pulumi.Input<string>;
  helmChartVersion?: pulumi.Input<string>;
  knative: {
    enableServicemonitor: boolean;
    enableDasboards: boolean;
  };
};

const pulumiComponentNamespace: string = "deploycat:Prometheus";

export class Prometheus extends pulumi.ComponentResource {
  public readonly chart: k8s.helm.v3.Release;

  constructor(
    name: string,
    args: PrometheusOptions,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    this.chart = new k8s.helm.v3.Release(
      name,
      {
        namespace: args.namespaceName,
        chart: "kube-prometheus-stack",
        version: args.helmChartVersion || "62.3.0",
        repositoryOpts: {
          repo: "https://prometheus-community.github.io/helm-charts",
        },
        values: {
          "kube-state-metrics": {
            metricLabelsAllowlist: [
              "pods=[*]",
              "deployments=[app.kubernetes.io/name,app.kubernetes.io/component,app.kubernetes.io/instance]",
            ],
          },
          prometheus: {
            prometheusSpec: {
              serviceMonitorSelectorNilUsesHelmValues: false,
              podMonitorSelectorNilUsesHelmValues: false,
            },
          },
          grafana: {
            sidecar: {
              dashboards: {
                enabled: true,
                searchNamespace: "ALL",
              },
            },
          },
        },
      },
      { provider: opts?.provider, parent: this }
    );

    // Metrics collection

    if (args.knative.enableServicemonitor) {
      const servicemonitor = new k8s.yaml.ConfigFile(
        "servicemonitor",
        {
          file: "https://raw.githubusercontent.com/knative-extensions/monitoring/main/servicemonitor.yaml",
        },
        {
          provider: opts?.provider,
          parent: this,
        }
      );
    }

    if (args.knative.enableServicemonitor && args.knative.enableDasboards) {
      const dashboards = new k8s.yaml.ConfigFile(
        "dashboards",
        {
          file: "https://raw.githubusercontent.com/knative-extensions/monitoring/main/grafana/dashboards.yaml",
        },
        {
          provider: opts?.provider,
          parent: this,
        }
      );
    }
  }
}
