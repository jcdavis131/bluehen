/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@synthaembed/fleet", "@synthaembed/synth-core", "@synthaembed/ui-fleet"],
};
export default nextConfig;
