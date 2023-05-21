import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const kourierNamespace = new k8s.core.v1.Namespace("kourier-system", {});
const servingNamespace = new k8s.core.v1.Namespace("knative-serving", {});

// Deploy Knative Serving component
// const knativeServingCRDs = new k8s.yaml.ConfigFile("knative-serving-crds", {
//   file: "https://github.com/knative/serving/releases/download/knative-v1.10.1/serving-crds.yaml",
// });
const knativeServingCore = new k8s.yaml.ConfigFile("knative-serving-core", {
  file: "https://github.com/knative/serving/releases/download/knative-v1.10.1/serving-core.yaml",
});

// Deploy Kourier as the ingress for Knative
const kourier = new k8s.yaml.ConfigFile("kourier", {
  file: "https://github.com/knative/net-kourier/releases/download/knative-v1.10.0/kourier.yaml",
});

// Export the Kourier LoadBalancer service
const kourierService = kourier.getResource(
  "v1/Service",
  "kourier-system",
  "kourier"
);
export const kourierServiceName = kourierService.metadata.name;
export const kourierLoadBalancerIP =
  kourierService.status.loadBalancer.ingress[0].ip;
