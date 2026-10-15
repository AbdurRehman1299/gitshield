/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained build for a small production Docker image.
  output: "standalone",
  // Keep Prisma out of the bundler so its native engine is loaded at runtime.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
