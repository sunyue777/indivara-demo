/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow the WebView to be embedded in iframes from Indivara/Avantrade
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Allow iframe embedding from any origin (loosen to specific domains in production)
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
          // Note: remove the default X-Frame-Options header
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
