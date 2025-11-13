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

              // SECURITY FIX (P2.6): Environment-specific CSP
              // Development: Allow unsafe-eval and unsafe-inline for HMR and Fast Refresh
              // Production: Strict CSP without unsafe directives (XSS protection)
              const scriptSrc = isDev
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
                : "script-src 'self'";

              const styleSrc = isDev
                ? "style-src 'self' 'unsafe-inline'"
                : "style-src 'self'";

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

  // API Rewrites - Only in development
  async rewrites() {
    // Only use rewrites in development
    if (process.env.NODE_ENV === 'development') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      // Remove trailing /api if present to avoid duplication
      const baseUrl = apiUrl.replace(/\/api\/?$/, '');

      return [
        {
          source: '/api/:path*',
          destination: `${baseUrl}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
