#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import Stripe from "stripe";

const CATALOG_VERSION = "2026-06-15.tiers-personal-pro-promax";
const CURRENCY = "usd";
const PORTAL_METADATA_PURPOSE = "commercial_subscription_updates";

// Maps a plan to the deployed secret name that should carry its monthly price ID.
// The new commercial tiers use suffix-less env names (matching the deployed
// sandbox secrets); any other plan falls back to the legacy `*_MONTHLY` form.
const PLAN_ENV_OVERRIDES = Object.freeze({
  personal: "STRIPE_PRICE_PERSONAL",
  pro: "STRIPE_PRICE_PRO",
  pro_max: "STRIPE_PRICE_PRO_MAX",
});

const PRODUCTS = Object.freeze([
  {
    plan: "personal",
    name: "ZAKI Personal",
    description: "Personal tier — individual access to ZAKI with the personal weekly allowance.",
    monthlyUnitAmount: 1500,
    lookupKey: "zaki_personal_monthly_2026_06",
  },
  {
    plan: "pro",
    name: "ZAKI Pro",
    description: "Pro tier — higher weekly allowance and full product access for power users.",
    monthlyUnitAmount: 4500,
    lookupKey: "zaki_pro_monthly_2026_06",
  },
  {
    plan: "pro_max",
    name: "ZAKI Pro Max",
    description: "Pro Max tier — the highest weekly allowance for the heaviest ZAKI workloads.",
    monthlyUnitAmount: 9900,
    lookupKey: "zaki_pro_max_monthly_2026_06",
  },
]);

function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "backend", ".env"),
    path.resolve(process.cwd(), "..", ".env"),
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "backend", ".env.local"),
    path.resolve(process.cwd(), "..", ".env.local"),
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: envPath.endsWith(".env.local") });
    }
  }
}

function requireStripeSecretKey() {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is required.");
  }
  if (!key.startsWith("sk_live_") && !key.startsWith("rk_live_")) {
    throw new Error("Commercial catalog setup requires a live Stripe secret or restricted key.");
  }
  return key;
}

function matchesProduct(product, plan) {
  return (
    product?.active === true &&
    product?.metadata?.zaki_catalog === CATALOG_VERSION &&
    product?.metadata?.zaki_plan === plan
  );
}

async function findOrCreateProduct(stripe, spec) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const existing = products.data.find((product) => matchesProduct(product, spec.plan));
  if (existing) {
    return { product: existing, created: false };
  }

  const product = await stripe.products.create({
    name: spec.name,
    description: spec.description,
    metadata: {
      zaki_catalog: CATALOG_VERSION,
      zaki_plan: spec.plan,
      zaki_product: spec.plan,
    },
  });
  return { product, created: true };
}

async function findOrCreateMonthlyPrice(stripe, spec, productId) {
  const byLookupKey = await stripe.prices.list({
    active: true,
    lookup_keys: [spec.lookupKey],
    limit: 10,
  });
  const existing = byLookupKey.data[0] || null;
  if (existing) {
    if (
      existing.unit_amount !== spec.monthlyUnitAmount ||
      existing.currency !== CURRENCY ||
      existing.recurring?.interval !== "month" ||
      existing.product !== productId
    ) {
      throw new Error(
        `Existing Stripe price lookup_key=${spec.lookupKey} does not match expected plan, amount, currency, interval, or product.`
      );
    }
    return { price: existing, created: false };
  }

  const price = await stripe.prices.create({
    product: productId,
    currency: CURRENCY,
    unit_amount: spec.monthlyUnitAmount,
    recurring: {
      interval: "month",
    },
    lookup_key: spec.lookupKey,
    metadata: {
      zaki_catalog: CATALOG_VERSION,
      zaki_plan: spec.plan,
      zaki_interval: "monthly",
    },
  });
  return { price, created: true };
}

function buildCommercialPortalConfigurationPayload({ products, appUrl }) {
  const normalizedProducts = products.map((item) => ({
    product: item.productId,
    prices: [item.priceId],
  }));
  return {
    active: true,
    default_return_url: `${String(appUrl || "https://app.chatzaki.com").replace(/\/+$/, "")}/pricing?billing=manage`,
    business_profile: {
      headline: "Manage your ZAKI subscription",
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["email", "name"],
      },
      invoice_history: {
        enabled: true,
      },
      payment_method_update: {
        enabled: true,
      },
      subscription_cancel: {
        enabled: false,
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "create_prorations",
        products: normalizedProducts,
      },
    },
    metadata: {
      zaki_catalog: CATALOG_VERSION,
      zaki_purpose: PORTAL_METADATA_PURPOSE,
    },
  };
}

async function findOrCreatePortalConfiguration(stripe, products) {
  const payload = buildCommercialPortalConfigurationPayload({
    products,
    appUrl: process.env.ZAKI_APP_URL || "https://app.chatzaki.com",
  });
  const configurations = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100,
  });
  const existing = configurations.data.find(
    (configuration) =>
      configuration?.metadata?.zaki_catalog === CATALOG_VERSION &&
      configuration?.metadata?.zaki_purpose === PORTAL_METADATA_PURPOSE
  );
  if (existing) {
    const configuration = await stripe.billingPortal.configurations.update(existing.id, payload);
    return { configuration, created: false };
  }
  const configuration = await stripe.billingPortal.configurations.create(payload);
  return { configuration, created: true };
}

function envNameForPlan(plan) {
  return (
    PLAN_ENV_OVERRIDES[plan] || `STRIPE_PRICE_${plan.toUpperCase()}_MONTHLY`
  );
}

async function main() {
  loadEnv();
  const stripe = new Stripe(requireStripeSecretKey(), { apiVersion: "2024-06-20" });
  const account = await stripe.accounts.retrieve();
  const results = [];

  for (const spec of PRODUCTS) {
    const { product, created: productCreated } = await findOrCreateProduct(stripe, spec);
    const { price, created: priceCreated } = await findOrCreateMonthlyPrice(
      stripe,
      spec,
      product.id
    );
    results.push({
      plan: spec.plan,
      env: envNameForPlan(spec.plan),
      productId: product.id,
      productName: product.name,
      productCreated,
      priceId: price.id,
      priceCreated,
      unitAmount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval || null,
      livemode: price.livemode,
    });
  }
  const { configuration, created: portalConfigurationCreated } =
    await findOrCreatePortalConfiguration(stripe, results);

  console.log(
    JSON.stringify(
      {
        ok: true,
        accountId: account.id,
        catalogVersion: CATALOG_VERSION,
        results,
        portalConfiguration: {
          id: configuration.id,
          created: portalConfigurationCreated,
          livemode: configuration.livemode,
        },
        envSnippet: {
          ...Object.fromEntries(results.map((item) => [item.env, item.priceId])),
          STRIPE_BILLING_PORTAL_CONFIGURATION: configuration.id,
        },
      },
      null,
      2
    )
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error?.message || "Commercial Stripe catalog setup failed.",
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  });
}

export {
  CATALOG_VERSION,
  PRODUCTS,
  envNameForPlan,
  buildCommercialPortalConfigurationPayload,
  findOrCreatePortalConfiguration,
};
