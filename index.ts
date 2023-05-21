import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import "./knative.ts";

// Traefik Helm chart
const traefikNamespace = new k8s.core.v1.Namespace("traefik", {
  metadata: { name: "traefik" },
});

const traefikChart = new k8s.helm.v3.Chart("traefik", {
  chart: "traefik",
  namespace: traefikNamespace.metadata.name,
  fetchOpts: {
    repo: "https://helm.traefik.io/traefik",
  },
  values: {
    ports: {
      web: { expose: true, redirectTo: "websecure" },
      websecure: { expose: true, tls: { enabled: true } },
      traefik: { expose: true },
    },
    dashboard: {
      enabled: true,
      ingressRoute: true,
    },
  },
  version: "23.0.1", // Traefik Helm chart version
});

// Cert-Manager Helm chart
const certManagerNamespace = new k8s.core.v1.Namespace("cert-manager", {
  metadata: { name: "cert-manager" },
});

const certManagerChart = new k8s.helm.v3.Chart("cert-manager", {
  chart: "cert-manager",
  namespace: certManagerNamespace.metadata.name,
  fetchOpts: {
    repo: "https://charts.jetstack.io",
  },
  values: {
    installCRDs: true,
  },
  version: "1.12.0", // Cert-Manager Helm chart version
});

// Create a ClusterIssuer for Let's Encrypt
const letsEncryptClusterIssuer = new k8s.apiextensions.CustomResource(
  "letsencrypt-clusterissuer",
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
            http01: {
              selector: {},
              ingress: {
                class: "traefik",
              },
            },
          },
        ],
      },
    },
  },
);
