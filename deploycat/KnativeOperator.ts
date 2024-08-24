import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type KnativeOptions = {
  serving: {
    enable: pulumi.Input<boolean>;
    namespaceName: pulumi.Input<string>;
    domain: pulumi.Input<string>;
  };
  eventing: {
    enable: pulumi.Input<boolean>;
    namespaceName: pulumi.Input<string>;
  };
  clusterIssuer: k8s.apiextensions.CustomResource;
};

const pulumiComponentNamespace: string = "deploycat:KnativeOperator";

export class KnativeOperator extends pulumi.ComponentResource {
  servingNamespace?: k8s.core.v1.Namespace;
  eventingNamespace?: k8s.core.v1.Namespace;
  serving?: k8s.apiextensions.CustomResource;
  eventing?: k8s.apiextensions.CustomResource;

  constructor(
    name: string,
    args: KnativeOptions,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    const knativeOperator = new k8s.yaml.ConfigFile(
      "knative-operator",
      {
        file: "https://github.com/knative/operator/releases/download/knative-v1.13.2/operator.yaml",
      },
      {
        provider: opts?.provider,
        parent: this,
      }
    );

    if (args.serving.enable) {
      this.servingNamespace = new k8s.core.v1.Namespace(
        "knative-serving-namespace",
        {
          metadata: { name: args.serving.namespaceName },
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
            namespace: this.servingNamespace.metadata.name,
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
              domain: {
                [args.serving.domain.toString()]: "",
              },
            },
          },
        },
        { provider: opts?.provider, parent: this, dependsOn: [knativeOperator] }
      );

      const knativeCertmanager = new k8s.yaml.ConfigFile(
        "knative-net-certmanager",
        {
          file: "https://github.com/knative/net-certmanager/releases/download/knative-v1.13.0/release.yaml",
          transformations: [
            (res, opts) => {
              if (
                res.kind === "ConfigMap" &&
                res.metadata.name === "config-certmanager"
              ) {
                res.data = {
                  issuerRef: args.clusterIssuer.metadata.apply(({ name }) =>
                    Object.entries({
                      kind: "ClusterIssuer",
                      name,
                    })
                      .map(([key, value]) => `${key}: ${value}`)
                      .join("\n")
                  ),
                };
              }
            },
          ],
        },
        {
          provider: opts?.provider,
          parent: this,
        }
      );
    }

    if (args.eventing.enable) {
      this.eventingNamespace = new k8s.core.v1.Namespace(
        "knative-eventing-namespace",
        {
          metadata: { name: args.eventing.namespaceName },
        },
        { provider: opts?.provider, parent: this }
      );

      this.serving = new k8s.apiextensions.CustomResource(
        "knative-eventing",
        {
          apiVersion: "operator.knative.dev/v1beta1",
          kind: "KnativeEventing",
          metadata: {
            name: "knative-eventing",
            namespace: this.eventingNamespace.metadata.name,
          },
          spec: {},
        },
        { provider: opts?.provider, parent: this, dependsOn: [knativeOperator] }
      );
    }
  }
}
