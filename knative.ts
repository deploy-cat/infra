import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

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
    data: { "ingress-class": "kourier.ingress.networking.knative.dev" },
  },
  { dependsOn: [knativeServingCore, kourier] },
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
