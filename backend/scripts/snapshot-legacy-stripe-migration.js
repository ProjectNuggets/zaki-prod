#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Stripe from "stripe";
import dotenv from "dotenv";
import { getEffectiveEntitlementState } from "../src/effective-entitlements.js";

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

function maskEmail(value) {
  const email = String(value || "").trim();
  if (!email) return null;
  return email.replace(/(.).+(@.+)/, "$1***$2");
}

async function main() {
  loadEnvFiles();
  const stripe = new Stripe(requireLiveStripeKey(), { apiVersion: "2024-06-20" });
  const now = new Date();
  const subscriptions = await stripe.subscriptions.list({
    status: "all",
    limit: 100,
    expand: ["data.customer", "data.items.data.price"],
  });

  const rows = subscriptions.data
    .filter((subscription) =>
      ["active", "trialing", "past_due", "canceled", "unpaid"].includes(subscription.status)
    )
    .map((subscription) => {
      const price = subscription.items?.data?.[0]?.price || null;
      const customer = typeof subscription.customer === "object" ? subscription.customer : null;
      const currentPeriodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;
      const planTier = subscription.metadata?.plan_tier || "personal";
      const effective = getEffectiveEntitlementState(
        {
          plan_tier: planTier,
          plan_status: subscription.status,
          current_period_end: currentPeriodEnd,
          access_expires_at: null,
        },
        now
      );
      return {
        subscriptionId: subscription.id,
        customerEmail: maskEmail(customer?.email),
        status: subscription.status,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        currentPeriodEnd,
        priceId: price?.id || null,
        amount: price?.unit_amount ?? null,
        currency: price?.currency || null,
        interval: price?.recurring?.interval || null,
        metadataPlanTier: subscription.metadata?.plan_tier || null,
        effective: {
          premium: effective.premium,
          planId: effective.commercial.planId,
          label: effective.commercial.label,
          agent: effective.products.agent.access,
          learn: effective.products.learn.access,
          spacesUncapped: effective.products.spaces.uncapped,
        },
      };
    });

  const activeLike = rows.filter((row) => ["active", "trialing", "past_due"].includes(row.status));
  const canceled = rows.filter((row) => row.status === "canceled");
  console.log(
    JSON.stringify(
      {
        ok: true,
        livemode: true,
        subscriptionCount: subscriptions.data.length,
        activeLikeCount: activeLike.length,
        canceledCount: canceled.length,
        activeLike,
        canceled,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
