import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { doK8sProvider } from "./cluster";

// Traefik Helm chart
const traefikNamespace = new k8s.core.v1.Namespace("traefik", {
  metadata: { name: "traefik" },
}, { provider: doK8sProvider });

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
}, { provider: doK8sProvider });
