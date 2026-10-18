/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      { source: "/landing", destination: "/landing/index.html", permanent: false },
      { source: "/welcome", destination: "/landing/index.html", permanent: false },
      { source: "/design-system", destination: "/design-system/index.html", permanent: false },
    ];
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
