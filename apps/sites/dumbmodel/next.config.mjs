/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@synthaembed/synth-core", "@synthaembed/ui-fleet", "@synthaembed/fleet", "@synthaembed/eval-public"],
};
export default nextConfig;
