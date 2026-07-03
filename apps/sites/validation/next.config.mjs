export default {
  reactStrictMode: true,
  // /scorecards renders repo docs from content/fleet/bd/scorecards — bundle
  // them into the serverless build so fs reads work on Vercel (same pattern
  // as apps/hq for /org).
  outputFileTracingIncludes: {
    "/scorecards": ["../../../content/fleet/bd/scorecards/**"],
    "/scorecards/[slug]": ["../../../content/fleet/bd/scorecards/**"],
  },
  transpilePackages: ["@synthaembed/ui-fleet", "@synthaembed/fleet", "@synthaembed/eval-public"],
};
