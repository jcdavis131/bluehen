import { defineConfig, loadEnv } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

// Same fail-fast rule as core-api (security review SEC-004): a production
// process must never boot with placeholder secrets.
const isProd = process.env.NODE_ENV === "production";
for (const key of ["JWT_SECRET", "COOKIE_SECRET", "DATABASE_URL"]) {
  if (isProd && !process.env[key]) {
    throw new Error(`${key} must be set when NODE_ENV=production`);
  }
}

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      // hub (bhenre.com) + local dev ports; keep in sync with config/fleet.json
      storeCors: process.env.STORE_CORS || "http://localhost:3000,https://bhenre.com",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:9000,https://bhenre.com",
      jwtSecret: process.env.JWT_SECRET || "dev-only-jwt-secret",
      cookieSecret: process.env.COOKIE_SECRET || "dev-only-cookie-secret",
    },
  },
  modules: process.env.STRIPE_API_KEY
    ? [
        {
          resolve: "@medusajs/medusa/payment",
          options: {
            providers: [
              {
                resolve: "@medusajs/payment-stripe",
                id: "stripe",
                options: {
                  apiKey: process.env.STRIPE_API_KEY,
                  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                },
              },
            ],
          },
        },
      ]
    : [],
});
