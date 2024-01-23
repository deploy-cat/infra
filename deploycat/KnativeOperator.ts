import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type KnativeOptions = {
  namespaceName: pulumi.Input<string>;
  hostname: pulumi.Input<string>;
  clusterIssuer: k8s.apiextensions.CustomResource;
};

const pulumiComponentNamespace: string = "deploycat:KnativeOperator";

export class KnativeOperator extends pulumi.ComponentResource {
  serving: k8s.apiextensions.CustomResource;

  constructor(
    name: string,
    args: KnativeOptions,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    const knativeOperator = new k8s.yaml.ConfigFile(
      "knative-operator",
      {
        file: "https://github.com/knative/operator/releases/download/knative-v1.12.2/operator.yaml",
      },
      {
        provider: opts?.provider,
        parent: this,
      }
    );

    const namespace = new k8s.core.v1.Namespace(
      "knative-namespace",
      {
        metadata: { name: args.namespaceName },
      },
      { provider: opts?.provider, parent: this }
    );

    this.serving = new k8s.apiextensions.CustomResource(
      "knative-serving",
      {
        apiVersion: "operator.knative.dev/v1beta1",
        kind: "KnativeServing",
        metadata: {
          name: "knative-serving",
          namespace: namespace.metadata.name,
        },
        spec: {
          ingress: {
            kourier: {
              enabled: true,
            },
          },
          config: {
            network: {
              "ingress-class": "kourier.ingress.networking.knative.dev",
              // "auto-tls": "Enabled",
              // "http-protocol": "Redirected",
              // "namespace-wildcard-cert-selector": JSON.stringify({
              //   matchExpressions: [
              //     {
              //       key: "networking.knative.dev/disableWildcardCert",
              //       operator: "NotIn",
              //       values: [true],
              //     },
              //   ],
              // }),
            },
            domain: {
              [args.hostname.toString()]: "",
            },
          },
        },
      },
      { provider: opts?.provider, parent: this, dependsOn: [knativeOperator] }
    );
  }
}
