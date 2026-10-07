/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { cpus: 1 },
  // Isolate local prototypes from an already-running optimized preview.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: "standalone",
  async headers() {
    return [{ source: '/admin/:path*', headers: [
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'` },
    ] }];
  },
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
