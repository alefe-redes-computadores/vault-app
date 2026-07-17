/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // ← DESCOMENTADO
  images: { unoptimized: true },
  reactStrictMode: true,
};

module.exports = nextConfig;