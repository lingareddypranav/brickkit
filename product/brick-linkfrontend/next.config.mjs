/** @type {import('next').NextConfig} */
const nextConfig = {
  // These files are read by the /ldraw route at runtime as well as served statically.
  outputFileTracingIncludes: {
    "/ldraw/*": ["./public/landing/ldraw/**/*"],
  },
  async redirects() {
    return [
      { source: "/landing", destination: "/landing/index.html", permanent: false },
      { source: "/landing-v2", destination: "/landing-v2/index.html", permanent: false },
      { source: "/welcome", destination: "/landing/index.html", permanent: false },
      { source: "/design-system", destination: "/design-system/index.html", permanent: false },
    ];
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
