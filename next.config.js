/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mengabaikan error TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },
  // Mengabaikan error ESLint (Warning yang jadi error)
  eslint: {
    ignoreDuringBuilds: true,
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        cardinal: false,
      };
    }
    return config;
  },

  // Mengabaikan peringatan saat proses build internal
  devIndicators: {
    buildActivity: false,
  },
};

module.exports = nextConfig; 