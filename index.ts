import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { DeploycatInstance } from "./deploycat/DeployCatInstance.ts";
import * as digitalocean from "@pulumi/digitalocean";

export const config = new pulumi.Config();

const hostname = config.require("knative-domain");

// deploy k8s cluster on digital ocean
export const doK8sCluster = new digitalocean.KubernetesCluster(
  "deploy-cat-staging",
  {
    region: digitalocean.Region.AMS3,
    version: "1.28.2-do.0",
    autoUpgrade: true,
    ha: false,
    nodePool: {
      name: "deploy-cat-staging-pool-1",
      autoScale: true,
      minNodes: 1,
      maxNodes: 5,
      size: digitalocean.DropletSlug.DropletS2VCPU4GB,
    },
  }
);

const kubeconfig = doK8sCluster.kubeConfigs[0].rawConfig;
export const doK8sProvider = new k8s.Provider("doK8sProvider", { kubeconfig });
export const doK8sProviderWithSSA = new k8s.Provider("doK8sProviderWithSSA", {
  kubeconfig,
  enableServerSideApply: true,
});

// deploy deploycat on cluster
const deploycat = new DeploycatInstance(
  "do1",
  {
    namespace: "deploycat-system",
    hostname: hostname,
    letsEncrypt: {
      solvers: [
        {
          name: "do",
          accessToken: config.requireSecret("do-access-token"),
        },
      ],
    },
  },
  { provider: doK8sProviderWithSSA }
);

const deploycatIP = deploycat.knative.kourierLoadBalancerIP.apply(
  (item) => item
);

// set dns records
export const domain = new digitalocean.Domain("default", {
  name: hostname,
  ipAddress: deploycatIP,
});

export const wildcardRecord = new digitalocean.DnsRecord("wildcard", {
  domain: domain.id,
  type: "A",
  name: "*",
  value: deploycatIP,
});
