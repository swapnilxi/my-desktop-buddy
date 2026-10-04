import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Electron loads the production UI from `file://.../frontend/out/index.html`.
  // Without a static export that file is never produced, so any launch that is
  // not ELECTRON_DEV=true opened a completely blank window.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
