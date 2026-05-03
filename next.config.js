/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable if deploying to Vercel or similar
  // output: 'standalone',
  
  experimental: {
    // Server Actions are stable in Next.js 14
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
