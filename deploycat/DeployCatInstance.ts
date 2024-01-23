import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { KnativeOperator } from "./KnativeOperator";
import { CertManager } from "./CertManager";
import { LetsEncrypt } from "./LetsEncrypt";

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
};

const pulumiComponentNamespace: string = "deploycat:Instance";

export class DeployCatInstance extends pulumi.ComponentResource {
  certManager: CertManager;
  letsEncrypt: LetsEncrypt;
  knative: KnativeOperator;

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
        dependsOn: this.certManager,
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
  }
}
