import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { Postgres } from "./Postgres";
import type { Persistance, Database } from "./Postgres";

export type oAuth = {
  apps: {
    github: {
      id: pulumi.Input<string>;
      secret: pulumi.Input<string>;
    };
  };
  secret: pulumi.Input<string>;
};

export type DeployCatWebOptions = {
  namespaceName: pulumi.Input<string>;
  oAuth: oAuth;
  database: Database;
  persistance: Persistance;
};

const pulumiComponentNamespace: string = "deploycat:DeploycatApp";

export class DeployCatWeb extends pulumi.ComponentResource {
  public readonly secret: k8s.core.v1.Secret;
  public readonly service: k8s.apiextensions.CustomResource;
  public readonly serviceaccount: k8s.core.v1.ServiceAccount;
  public readonly db: Postgres;

  constructor(
    name: string,
    args: DeployCatWebOptions,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    this.db = new Postgres(
      "postgres",
      {
        namespaceName: args.namespaceName,
        persistance: args.persistance,
        database: args.database,
      },
      { provider: opts?.provider, parent: this }
    );

    this.secret = new k8s.core.v1.Secret(
      "deploycat-web-secrets",
      {
        metadata: {
          name: "deploycat-web-secrets",
          namespace: args.namespaceName,
        },
        type: "Opaque",
        data: {
          GITHUB_ID: args.oAuth.apps.github.id,
          GITHUB_SECRET: args.oAuth.apps.github.secret,
          AUTH_SECRET: args.oAuth.secret,
        },
      },
      { provider: opts?.provider, parent: this }
    );

    this.serviceaccount = new k8s.core.v1.ServiceAccount(
      "deploycat",
      {
        metadata: {
          name: "deploycat",
          namespace: args.namespaceName,
        },
      },
      { provider: opts?.provider, parent: this }
    );

    this.service = new k8s.apiextensions.CustomResource(
      "app",
      {
        apiVersion: "serving.knative.dev/v1",
        kind: "Service",
        metadata: {
          name: "app",
          namespace: args.namespaceName,
        },
        spec: {
          template: {
            metadata: {
              annotations: {
                "autoscaling.knative.dev/min-scale": "1",
              },
            },
            spec: {
              serviceAccountName: this.serviceaccount.metadata.name,
              containers: [
                {
                  image: "ghcr.io/deploy-cat/deploy-cat-web:latest",
                  ports: [{ containerPort: 3000 }],
                  env: [
                    {
                      name: "GITHUB_ID",
                      valueFrom: {
                        secretKeyRef: {
                          name: this.secret.metadata.name,
                          key: "GITHUB_ID",
                        },
                      },
                    },
                    {
                      name: "GITHUB_SECRET",
                      valueFrom: {
                        secretKeyRef: {
                          name: this.secret.metadata.name,
                          key: "GITHUB_SECRET",
                        },
                      },
                    },
                    {
                      name: "AUTH_SECRET",
                      valueFrom: {
                        secretKeyRef: {
                          name: this.secret.metadata.name,
                          key: "AUTH_SECRET",
                        },
                      },
                    },
                    {
                      name: "DEPLOYCAT_KUBECONFIG_FROM_CLUSTER",
                      value: "true",
                    },
                    {
                      name: "DATABASE_URL",
                      value: pulumi.interpolate`postgresql://${
                        args.database.user
                      }:${args.database.password}deploycat@${
                        this.db.service.metadata.name
                      }.${args.namespaceName.toString()}svc.cluster.local/deploycat`,
                      // value: `postgresql://deploycat:deploycat@postgres.deploycat-system.cluster.local/deploycat`,
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      { provider: opts?.provider, parent: this }
    );
  }
}
