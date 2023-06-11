import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { doK8sProvider } from "./cluster";
import { config } from "./index";

const digitaloceanCredentials = new k8s.core.v1.Secret(
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
