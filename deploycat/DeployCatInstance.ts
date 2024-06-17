import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { KnativeOperator } from "./KnativeOperator";
import { CertManager } from "./CertManager";
import { LetsEncrypt } from "./LetsEncrypt";
import { DeployCatWeb, oAuth } from "./deployCatWeb";
import { Namespace } from "@pulumi/kubernetes/core/v1";
import type { Persistance, Database } from "./Postgres";

export type DeployCatInstanceOptions = {
  namespace: pulumi.Input<string>;
  hostname: pulumi.Input<string>;
  letsEncrypt: {
    email?: pulumi.Input<string>;
    solvers?: Array<{
      name: string;
      opts: { [key: string]: pulumi.Input<string> };
    }>;
    extraSolvers?: Array<any>;
  };
  oAuth: oAuth;
  persistance: Persistance;
  database?: Database;
};

const pulumiComponentNamespace: string = "deploycat:Instance";

export class DeployCatInstance extends pulumi.ComponentResource {
  certManager: CertManager;
  letsEncrypt: LetsEncrypt;
  knative: KnativeOperator;
  // web: DeployCatWeb;
  namespace: k8s.core.v1.Namespace;

  constructor(
    name: string,
    args: DeployCatInstanceOptions,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    this.certManager = new CertManager(
      "certmanager",
      { namespaceName: "cert-manager", helmChartVersion: "1.12.3" },
      { provider: opts?.provider, parent: this }
    );

    this.letsEncrypt = new LetsEncrypt(
      "letsencrypt-issuer",
      {
        hostname: args.hostname,
        ...args.letsEncrypt,
      },
      {
        provider: opts?.provider,
        dependsOn: this.certManager.chart,
        parent: this.certManager,
      }
    );

    this.knative = new KnativeOperator(
      "knative",
      {
        hostname: args.hostname,
        namespaceName: "knative-serving",
        clusterIssuer: this.letsEncrypt.issuer,
      },
      {
        provider: opts?.provider,
        dependsOn: [this.letsEncrypt],
        parent: this,
      }
    );

    this.namespace = new k8s.core.v1.Namespace(
      "deploycat-namespace",
      {
        metadata: { name: args.namespace },
      },
      { provider: opts?.provider, parent: this }
    );

    // this.web = new DeployCatWeb(
    //   "deploycatweb",
    //   {
    //     namespaceName: this.namespace.metadata.name,
    //     oAuth: args.oAuth,
    //     persistance: args.persistance,
    //     database: args.database ?? {
    //       user: "deploycat",
    //       name: "deploycat",
    //       password: "deploycat",
    //     },
    //   },
    //   {
    //     provider: opts?.provider,
    //     dependsOn: this.knative,
    //     parent: this,
    //   }
    // );
  }
}
