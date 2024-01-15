import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type CertManagerOptions = {
  replicas?: pulumi.Input<number>;
  namespaceName: pulumi.Input<string>;
  helmChartVersion: pulumi.Input<string>;
  iamRoleArn?: pulumi.Input<string>;
  hostAliases?: k8s.types.input.core.v1.HostAlias[];
};

const pulumiComponentNamespace: string = "deploycat:CertManager";

export class CertManager extends pulumi.ComponentResource {
  public readonly namespace: k8s.core.v1.Namespace;
  public readonly chart: k8s.helm.v3.Release;

  constructor(
    name: string,
    args: CertManagerOptions,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    this.namespace = new k8s.core.v1.Namespace(
      "cert-manager",
      {
        metadata: { name: "cert-manager" },
      },
      { provider: opts?.provider, parent: this }
    );

    this.chart = new k8s.helm.v3.Release(
      name,
      {
        namespace: args.namespaceName,
        chart: "cert-manager",
        version: args.helmChartVersion || "v1.0.3",
        repositoryOpts: {
          repo: "https://charts.jetstack.io",
        },
        values: {
          installCRDs: true,
          livenessProbe: {
            enabled: true,
          },
        },
      },
      { provider: opts?.provider, dependsOn: this.namespace, parent: this }
    );
  }
}
