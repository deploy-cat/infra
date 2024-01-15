import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { Knative } from "./Knative.ts";
import { CertManager } from "./CertManager.ts";
import { LetsEncrypt } from "./LetsEncrypt.ts";

export type DeployCatInstanceOptions = {
  namespace: pulumi.Input<string>;
  hostname: pulumi.Input<string>;
  letsEncrypt: {
    email?: pulumi.Input<string>;
    solvers?: Array<string>;
    extraSolvers?: Array<any>;
  };
};

const pulumiComponentNamespace: string = "deploycat:Instance";

export class DeployCatInstance extends pulumi.ComponentResource {
  certManager: CertManager;
  letsEncrypt: LetsEncrypt;
  knative: Knative;

  constructor(
    name: string,
    args: DeployCatInstanceOptions,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    this.certManager = new CertManager(
      "turingev-certmanager",
      { namespaceName: "cert-manager", helmChartVersion: "1.12.3" },
      { provider: opts?.provider, parent: this }
    );

    this.letsEncrypt = new LetsEncrypt(
      "letsencrypt-issuer",
      {
        hostname: args.hostname,
        ...args.letsEncrypt,
      },
      { provider: opts?.provider, dependsOn: this.certManager, parent: this.certManager }
    );

    this.knative = new Knative(
      "knative",
      {
        providerWithSSA: opts?.provider,
        hostname: args.hostname,
        namespace: "knative",
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
