import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OpenCV.js is not used at build time; quality checks run client-side

  // Allow portal uploads up to ~15MB raw body (base64 of a 10MB file
  // is ~13.3MB; the bucket's file_size_limit is 10MB).
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },

  async headers() {
    return [
      {
        // Allow the portal to be embedded in trusted test/preview tools
        // (e.g. Twilio's SMS console, ngrok inspector). For production
        // external embedding, prefer a stricter allowlist via CSP.
        source: "/portal/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
