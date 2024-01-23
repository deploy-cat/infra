import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type KnativeOptions = {
  providerWithSSA?: k8s.Provider;
  namespace: pulumi.Input<string>;
  hostname: pulumi.Input<string>;
  clusterIssuer: k8s.apiextensions.CustomResource;
};

const pulumiComponentNamespace: string = "deploycat:Knative";

export class Knative extends pulumi.ComponentResource {
  kourierServiceName: pulumi.Output<string>;
  kourierLoadBalancerIP: pulumi.Output<string>;

  constructor(
    name: string,
    args: KnativeOptions,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    // Deploy Knative Serving component
    // const knativeServingCRDs = new k8s.yaml.ConfigFile("knative-serving-crds", {
    //   file:
    //     "https://github.com/knative/serving/releases/download/knative-v1.10.1/serving-crds.yaml",
    // }, {});
    const knativeServingCore = new k8s.yaml.ConfigFile(
      "knative-serving-core",
      {
        file: "https://github.com/knative/serving/releases/download/knative-v1.12.3/serving-core.yaml",
      },
      {
        provider: opts?.provider,
        parent: this,
      }
    );
    const knativeCertmanager = new k8s.yaml.ConfigFile(
      "knative-net-certmanager",
      {
        file: "https://github.com/knative/net-certmanager/releases/download/knative-v1.12.3/release.yaml",
      },
      {
        dependsOn: [knativeServingCore, args.clusterIssuer],
        provider: opts?.provider,
        parent: this,
      }
    );

    // Deploy Kourier as the ingress for Knative
    const kourier = new k8s.yaml.ConfigFile(
      "kourier",
      {
        file: "https://github.com/knative/net-kourier/releases/download/knative-v1.12.3/kourier.yaml",
      },
      {
        dependsOn: [knativeServingCore],
        provider: opts?.provider,
        parent: this,
      }
    );

    //configs

    const networkConfigMap = knativeServingCore.getResource(
      "v1/ConfigMap",
      "knative-serving",
      "config-network"
    );

    const networkConfigMapPatch = new k8s.core.v1.ConfigMapPatch(
      "config-network-patch",
      {
        metadata: {
          name: networkConfigMap.metadata.name,
          namespace: networkConfigMap.metadata.namespace,
        },
        data: {
          "ingress-class": "kourier.ingress.networking.knative.dev",
          "auto-tls": "Enabled",
          "http-protocol": "Redirected",
          "namespace-wildcard-cert-selector": JSON.stringify({
            matchExpressions: [
              {
                key: "networking.knative.dev/disableWildcardCert",
                operator: "NotIn",
                values: [true],
              },
            ],
          }),
        },
      },
      {
        dependsOn: [knativeServingCore],
        provider: args.providerWithSSA,
        parent: this,
      }
    );

    const domainConfigMap = knativeServingCore.getResource(
      "v1/ConfigMap",
      "knative-serving",
      "config-domain"
    );

    const domainConfigMapPatch = new k8s.core.v1.ConfigMapPatch(
      "config-domain-patch",
      {
        metadata: {
          name: domainConfigMap.metadata.name,
          namespace: domainConfigMap.metadata.namespace,
        },
        data: {
          [args.hostname.toString()]: "",
        },
      },
      {
        provider: args.providerWithSSA,
        parent: this,
      }
    );

    const certManagerConfigMap = knativeCertmanager.getResource(
      "v1/ConfigMap",
      "knative-serving",
      "config-certmanager"
    );

    const certManagerConfigMapPatch = new k8s.core.v1.ConfigMapPatch(
      "config-certmanager-patch",
      {
        metadata: {
          name: certManagerConfigMap.metadata.name,
          namespace: certManagerConfigMap.metadata.namespace,
          labels: {
            "networking.knative.dev/certificate-provider": "cert-manager",
          },
        },
        data: {
          issuerRef: args.clusterIssuer.metadata.apply(({ name }) =>
            Object.entries({
              kind: "ClusterIssuer",
              name,
            })
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n")
          ),
        },
      },
      {
        provider: args.providerWithSSA,
        parent: this,
      }
    );

    // Export the Kourier LoadBalancer service
    const kourierService = kourier.getResource(
      "v1/Service",
      "kourier-system",
      "kourier"
    );

    this.kourierServiceName = kourierService.metadata.name;
    this.kourierLoadBalancerIP =
      kourierService.status.loadBalancer.ingress[0].ip;
  }
}
