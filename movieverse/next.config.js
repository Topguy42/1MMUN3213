/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/tv',
  assetPrefix: '/tv',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
  },
};

module.exports = nextConfig;
