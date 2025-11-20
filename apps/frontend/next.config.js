/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow dev access from local network IPs (for HMR and development)
  // NOTE: allowedDevOrigins doesn't support wildcards, so we generate IPs for common subnet
  // This generates all IPs in the 192.168.0.x and 192.168.1.x ranges
  allowedDevOrigins: process.env.NODE_ENV === 'development'
    ? [
        // Localhost
        'localhost',
        '127.0.0.1',
        // Generate 192.168.0.0-255 (subnet 0)
        ...Array.from({ length: 256 }, (_, i) => `192.168.0.${i}`),
        // Generate 192.168.1.0-255 (subnet 1)
        ...Array.from({ length: 256 }, (_, i) => `192.168.1.${i}`),
        // Add more subnets if needed (uncomment the ones you use)
        // ...Array.from({ length: 256 }, (_, i) => `192.168.2.${i}`),
        // ...Array.from({ length: 256 }, (_, i) => `10.0.0.${i}`),
      ]
    : [],

  // Security Headers - Applied in all environments
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
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

              const styleSrc = isDev ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'";

              // In development, allow connections from local network for HMR
              // CSP doesn't support wildcards in the middle of IPs, so we:
              // 1. Allow ws: and http: for localhost in dev
              // 2. In production, CSP will be strict with only self and API URL
              const connectSrc = isDev
                ? `connect-src 'self' ${baseApiUrl} ws: http:`
                : `connect-src 'self' ${baseApiUrl}`;

              return [
                "default-src 'self'",
                scriptSrc,
                styleSrc,
                "img-src 'self' data: https:",
                "font-src 'self' data:",
                connectSrc,
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
              ].join('; ');
            })(),
          },
        ],
      },
    ];
  },

  // API Rewrites - Only in development
  async rewrites() {
    // Only use rewrites in development
    if (process.env.NODE_ENV === 'development') {
      // Use BACKEND_URL env var or default to localhost
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';

      return [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
