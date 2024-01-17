import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";

export type K8sClusterOptions = {
  configPath: string;
};

const pulumiComponentNamespace: string = "k3se:K8sCluster";

export class Cluster extends pulumi.ComponentResource {
  kubeconfig: pulumi.Output<string>;

  constructor(
    name: string,
    args: K8sClusterOptions,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super(pulumiComponentNamespace, name, args, opts);

    // TODO: debug cmd error 126 in pipeline
    // const k3seCmd = new command.local.Command(
    //   "k3seCmd",
    //   {
    //     create: "k3se up ./k3se/stage.yml -k /dev/null",
    //     update: "k3se up ./k3se/stage.yml -k /dev/null",
    //     delete: "k3se down ./k3se/stage.yml",
    //   },
    //   { parent: this },
    // );

    const getKubeconfigCmd = new command.local.Command(
      "getKubeconfigCmd",
      {
        create: `k3se up -s -k /tmp/k3se-kubeconfig ${args.configPath} &> /dev/null && cat /tmp/k3se-kubeconfig`,
      },
      { parent: this }
    );

    this.kubeconfig = getKubeconfigCmd.stdout;
  }
}
