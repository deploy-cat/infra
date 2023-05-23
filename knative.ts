import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { letsEncryptClusterIssuer } from "./certManager";

export const knativeNamespace = new k8s.core.v1.Namespace("knative-serving", {
  metadata: {
    name: "knative-serving",
  },
});
export const kourierNamespace = new k8s.core.v1.Namespace("kourier-system", {
  metadata: {
    name: "kourier-system",
  },
});

// Deploy Knative Serving component
// const knativeServingCRDs = new k8s.yaml.ConfigFile("knative-serving-crds", {
//   file:
//     "https://github.com/knative/serving/releases/download/knative-v1.10.1/serving-crds.yaml",
// }, { dependsOn: knativeNamespace });
export const knativeServingCore = new k8s.yaml.ConfigFile(
  "knative-serving-core",
  {
    file:
      "https://github.com/knative/serving/releases/download/knative-v1.10.1/serving-core.yaml",
  },
  {
    dependsOn: [knativeNamespace /* knativeServingCRDs */],
  },
);
export const knativeCertmanager = new k8s.yaml.ConfigFile(
  "knative-net-certmanager",
  {
    file:
      "https://github.com/knative/net-certmanager/releases/download/knative-v1.10.0/release.yaml",
  },
  {
    dependsOn: [knativeNamespace, knativeServingCore],
  },
);

// Deploy Kourier as the ingress for Knative
export const kourier = new k8s.yaml.ConfigFile(
  "kourier",
  {
    file:
      "https://github.com/knative/net-kourier/releases/download/knative-v1.10.0/kourier.yaml",
  },
  { dependsOn: [kourierNamespace, knativeServingCore] },
);

export const networkConfigMap = new k8s.core.v1.ConfigMap(
  "config-network",
  {
    metadata: {
      name: "config-network",
      namespace: knativeNamespace.metadata.name,
    },
    data: {
      "ingress-class": "kourier.ingress.networking.knative.dev",
      "auto-tls": "Enabled",
      "http-protocol": "Redirected",
      "namespace-wildcard-cert-selector": JSON.stringify({
        matchExpressions: [{
          key: "networking.knative.dev/disableWildcardCert",
          operator: "NotIn",
          values: [true],
        }],
      }),
    },
  },
  { dependsOn: [knativeServingCore, kourier] },
);

export const certManagerConfigMap = new k8s.core.v1.ConfigMap(
  "config-certmanager",
  {
    metadata: {
      name: "config-certmanager",
      namespace: knativeNamespace.metadata.name,
      labels: {
        "networking.knative.dev/certificate-provider": "cert-manager",
      },
    },
    data: {
      issuerRef: Object.entries({
        kind: "ClusterIssuer",
        name: "letsencrypt",
      })
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n"),
    },
  },
  { dependsOn: [letsEncryptClusterIssuer, knativeCertmanager] },
);

export const domainConfigMap = new k8s.core.v1.ConfigMap(
  "config-domain",
  {
    metadata: {
      name: "config-domain",
      namespace: knativeNamespace.metadata.name,
    },
    data: {
      "deploy.fish": "",
    },
  },
  { dependsOn: [knativeServingCore, kourier] },
);

// Export the Kourier LoadBalancer service
export const kourierService = kourier.getResource(
  "v1/Service",
  "kourier-system",
  "kourier",
);
export const kourierServiceName = kourierService.metadata.name;
export const kourierLoadBalancerIP =
  kourierService.status.loadBalancer.ingress[0].ip;
