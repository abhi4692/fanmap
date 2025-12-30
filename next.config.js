/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: false
  },
  pageExtensions: ['js'],
  distDir: '.next',
  webpack(config) {
    config.resolve.modules.push(__dirname + '/src');
    return config;
  }
};

module.exports = nextConfig;
