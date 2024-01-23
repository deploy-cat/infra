import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { DeployCatInstance } from "./deploycat/DeployCatInstance";
import * as digitalocean from "@pulumi/digitalocean";
import { Cluster } from "./k3se/Cluster";

export const stack = pulumi.getStack();
export const config = new pulumi.Config();

const hostname = config.require("knative-domain");

// deploy k8s cluster on digital ocean
export const hetzner01 = new Cluster("hetzner-01", {
  configPath: `./${stack}.yml`,
});

const kubeconfig = hetzner01.kubeconfig;
export const doK8sProvider = new k8s.Provider("doK8sProvider", { kubeconfig });
export const doK8sProviderWithSSA = new k8s.Provider("doK8sProviderWithSSA", {
  kubeconfig,
  enableServerSideApply: true,
});

// deploy deploycat on cluster
const deploycat = new DeployCatInstance(
  "hetzner01",
  {
    namespace: "deploycat-system",
    hostname: hostname,
    letsEncrypt: {
      solvers: [
        {
          name: "do",
          opts: {
            accessToken: config.requireSecret("do-access-token"),
          },
        },
      ],
    },
  },
  { provider: doK8sProvider, parent: hetzner01 }
);

// set dns records
// export const domain = new digitalocean.Domain(
//   "default",
//   {
//     name: hostname,
//     ipAddress: deploycat.knative.kourierLoadBalancerIP,
//   },
//   { dependsOn: [deploycat.knative] }
// );

// export const wildcardRecord = new digitalocean.DnsRecord(
//   "wildcard",
//   {
//     domain: domain.id,
//     type: "A",
//     name: "*",
//     value: deploycat.knative.kourierLoadBalancerIP.apply((item) => item),
//   },
//   { dependsOn: [domain] }
// );
