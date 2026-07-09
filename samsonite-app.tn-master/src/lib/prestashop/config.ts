export interface PrestashopConfig {
  apiUrl: string;
  apiKey: string;
}

const sanitizeApiUrl = (url: string): string => {
  return url.trim().replace(/\/+$/, "").replace(/\/api$/i, "");
};

const readEnvConfig = (): PrestashopConfig => {
  const env = import.meta.env as Record<string, string | undefined>;
  const apiUrl = env.VITE_PS_API_URL || env.NEXT_PUBLIC_PS_API_URL || "";
  const apiKey = env.VITE_PS_API_KEY || env.NEXT_PUBLIC_PS_API_KEY || "";

  return {
    apiUrl: sanitizeApiUrl(apiUrl),
    apiKey: apiKey.trim(),
  };
};

export const getPrestashopConfig = (): PrestashopConfig => {
  return readEnvConfig();
};

export const isPrestashopConfigured = () => {
  const { apiUrl, apiKey } = getPrestashopConfig();
  return Boolean(apiUrl && apiKey);
};
