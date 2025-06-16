/** @type {import('next').NextConfig} */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Enable experimental features if needed
  experimental: {
    serverActions: {},
  },

  // Configure for file uploads
  serverRuntimeConfig: {
    // Will only be available on the server side
    maxUploadSize: "500mb",
  },

  // Public runtime config
  publicRuntimeConfig: {
    // Will be available on both server and client
    maxUploadSize: "500mb",
  },

  // Add headers for CORS if needed
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },

  // Configure webpack for any additional requirements
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add any custom webpack configuration here if needed
    return config;
  },
};

export default nextConfig;
