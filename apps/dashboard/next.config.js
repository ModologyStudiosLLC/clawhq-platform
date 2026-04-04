/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'workoscdn.com' },
      { protocol: 'https', hostname: '*.workoscdn.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async rewrites() {
    // In Docker, use internal service URLs. In dev, use localhost.
    const openclaw = process.env.OPENCLAW_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENCLAW_URL || 'http://localhost:18789';
    const paperclip = process.env.PAPERCLIP_INTERNAL_URL || process.env.NEXT_PUBLIC_PAPERCLIP_URL || 'http://localhost:3100';
    const openfang = process.env.OPENFANG_INTERNAL_URL || process.env.NEXT_PUBLIC_OPENFANG_URL || 'http://localhost:4200';
    const hermes = process.env.HERMES_INTERNAL_URL || process.env.NEXT_PUBLIC_HERMES_URL || 'http://localhost:4300';
    return [
      { source: '/api/openclaw/:path*', destination: `${openclaw}/:path*` },
      { source: '/api/paperclip/:path*', destination: `${paperclip}/api/:path*` },
      { source: '/api/openfang/:path*', destination: `${openfang}/api/:path*` },
      { source: '/api/hermes/:path*', destination: `${hermes}/:path*` },
    ];
  },
};

module.exports = nextConfig;
