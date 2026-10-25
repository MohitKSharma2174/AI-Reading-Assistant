import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/explain-text',
        destination: 'http://localhost:8000/api/explain-text',
      },
      {
        source: '/api/v1/explain-text',
        destination: 'http://localhost:8000/api/v1/explain-text',
      },
      {
        source: '/api/explain',
        destination: 'http://localhost:8000/api/explain',
      },
      {
        source: '/api/vocabulary',
        destination: 'http://localhost:8000/api/vocabulary',
      },
      {
        source: '/api/vocabulary/:path*',
        destination: 'http://localhost:8000/api/vocabulary/:path*',
      },
      {
        source: '/api/v1/vocabulary',
        destination: 'http://localhost:8000/api/v1/vocabulary',
      },
      {
        source: '/api/v1/vocabulary/:path*',
        destination: 'http://localhost:8000/api/v1/vocabulary/:path*',
      },
    ];
  },
};


export default nextConfig;
