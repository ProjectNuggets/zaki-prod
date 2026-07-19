#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import Stripe from "stripe";
import dotenv from "dotenv";

function loadEnvFiles() {
  const cwd = process.cwd();
  const root = path.resolve(cwd, "..");
  const candidates = [
    path.join(root, ".env"),
    path.join(cwd, ".env"),
    path.join(root, ".env.local"),
    path.join(cwd, ".env.local"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    dotenv.config({ path: file, override: file.endsWith(".local") });
  }
}

function requireLiveStripeKey() {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is required.");
  if (!/^sk_live_/.test(key) && !/^rk_live_/.test(key)) {
    throw new Error("Refusing to run with a non-live Stripe key.");
  }
  return key;
}

function requiredPrice(name, env = process.env) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function requiredConfig(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function configuredPrice(name, env = process.env) {
  return String(env[name] || "").trim();
}

export function buildCommercialSmokePlans(env = process.env) {
  const monthlyPlans = [
    {
      plan: "personal",
      interval: "monthly",
      price: requiredPrice("STRIPE_PRICE_PERSONAL", env),
      expectedAmount: 1500,
    },
    {
      plan: "pro",
      interval: "monthly",
      price: requiredPrice("STRIPE_PRICE_PRO", env),
      expectedAmount: 4500,
    },
    {
      plan: "pro_max",
      interval: "monthly",
      price: requiredPrice("STRIPE_PRICE_PRO_MAX", env),
      expectedAmount: 9500,
    },
  ];
  const yearlyPlans = [
    ["personal", "STRIPE_PRICE_PERSONAL_YEARLY"],
    ["pro", "STRIPE_PRICE_PRO_YEARLY"],
    ["pro_max", "STRIPE_PRICE_PRO_MAX_YEARLY"],
  ].flatMap(([plan, envName]) => {
    const price = configuredPrice(envName, env);
    return price
      ? [{ plan, interval: "yearly", price, expectedAmount: null, envName }]
      : [];
  });
  return [...monthlyPlans, ...yearlyPlans];
}

export function validateCommercialSmokePrice(price, item) {
  if (!price.livemode) throw new Error(`${item.plan} ${item.interval} price is not live.`);
  if (!price.active) throw new Error(`${item.plan} ${item.interval} price is inactive.`);
  if (price.currency !== "usd") throw new Error(`${item.plan} ${item.interval} price must be USD.`);
  if (typeof item.expectedAmount === "number" && price.unit_amount !== item.expectedAmount) {
    throw new Error(`${item.plan} ${item.interval} price amount mismatch: ${price.unit_amount}.`);
  }
  const expectedStripeInterval = item.interval === "yearly" ? "year" : "month";
  if (price.recurring?.interval !== expectedStripeInterval) {
    throw new Error(`${item.plan} price must recur ${expectedStripeInterval}ly.`);
  }
  if (price.recurring?.interval_count !== 1) {
    throw new Error(`${item.plan} ${item.interval} price must recur exactly once per interval.`);
  }
}

async function main() {
  loadEnvFiles();
  const stripe = new Stripe(requireLiveStripeKey(), { apiVersion: "2024-06-20" });
  const portalConfigurationId = requiredConfig("STRIPE_BILLING_PORTAL_CONFIGURATION");
  const successUrl = process.env.ZAKI_APP_URL || "https://app.chatzaki.com/billing/success";
  const cancelUrl = process.env.ZAKI_APP_URL || "https://app.chatzaki.com/pricing";
  const plans = buildCommercialSmokePlans(process.env);

  const results = [];
  const portalConfiguration = await stripe.billingPortal.configurations.retrieve(
    portalConfigurationId
  );
  const portalProducts = Array.isArray(portalConfiguration?.features?.subscription_update?.products)
    ? portalConfiguration.features.subscription_update.products
    : [];
  const portalPriceIds = new Set(
    portalProducts.flatMap((product) => (Array.isArray(product?.prices) ? product.prices : []))
  );
  for (const item of plans) {
    if (!portalPriceIds.has(item.price)) {
      throw new Error(
        `${item.plan} ${item.interval} price is missing from STRIPE_BILLING_PORTAL_CONFIGURATION subscription updates.`
      );
    }
  }

  for (const item of plans) {
    const price = await stripe.prices.retrieve(item.price, { expand: ["product"] });
    validateCommercialSmokePrice(price, item);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: item.price, quantity: 1 }],
      success_url: `${successUrl}?checkout=success&plan=${item.plan}&interval=${item.interval}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}?checkout=cancelled&plan=${item.plan}&interval=${item.interval}`,
      customer_email: `billing-smoke+${item.plan}-${item.interval}@chatzaki.com`,
      metadata: {
        zaki_smoke_test: "commercial_checkout",
        plan_tier: item.plan,
        billing_interval: item.interval,
      },
      subscription_data: {
        metadata: {
          zaki_smoke_test: "commercial_checkout",
          plan_tier: item.plan,
          billing_interval: item.interval,
        },
      },
    });

    await stripe.checkout.sessions.expire(session.id);
    results.push({
      plan: item.plan,
      interval: item.interval,
      priceId: item.price,
      amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
      sessionId: session.id,
      expired: true,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        livemode: true,
        portalConfiguration: {
          id: portalConfiguration.id,
          subscriptionUpdateEnabled: Boolean(
            portalConfiguration?.features?.subscription_update?.enabled
          ),
        },
        results,
      },
      null,
      2
    )
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error?.message || error);
    process.exitCode = 1;
  });
}
