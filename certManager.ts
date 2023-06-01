import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { doK8sProvider } from "./cluster";

// Cert-Manager Helm chart
export const certManagerNamespace = new k8s.core.v1.Namespace("cert-manager", {
  metadata: { name: "cert-manager" },
}, { provider: doK8sProvider });

export const certManagerChart = new k8s.helm.v3.Release("cert-manager", {
  chart: "cert-manager",
  namespace: certManagerNamespace.metadata.name,
  repositoryOpts: {
    repo: "https://charts.jetstack.io",
  },
  values: {
    installCRDs: true,
    livenessProbe: {
      enabled: true,
    },
  },
  version: "1.12.1", // Cert-Manager Helm chart version
}, { dependsOn: [certManagerNamespace], provider: doK8sProvider });

// Create a ClusterIssuer for Let's Encrypt
export const letsEncryptClusterIssuer = new k8s.apiextensions.CustomResource(
  "letsencrypt",
  {
    apiVersion: "cert-manager.io/v1",
    kind: "ClusterIssuer",
    metadata: { name: "letsencrypt" },
    spec: {
      acme: {
        server: "https://acme-v02.api.letsencrypt.org/directory",
        email: "admin@adb.sh",
        privateKeySecretRef: {
          name: "letsencrypt-account-key",
        },
        solvers: [
          {
            selector: {
              dnsZones: ["deploy.fish"],
            },
            dns01: {
              digitalocean: {
                tokenSecretRef: {
                  name: "lets-encrypt-do-dns",
                  key: "access-token",
                },
              },
            },
          },
          {
            selector: {},
            http01: {
              ingress: {
                class: "traefik",
              },
            },
          },
        ],
      },
    },
  },
  { dependsOn: certManagerChart, provider: doK8sProvider },
);
