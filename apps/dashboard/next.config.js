/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    // In Docker, use internal service URLs. In dev, use localhost.
    const openclaw = process.env.OPENCLAW_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENCLAW_URL || 'http://localhost:18789';
    const paperclip = process.env.PAPERCLIP_INTERNAL_URL || process.env.NEXT_PUBLIC_PAPERCLIP_URL || 'http://localhost:3100';
    const openfang = process.env.OPENFANG_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENFANG_URL || 'http://localhost:4200';
    return [
      { source: '/api/openclaw/:path*', destination: `${openclaw}/:path*` },
      { source: '/api/paperclip/:path*', destination: `${paperclip}/api/:path*` },
      { source: '/api/openfang/:path*', destination: `${openfang}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
