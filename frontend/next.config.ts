import type { NextConfig } from "next";

const getBackendBase = () => {
  const envUrl = process.env.BACKEND_URL || 
                 process.env.NEXT_PUBLIC_API_URL || 
                 process.env.API_URL || 
                 process.env.FASTAPI_URL || 
                 process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      return parsed.origin;
    } catch {
      return envUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '').replace(/\/+$/, '');
    }
  }
  return 'http://127.0.0.1:8000';
};

const BACKEND_URL = getBackendBase();

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/explain-text',
        destination: `${BACKEND_URL}/api/explain-text`,
      },
      {
        source: '/api/v1/explain-text',
        destination: `${BACKEND_URL}/api/v1/explain-text`,
      },
      {
        source: '/api/explain',
        destination: `${BACKEND_URL}/api/explain`,
      },
      {
        source: '/api/vocabulary',
        destination: `${BACKEND_URL}/api/vocabulary`,
      },
      {
        source: '/api/vocabulary/:path*',
        destination: `${BACKEND_URL}/api/vocabulary/:path*`,
      },
      {
        source: '/api/v1/vocabulary',
        destination: `${BACKEND_URL}/api/v1/vocabulary`,
      },
      {
        source: '/api/v1/vocabulary/:path*',
        destination: `${BACKEND_URL}/api/v1/vocabulary/:path*`,
      },
    ];
  },
};


export default nextConfig;
