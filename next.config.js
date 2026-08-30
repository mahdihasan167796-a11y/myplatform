/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empty on purpose — nothing built so far needs custom rewrites, headers,
  // or image remote patterns (product/logo images use plain <img>, not
  // next/image, specifically to avoid needing a remotePatterns allowlist
  // for arbitrary merchant-supplied URLs).
};

module.exports = nextConfig;
