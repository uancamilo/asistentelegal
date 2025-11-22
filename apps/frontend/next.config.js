/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security Headers - Applied in all environments
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: (() => {
              // Get API base URL (remove /api if present for connect-src)
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
              const baseApiUrl = apiUrl.replace(/\/api\/?$/, '');
              const isDev = process.env.NODE_ENV === 'development';

              // Next.js requires unsafe-inline for styles and unsafe-eval for scripts in production
              // This is due to how Next.js injects styles and handles hydration
              const scriptSrc = "script-src 'self' 'unsafe-eval' 'unsafe-inline'";
              const styleSrc = "style-src 'self' 'unsafe-inline'";

              return [
                "default-src 'self'",
                scriptSrc,
                styleSrc,
                "img-src 'self' data: https:",
                "font-src 'self' data:",
                `connect-src 'self' ${baseApiUrl}`,
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'"
              ].join('; ');
            })()
          }
        ],
      },
    ];
  },

  // API Rewrites - Proxy all /api requests to backend
  // This avoids cross-origin cookie issues by making all requests same-origin
  async rewrites() {
    // In development, use BACKEND_URL or localhost
    // In production, use NEXT_PUBLIC_API_URL (without /api suffix)
    const backendUrl = process.env.NODE_ENV === 'development'
      ? (process.env.BACKEND_URL || 'http://localhost:8080')
      : (process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'https://asistentelegal.onrender.com');

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
