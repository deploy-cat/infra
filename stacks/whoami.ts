import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { doK8sProvider } from "../cluster";
import { deployCatNamespace } from "./system";

export const letsEncryptClusterIssuer = new k8s.apiextensions.CustomResource(
  "whoami",
  {
    apiVersion: "serving.knative.dev/v1",
    kind: "Service",
    metadata: {
      name: "whoami",
      namespace: deployCatNamespace.metadata.name,
    },
    spec: {
      containers: [
        { image: "traefik/whoami" },
      ],
    },
  },
  { provider: doK8sProvider },
);
