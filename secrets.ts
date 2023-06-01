import * as pulumi from "@pulumi/pulumi";
import * as kubernetes from "@pulumi/kubernetes";
import { doK8sProvider } from "./cluster";

const config = new pulumi.Config();

const digitaloceanCredentials = new kubernetes.core.v1.Secret(
  "lets-encrypt-do-dns",
  {
    metadata: {
      name: "lets-encrypt-do-dns",
      namespace: "cert-manager",
    },
    type: "Opaque",
    stringData: {
      "access-token": config.requireSecret("do-access-token"),
    },
  },
  { provider: doK8sProvider },
);
