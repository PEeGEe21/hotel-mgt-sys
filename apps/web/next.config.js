/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@hotel-os/shared-types', '@hotel-os/ui'],
  images: {
    domains: ['localhost'],
  },
};

module.exports = nextConfig;
