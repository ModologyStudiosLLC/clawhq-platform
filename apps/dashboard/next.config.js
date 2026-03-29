/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const paperclip = process.env.NEXT_PUBLIC_PAPERCLIP_URL || 'http://localhost:3100';
    const openfang = process.env.NEXT_PUBLIC_OPENFANG_URL || 'http://localhost:4200';
    return [
      {
        source: '/api/paperclip/:path*',
        destination: `${paperclip}/api/:path*`,
      },
      {
        source: '/api/openfang/:path*',
        destination: `${openfang}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
