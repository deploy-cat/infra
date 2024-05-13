import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export type Persistance = {
  storageClass: pulumi.Input<string>;
};

export type Database = {
  name: pulumi.Input<string>;
  user: pulumi.Input<string>;
  password: pulumi.Input<string>;
};

export type PostgresOptions = {
  namespaceName: pulumi.Input<string>;
  persistance: Persistance;
  database: Database;
};

const pulumiComponentNamespace: string = "daploycat:Postgres";

export class Postgres extends pulumi.ComponentResource {
  public readonly configMap: k8s.core.v1.ConfigMap;
  public readonly storageClaim: k8s.core.v1.PersistentVolumeClaim;
  public readonly deployment: k8s.apps.v1.Deployment;
  public readonly service: k8s.core.v1.Service;

  constructor(
    name: string,
    args: PostgresOptions,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    this.configMap = new k8s.core.v1.ConfigMap(
      name,
      {
        metadata: {
          name,
          namespace: args.namespaceName,
          labels: {
            app: "postgres",
          },
        },
        data: {
          POSTGRES_DB: args.database.name,
          POSTGRES_USER: args.database.user,
          POSTGRES_PASSWORD: args.database.password,
        },
      },
      { provider: opts?.provider, parent: this }
    );

    this.storageClaim = new k8s.core.v1.PersistentVolumeClaim(
      name,
      {
        metadata: {
          name,
          namespace: args.namespaceName,
        },
        spec: {
          storageClassName: args.persistance.storageClass,
          accessModes: ["ReadWriteMany"],
          resources: {
            requests: {
              storage: "1Gi",
            },
          },
        },
      },
      { provider: opts?.provider, parent: this }
    );

    this.deployment = new k8s.apps.v1.Deployment(
      name,
      {
        metadata: {
          name,
          namespace: args.namespaceName,
        },
        spec: {
          selector: {
            matchLabels: {
              app: "postgres",
            },
          },
          template: {
            metadata: {
              labels: {
                app: "postgres",
              },
            },
            spec: {
              containers: [
                {
                  name: "postgres",
                  image: "postgres",
                  imagePullPolicy: "IfNotPresent",
                  ports: [{ containerPort: 5432 }],
                  envFrom: [
                    {
                      configMapRef: {
                        name: this.configMap.metadata.name,
                      },
                    },
                  ],
                  volumeMounts: [
                    {
                      mountPath: "/var/lib/postgresql/data",
                      name: "postgresdata",
                    },
                  ],
                },
              ],
              volumes: [
                {
                  name: "postgresdata",
                  persistentVolumeClaim: {
                    claimName: this.storageClaim.metadata.name,
                  },
                },
              ],
            },
          },
        },
      },
      { provider: opts?.provider, parent: this }
    );

    this.service = new k8s.core.v1.Service(
      name,
      {
        metadata: {
          name,
          namespace: args.namespaceName,
          labels: {
            app: "postgres",
          },
        },
        spec: {
          type: "NodePort",
          ports: [
            {
              port: 5432,
            },
          ],
          selector: {
            app: "postgres",
          },
        },
      },
      { provider: opts?.provider, parent: this }
    );
  }
}
