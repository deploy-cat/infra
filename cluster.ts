import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as digitalocean from "@pulumi/digitalocean";

export const doK8sCluster = new digitalocean.KubernetesCluster(
  "deploy-cat-staging",
  {
    region: digitalocean.Region.AMS3,
    version: "1.27.2-do.0",
    autoUpgrade: true,
    ha: false,
    nodePool: {
      name: "deploy-cat-staging-pool-1",
      autoScale: true,
      minNodes: 1,
      maxNodes: 5,
      size: digitalocean.DropletSlug.DropletS2VCPU4GB,
    },
  },
);

export const doK8sProvider = new k8s.Provider("doK8sProvider", {
  kubeconfig: doK8sCluster.kubeConfigs[0].rawConfig,
  enableServerSideApply: true,
});

doK8sCluster.version.apply((item) => console.log("kubernetes version:", item));
