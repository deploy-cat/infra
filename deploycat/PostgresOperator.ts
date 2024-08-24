import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type PostgresOperatorOptions = {
  namespaceName: pulumi.Input<string>;
  helmChartVersion?: pulumi.Input<string>;
};

const pulumiComponentNamespace: string = "deploycat:PostgresOperator";

export class PostgresOperator extends pulumi.ComponentResource {
  public readonly namespace: k8s.core.v1.Namespace;
  public readonly chart: k8s.helm.v3.Release;

  constructor(
    name: string,
    args: PostgresOperatorOptions,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    this.namespace = new k8s.core.v1.Namespace(
      "cnpg",
      {
        metadata: { name: args.namespaceName },
      },
      { provider: opts?.provider, parent: this }
    );

    this.chart = new k8s.helm.v3.Release(
      name,
      {
        namespace: this.namespace.metadata.name,
        chart: "cloudnative-pg",
        version: args.helmChartVersion || "0.21.5",
        repositoryOpts: {
          repo: "https://cloudnative-pg.github.io/charts",
        },
        values: {
          installCRDs: true,
          livenessProbe: {
            enabled: true,
          },
        },
      },
      { provider: opts?.provider, parent: this }
    );
  }
}
