import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type LonghornOptions = {
  // issuer: k8s.apiextensions.CustomResource;
  // host: string;
};

const pulumiComponentNamespace: string = "deploycat:Longhorn";

export class Longhorn extends pulumi.ComponentResource {
  public readonly chart: k8s.helm.v3.Release;
  public readonly namespace: k8s.core.v1.Namespace;

  constructor(
    name: string,
    args: LonghornOptions,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    this.namespace = new k8s.core.v1.Namespace(
      "longhorn-system",
      {
        metadata: { name: "longhorn-system" },
      },
      { provider: opts?.provider, parent: this },
    );

    this.chart = new k8s.helm.v3.Release(
      name,
      {
        chart: "longhorn",
        namespace: this.namespace.metadata.name,
        repositoryOpts: {
          repo: "https://charts.longhorn.io",
        },
        values: {
          // ingress: {
          //   enabled: true,
          //   host: args.host,
          //   tls:`${args.host}-cert`,
          //   annotations: {
          //     "cert-manager.io/cluster-issuer": args.issuer.metadata.name,
          //   },
          // },
        },
        version: "1.5.1",
      },
      { dependsOn: this.namespace, provider: opts?.provider, parent: this },
    );
  }
}
