import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { doK8sProvider } from "../cluster";
import { deployCatNamespace } from "./system";

export const whoami = new k8s.apiextensions.CustomResource(
  "whoami",
  {
    apiVersion: "serving.knative.dev/v1",
    kind: "Service",
    metadata: {
      name: "whoami",
      namespace: deployCatNamespace.metadata.name,
    },
    spec: {
      template: {
        spec: {
          containers: [
            {
              image: "traefik/whoami",
              ports: [{ containerPort: 80 }],
            },
          ],
        },
      },
    },
  },
  { provider: doK8sProvider },
);
