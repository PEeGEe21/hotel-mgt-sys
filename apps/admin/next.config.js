/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@hotel-os/shared-types'],
  output: 'standalone',
};

module.exports = nextConfig;
