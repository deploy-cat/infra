import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type LetsEncryptOptions = {
  hostname: pulumi.Input<string>;
  email?: pulumi.Input<string>;
  solvers?: Array<any>;
  extraSolvers?: Array<any>;
};

const pulumiComponentNamespace: string = "turingev:LetsEncrypt";

export class LetsEncrypt extends pulumi.ComponentResource {
  public readonly issuer: k8s.apiextensions.CustomResource;
  constructor(
    name: string,
    args: LetsEncryptOptions,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    const getSolver = (name: string, solverOpts: any) => {
      switch (name) {
        case "do": {
          const digitaloceanCredentials = new k8s.core.v1.Secret(
            "lets-encrypt-do-dns",
            {
              metadata: {
                name: "lets-encrypt-do-dns",
                namespace: "cert-manager",
              },
              type: "Opaque",
              stringData: {
                "access-token": solverOpts.accessToken,
              },
            },
            { provider: opts?.provider }
          );
          return {
            selector: {
              dnsZones: args.hostname,
            },
            dns01: {
              digitalocean: {
                tokenSecretRef: {
                  name: digitaloceanCredentials.metadata.name,
                  key: "access-token",
                },
              },
            },
          };
        }
        // case("cloudflare"): //TODO
        default: {
          return {};
        }
      }
    };

    this.issuer = new k8s.apiextensions.CustomResource(
      name,
      {
        apiVersion: "cert-manager.io/v1",
        kind: "ClusterIssuer",
        metadata: { name },
        spec: {
          acme: {
            server: "https://acme-v02.api.letsencrypt.org/directory",
            email: args.email,
            privateKeySecretRef: {
              name: "letsencrypt-account-key",
            },
            solvers: [
              ...(args.solvers?.map(({ name, opts }) =>
                getSolver(name, opts)
              ) ?? []),
              ...(args.extraSolvers ?? []),
            ],
          },
        },
      },
      { provider: opts?.provider, parent: this }
    );
  }
}
