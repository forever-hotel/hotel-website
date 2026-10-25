import type { NextConfig } from 'next';
import { getRoomImageHosts } from './src/config/room-images';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: getRoomImageHosts().map((hostname) => ({
      protocol: 'https',
      hostname,
      pathname: '/**',
    })),
  },
  // Docker uses the minimal server; local npm start keeps the standard output.
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
};

export default nextConfig;
