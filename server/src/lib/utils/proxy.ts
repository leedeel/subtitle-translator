// Proxy utilities for HTTP requests using undici

let proxyAgent: any = null;
let proxyUrl: string | null = null;

export const initProxyAgents = (): void => {
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;

  proxyUrl = httpsProxy || httpProxy;

  if (proxyUrl) {
    console.log(`Using proxy: ${proxyUrl}`);
  }
};

export const getProxyAgent = (): any => {
  return proxyAgent;
};

export const getProxyUrl = (): string | null => {
  return proxyUrl;
};