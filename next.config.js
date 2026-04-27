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
  // Tambahan: Mengabaikan peringatan saat proses build internal
  devIndicators: {
    buildActivity: false,
  },
};

module.exports = nextConfig; // Gunakan ini jika nama filenya next.config.js
// export default nextConfig; // Gunakan ini jika nama filenya next.config.mjs