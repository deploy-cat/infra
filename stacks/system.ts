import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { doK8sProvider } from "../cluster";

export const deployCatNamespace = new k8s.core.v1.Namespace(
  "deploycat-system",
  {
    metadata: { name: "deploycat-system" },
  },
  { provider: doK8sProvider },
);
