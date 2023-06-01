import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { letsEncryptClusterIssuer } from "./certManager";
import { doK8sProvider, doK8sProviderWithSSA } from "./cluster";

// Deploy Knative Serving component
// const knativeServingCRDs = new k8s.yaml.ConfigFile("knative-serving-crds", {
//   file:
//     "https://github.com/knative/serving/releases/download/knative-v1.10.1/serving-crds.yaml",
// }, {});
export const knativeServingCore = new k8s.yaml.ConfigFile(
  "knative-serving-core",
  {
    file:
      "https://github.com/knative/serving/releases/download/knative-v1.10.1/serving-core.yaml",
  },
  {
    dependsOn: [],
    provider: doK8sProvider,
  },
);
export const knativeCertmanager = new k8s.yaml.ConfigFile(
  "knative-net-certmanager",
  {
    file:
      "https://github.com/knative/net-certmanager/releases/download/knative-v1.10.0/release.yaml",
  },
  {
    dependsOn: [knativeServingCore, letsEncryptClusterIssuer],
    provider: doK8sProvider,
  },
);

// Deploy Kourier as the ingress for Knative
export const kourier = new k8s.yaml.ConfigFile(
  "kourier",
  {
    file:
      "https://github.com/knative/net-kourier/releases/download/knative-v1.10.0/kourier.yaml",
  },
  { dependsOn: [knativeServingCore], provider: doK8sProvider },
);

//configs

export const networkConfigMap = knativeServingCore.getResource(
  "v1/ConfigMap",
  "knative-serving",
  "config-network",
);

export const networkConfigMapPatch = new k8s.core.v1.ConfigMapPatch(
  "config-network-patch",
  {
    metadata: {
      name: networkConfigMap.metadata.name,
      namespace: networkConfigMap.metadata.namespace,
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
  { dependsOn: [knativeServingCore], provider: doK8sProviderWithSSA },
);

export const domainConfigMap = knativeServingCore.getResource(
  "v1/ConfigMap",
  "knative-serving",
  "config-domain",
);

export const domainConfigMapPatch = new k8s.core.v1.ConfigMapPatch(
  "config-domain-patch",
  {
    metadata: {
      name: domainConfigMap.metadata.name,
      namespace: domainConfigMap.metadata.namespace,
    },
    data: {
      "deploy.fish": "",
    },
  },
  { dependsOn: [knativeServingCore], provider: doK8sProviderWithSSA },
);

export const certManagerConfigMap = knativeCertmanager.getResource(
  "v1/ConfigMap",
  "knative-serving",
  "config-certmanager",
);

export const certManagerConfigMapPatch = new k8s.core.v1.ConfigMapPatch(
  "config-certmanager-patch",
  {
    metadata: {
      name: certManagerConfigMap.metadata.name,
      namespace: certManagerConfigMap.metadata.namespace,
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
  {
    dependsOn: [knativeCertmanager, letsEncryptClusterIssuer],
    provider: doK8sProviderWithSSA,
  },
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
