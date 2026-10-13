import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Docker uses the minimal server; local npm start keeps the standard output.
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
};

export default nextConfig;
