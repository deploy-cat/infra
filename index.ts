import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { DeployCatInstance } from "./deploycat/DeployCatInstance";
import { Cluster } from "./k3se/Cluster";
import { Longhorn } from "./longhorn";

export const stack = pulumi.getStack();
export const config = new pulumi.Config();

const hostname = config.require("knative-domain");

// deploy k3s cluster on hetzner
export const hetzner01 = new Cluster("hetzner-01", {
  configPath: `./${stack}.yml`,
});

const kubeconfig = hetzner01.kubeconfig;
export const provider = new k8s.Provider("doK8sProvider", { kubeconfig });
// export const doK8sProviderWithSSA = new k8s.Provider("doK8sProviderWithSSA", {
//   kubeconfig,
//   enableServerSideApply: true,
// });

const longhorn = new Longhorn("longhorn", {}, { provider });

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
    oAuth: {
      secret: config.requireSecret("deploycat-auth-secret"),
      apps: {
        github: {
          id: config.requireSecret("deploycat-github-id"),
          secret: config.requireSecret("deploycat-github-secret"),
        },
      },
    },
    persistance: {
      storageClass: "longhorn",
    },
    database: {
      name: "deploycat",
      user: "deploycat",
      password: "deploycat",
    },
  },
  { provider, parent: hetzner01, dependsOn: [longhorn] }
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
