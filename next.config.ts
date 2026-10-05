import type { NextConfig } from "next";
import { getSecurityHeaders, toConfigHeaders } from "./src/lib/security/header-policy";
const config: NextConfig = {output: "standalone", poweredByHeader: false, images: {remotePatterns: [{protocol: "https", hostname: "ui.shadcn.com"},{protocol: "https",hostname: "images.unsplash.com"}], qualities: [60,70,75,80]}, async headers() { return [{source: "/(.*)", headers: [...toConfigHeaders(getSecurityHeaders(process.env.NODE_ENV === "production"))]}]; }};
export default config;
