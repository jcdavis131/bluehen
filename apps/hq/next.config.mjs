/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /org renders repo docs (team reports + status board) — bundle them
  // into the serverless build so fs reads work on Vercel.
  outputFileTracingIncludes: {
    "/org": ["../../knowledge/teams/**", "../../docs/STATUS.md"],
  },
  transpilePackages: ["@synthaembed/fleet", "@synthaembed/synth-core", "@synthaembed/ui-fleet"],
};
export default nextConfig;
