/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { cpus: 1 },
  output: "standalone",
  // Keep titles and other metadata in the initial <head>, including for SEO
  // tools that use a browser user agent but do not execute streamed scripts.
  // This makes the initial response wait for generateMetadata on dynamic pages.
  htmlLimitedBots: /.*/,
  outputFileTracingIncludes: {
    // Sharp loads codec versions dynamically. Next needs the real libheif
    // version to enable AVIF decoding only when the bundled codec is patched.
    "/*": ["./node_modules/@img/sharp-libvips-*/versions.json"],
  },
};

export default nextConfig;
