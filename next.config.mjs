/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    // Sharp loads codec versions dynamically. Next needs the real libheif
    // version to enable AVIF decoding only when the bundled codec is patched.
    "/*": ["./node_modules/@img/sharp-libvips-*/versions.json"],
  },
};

export default nextConfig;
