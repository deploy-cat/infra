import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { doK8sProvider } from "../cluster";
import { deployCatNamespace } from "./system";
import { config } from "../index";

const deploycatWebSecrets = new k8s.core.v1.Secret(
  "deploycat-web-secrets",
  {
    metadata: {
      name: "deploycat-web-secrets",
      namespace: deployCatNamespace.metadata.name,
    },
    type: "Opaque",
    data: {
      "access-token": config.requireSecret("do-access-token"),
      "GITHUB_ID": config.requireSecret("deploycat-github-id"),
      "GITHUB_SECRET": config.requireSecret("deploycat-github-secret"),
      "AUTH_SECRET": config.requireSecret("deploycat-auth-secret"),
    },
  },
  { provider: doK8sProvider },
);

export const letsEncryptClusterIssuer = new k8s.apiextensions.CustomResource(
  "app",
  {
    apiVersion: "serving.knative.dev/v1",
    kind: "Service",
    metadata: {
      name: "app",
      namespace: deployCatNamespace.metadata.name,
    },
    spec: {
      template: {
        spec: {
          containers: [
            {
              image: "ghcr.io/deploy-cat/deploy-cat-web:latest",
              ports: [{ containerPort: 3000 }],
              env: [
                {
                  name: "GITHUB_ID",
                  valueFrom: {
                    secretKeyRef: {
                      name: deploycatWebSecrets.metadata.name,
                      key: "GITHUB_ID",
                    },
                  },
                },
                {
                  name: "GITHUB_SECRET",
                  value: "World",
                  valueFrom: {
                    secretKeyRef: {
                      name: deploycatWebSecrets.metadata.name,
                      key: "GITHUB_SECRET",
                    },
                  },
                },
                {
                  name: "AUTH_SECRET",
                  value: "World",
                  valueFrom: {
                    secretKeyRef: {
                      name: deploycatWebSecrets.metadata.name,
                      key: "AUTH_SECRET",
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    },
  },
  { provider: doK8sProvider },
);
