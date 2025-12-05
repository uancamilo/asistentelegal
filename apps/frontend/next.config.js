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

              // Next.js requires unsafe-inline for styles and unsafe-eval for scripts in production
              // This is due to how Next.js injects styles and handles hydration
              // Hotjar requires its domain in script-src to load external scripts
              const scriptSrc = isDev
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://static.hotjar.com https://*.hotjar.com";
              const styleSrc = "style-src 'self' 'unsafe-inline'";
              // Hotjar domains for analytics (only in production)
              const hotjarDomains = 'https://static.hotjar.com https://*.hotjar.com wss://*.hotjar.com';
              const connectSrc = isDev
                ? "connect-src 'self' ws: wss: " + baseApiUrl
                : "connect-src 'self' " + baseApiUrl + " " + hotjarDomains;

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

  // Experimental features for handling long-running requests
  experimental: {
    // Increase proxy timeout for long operations like document ingestion
    // Default is ~30 seconds, we extend to 2 minutes for PDF processing + OpenAI analysis
    proxyTimeout: 120000, // 120 seconds = 2 minutes
  },

  // Server configuration for handling long-running API requests
  serverExternalPackages: [],

  // HTTP agent options for proxy requests
  httpAgentOptions: {
    keepAlive: true,
  },
};

module.exports = nextConfig;
