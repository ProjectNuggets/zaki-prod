import { LEGAL_POLICY_VERSION_FALLBACK } from "./legal-consent.js";
import path from "node:path";
import { isValidMinutesReadToken } from "./minutes-read-secret.js";
import {
  isValidMinutesCallbackHmacKey,
  isValidMinutesControlRecoveryKey,
  isValidMinutesControlSigningKey,
} from "./minutes-control-secret.js";
import {
  MINUTES_CONTROL_MAX_CAPTURE_SECONDS_MAX,
  MINUTES_CONTROL_MAX_CAPTURE_SECONDS_MIN,
  validateMinutesCaptureFundingWindow,
} from "./minutes-control-contract.js";

const PROD = "production";

function normalize(value) {
  return String(value || "").trim();
}

function parseCsv(value) {
  return normalize(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isTruthyBoolean(value) {
  return ["1", "true", "yes", "on"].includes(normalize(value).toLowerCase());
}

function isSkipVerificationMode(value) {
  return ["non", "none", "no"].includes(normalize(value).toLowerCase());
}

function hasHttpsUrl(value) {
  return /^https:\/\//i.test(normalize(value));
}

function hasHttpUrl(value) {
  return /^https?:\/\//i.test(normalize(value));
}

function hasHttpOrigin(value) {
  try {
    const parsed = new URL(normalize(value));
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password &&
      parsed.pathname === "/" &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

function hasUnsafeOrigin(origin) {
  return /^file:\/\//i.test(origin) || /localhost|127\.0\.0\.1/i.test(origin);
}

function isSafeIntegerInRange(value, min, max) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max;
}

function pushIssue(list, key, message) {
  list.push({ key, message });
}

export function validateRuntimeConfig(env = process.env) {
  const nodeEnv = normalize(env.NODE_ENV) || "development";
  const isProduction = nodeEnv === PROD;

  const allowedOrigins = parseCsv(env.ZAKI_ALLOWED_ORIGINS);
  const superAdminEmails = parseCsv(env.ZAKI_SUPER_ADMIN_EMAILS);
  const legacyAdminEmails = parseCsv(env.ZAKI_ADMIN_EMAILS);
  const emailMode = normalize(env.ZAKI_EMAIL_MODE || "console").toLowerCase();
  const legalPolicyVersion = normalize(env.ZAKI_LEGAL_POLICY_VERSION);
  const includeVerifyLink = isTruthyBoolean(env.ZAKI_INCLUDE_VERIFY_LINK);
  const memoryAlertWebhook = normalize(env.ZAKI_MEMORY_ALERT_WEBHOOK_URL);
  const billingAlertWebhook = normalize(env.ZAKI_BILLING_ALERT_WEBHOOK_URL);
  const meterFailOpenEnabled = !["0", "false", "no", "off"].includes(
    normalize(env.ZAKI_METER_FAIL_OPEN_ENABLED).toLowerCase()
  );
  const billingProvider = normalize(env.ZAKI_BILLING_PROVIDER || "stripe").toLowerCase();
  const stripeSecretKey = normalize(env.STRIPE_SECRET_KEY);
  const stripeWebhookSecret = normalize(env.STRIPE_WEBHOOK_SECRET);
  const stripePriceStudentMonthly = normalize(env.STRIPE_PRICE_STUDENT);
  const stripePriceStudentYearly = normalize(env.STRIPE_PRICE_STUDENT_YEARLY);
  const stripePricePersonalYearly = normalize(env.STRIPE_PRICE_PERSONAL_YEARLY);
  const stripePricePersonalMonthly = normalize(env.STRIPE_PRICE_PERSONAL);
  const stripePriceProMonthly = normalize(env.STRIPE_PRICE_PRO);
  const stripePriceProYearly = normalize(env.STRIPE_PRICE_PRO_YEARLY);
  const stripePriceProMaxMonthly = normalize(env.STRIPE_PRICE_PRO_MAX);
  const stripePriceProMaxYearly = normalize(env.STRIPE_PRICE_PRO_MAX_YEARLY);
  const stripePriceAccessCodeMonthly = normalize(env.STRIPE_PRICE_ACCESS_CODE_MONTHLY);
  const stripeBillingPortalConfiguration = normalize(env.STRIPE_BILLING_PORTAL_CONFIGURATION);
  const learningEnabled = isTruthyBoolean(env.ZAKI_LEARNING_ENABLED);
  const learningBaseUrl = normalize(env.LEARNING_ENGINE_BASE_URL);
  const learningInternalToken = normalize(env.LEARNING_ENGINE_INTERNAL_TOKEN);
  const minutesEnabled = isTruthyBoolean(env.ZAKI_MINUTES_ENABLED);
  const minutesBaseUrl = normalize(env.MINUTES_ENGINE_BASE_URL);
  const minutesReadToken = String(env.MINUTES_ENGINE_READ_TOKEN ?? "");
  const minutesReadTokenFile = normalize(env.MINUTES_ENGINE_READ_TOKEN_FILE);
  const minutesControlEnabled = isTruthyBoolean(env.ZAKI_MINUTES_CONTROL_ENABLED);
  const minutesControlStagingReady = isTruthyBoolean(env.ZAKI_MINUTES_CONTROL_STAGING_READY);
  const minutesControlSigningKey = String(env.MINUTES_ENGINE_CONTROL_TOKEN ?? "");
  const minutesControlSigningKeyFile = normalize(env.MINUTES_ENGINE_CONTROL_TOKEN_FILE);
  const minutesCallbackHmacKey = String(env.MINUTES_ENGINE_CALLBACK_HMAC_KEY ?? "");
  const minutesCallbackHmacKeyFile = normalize(env.MINUTES_ENGINE_CALLBACK_HMAC_KEY_FILE);
  const minutesRecoveryKey = String(env.MINUTES_CONTROL_RECOVERY_KEY ?? "");
  const minutesRecoveryKeyFile = normalize(env.MINUTES_CONTROL_RECOVERY_KEY_FILE);
  const minutesControlReserveUnits = normalize(env.MINUTES_CONTROL_CAPTURE_RESERVE_UNITS);
  const minutesControlTokenTtlSeconds = normalize(env.MINUTES_CONTROL_TOKEN_TTL_SECONDS || "60");
  const minutesControlHoldTtlMs = normalize(env.MINUTES_CONTROL_CAPTURE_HOLD_TTL_MS || String(6 * 60 * 60 * 1_000));
  const minutesControlMaxCaptureSeconds = normalize(env.MINUTES_CONTROL_MAX_CAPTURE_SECONDS || "3600");
  const minutesControlPolicyVersion = normalize(env.MINUTES_CONTROL_POLICY_VERSION || "minutes-capture-consent-v1");
  const minutesControlAudioRetentionDays = normalize(env.MINUTES_CONTROL_AUDIO_RETENTION_DAYS || "0");
  const minutesControlTranscriptRetentionDays = normalize(env.MINUTES_CONTROL_TRANSCRIPT_RETENTION_DAYS || "30");
  const minutesControlSummaryRetentionDays = normalize(env.MINUTES_CONTROL_SUMMARY_RETENTION_DAYS || "30");
  const designEnabled = isTruthyBoolean(env.ZAKI_DESIGN_ENABLED);
  const designControllerEnabled = isTruthyBoolean(env.ZAKI_DESIGN_SESSION_CONTROLLER_ENABLED);
  const designBaseUrl = normalize(env.DESIGN_ENGINE_BASE_URL);
  const designInternalToken = normalize(env.DESIGN_ENGINE_INTERNAL_TOKEN || env.ZAKI_DESIGN_INTERNAL_TOKEN);
  const designControllerBaseUrl = normalize(env.ZAKI_DESIGN_CONTROLLER_BASE_URL);
  const designControllerToken = normalize(env.ZAKI_DESIGN_CONTROLLER_TOKEN);
  const designHubCallbackToken = normalize(env.ZAKI_DESIGN_HUB_CALLBACK_TOKEN);
  const hireEnabled = isTruthyBoolean(env.ZAKI_HIRE_ENABLED);
  const hireBaseUrl = normalize(env.HIRE_ENGINE_BASE_URL || env.ZAKI_HIRE_ENGINE_BASE_URL);
  const hireInternalToken = normalize(env.HIRE_ENGINE_INTERNAL_TOKEN || env.ZAKI_HIRE_ENGINE_INTERNAL_TOKEN);
  const hireMeterSigningKey = normalize(
    env.ZAKI_METER_GRANT_SIGNING_SECRET || env.ZAKI_HIRE_METER_SIGNING_KEY
  );
  const nullalisDevUserId = normalize(env.NULLALIS_DEV_USER_ID || env.NULLCLAW_DEV_USER_ID);
  const googleClientId = normalize(env.GOOGLE_CLIENT_ID);
  const googleClientSecret = normalize(env.GOOGLE_CLIENT_SECRET);
  const googleRedirectUri = normalize(env.GOOGLE_OAUTH_REDIRECT_URI);
  const googleStateSecret = normalize(env.GOOGLE_OAUTH_STATE_SECRET || env.ZAKI_JWT_SIGNING_KEY);
  const turnstileDisabled = isTruthyBoolean(env.ZAKI_TURNSTILE_DISABLED);
  const turnstileSecret = normalize(env.ZAKI_TURNSTILE_SECRET_KEY);

  const errors = [];
  const warnings = [];

  if (!normalize(env.NOVA_TYP_BASE_URL)) {
    pushIssue(errors, "NOVA_TYP_BASE_URL", "NOVA_TYP_BASE_URL must be set.");
  }
  if (!normalize(env.NOVA_TYP_API_KEY)) {
    pushIssue(errors, "NOVA_TYP_API_KEY", "NOVA_TYP_API_KEY must be set.");
  }
  if (
    normalize(env.PGSSLMODE).toLowerCase() === "require" &&
    normalize(env.PGSSL_REJECT_UNAUTHORIZED).toLowerCase() === "false"
  ) {
    pushIssue(
      errors,
      "PGSSL_REJECT_UNAUTHORIZED",
      "PGSSL_REJECT_UNAUTHORIZED=false is not allowed when PGSSLMODE=require."
    );
  }

  if (!legalPolicyVersion) {
    pushIssue(
      warnings,
      "ZAKI_LEGAL_POLICY_VERSION",
      `ZAKI_LEGAL_POLICY_VERSION is not set. Falling back to ${LEGAL_POLICY_VERSION_FALLBACK}.`
    );
  }

  if (includeVerifyLink && isProduction) {
    pushIssue(
      warnings,
      "ZAKI_INCLUDE_VERIFY_LINK",
      "ZAKI_INCLUDE_VERIFY_LINK=true is usually unsafe in production."
    );
  }

  if (memoryAlertWebhook && !hasHttpUrl(memoryAlertWebhook)) {
    pushIssue(
      warnings,
      "ZAKI_MEMORY_ALERT_WEBHOOK_URL",
      "ZAKI_MEMORY_ALERT_WEBHOOK_URL should start with http:// or https://."
    );
  }
  if (billingAlertWebhook && !hasHttpUrl(billingAlertWebhook)) {
    pushIssue(
      warnings,
      "ZAKI_BILLING_ALERT_WEBHOOK_URL",
      "ZAKI_BILLING_ALERT_WEBHOOK_URL should start with http:// or https://."
    );
  }
  if (isProduction && meterFailOpenEnabled && !billingAlertWebhook) {
    pushIssue(
      errors,
      "ZAKI_BILLING_ALERT_WEBHOOK_URL",
      "ZAKI_BILLING_ALERT_WEBHOOK_URL is required in production while metering fail-open is enabled."
    );
  }
  const stripeConfigIssues = isProduction ? errors : warnings;
  // A missing SKU disables ONE checkout button; it must never crash the server. So the checks split:
  //  - fatal-in-prod (stripeConfigIssues): the pieces without which Stripe cannot operate at all
  //    (secret key, webhook secret) and the currently-sellable core plans (Personal/Pro/Pro Max
  //    monthly). If those are absent in prod, the product is broken and we should refuse to boot.
  //  - warnings only: SKUs the owner has explicitly deferred as non-blocking (student, the yearly
  //    variants, access-code purchase). Their own message already says "will be unavailable" —
  //    graceful degradation, not a boot failure. Keeping these fatal blocked the prod cut on price
  //    IDs that aren't ready yet, contradicting that intent.
  if (billingProvider === "stripe" && !stripeSecretKey) {
    pushIssue(
      stripeConfigIssues,
      "STRIPE_SECRET_KEY",
      "STRIPE_SECRET_KEY is not set. Stripe checkout cannot start."
    );
  }
  if (billingProvider === "stripe" && !stripeWebhookSecret) {
    pushIssue(
      stripeConfigIssues,
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_WEBHOOK_SECRET is not set. Stripe fulfillment and lifecycle events cannot be verified."
    );
  }
  if (billingProvider === "stripe" && !stripePriceStudentMonthly) {
    pushIssue(
      warnings,
      "STRIPE_PRICE_STUDENT",
      "STRIPE_PRICE_STUDENT is not set. Student monthly checkout will be unavailable."
    );
  }
  if (billingProvider === "stripe" && !stripePriceStudentYearly) {
    pushIssue(
      warnings,
      "STRIPE_PRICE_STUDENT_YEARLY",
      "STRIPE_PRICE_STUDENT_YEARLY is not set. Student yearly checkout will be unavailable."
    );
  }
  if (billingProvider === "stripe" && !stripePricePersonalYearly) {
    pushIssue(
      warnings,
      "STRIPE_PRICE_PERSONAL_YEARLY",
      "STRIPE_PRICE_PERSONAL_YEARLY is not set. Personal yearly checkout will be unavailable."
    );
  }
  if (billingProvider === "stripe" && !stripePriceProYearly) {
    pushIssue(
      warnings,
      "STRIPE_PRICE_PRO_YEARLY",
      "STRIPE_PRICE_PRO_YEARLY is not set. Pro yearly checkout will be unavailable."
    );
  }
  if (billingProvider === "stripe" && !stripePriceProMaxYearly) {
    pushIssue(
      warnings,
      "STRIPE_PRICE_PRO_MAX_YEARLY",
      "STRIPE_PRICE_PRO_MAX_YEARLY is not set. Pro Max yearly checkout will be unavailable."
    );
  }
  if (billingProvider === "stripe" && !stripePricePersonalMonthly) {
    pushIssue(
      stripeConfigIssues,
      "STRIPE_PRICE_PERSONAL",
      "STRIPE_PRICE_PERSONAL is not set. ZAKI Personal checkout will be unavailable."
    );
  }
  if (billingProvider === "stripe" && !stripePriceProMonthly) {
    pushIssue(
      stripeConfigIssues,
      "STRIPE_PRICE_PRO",
      "STRIPE_PRICE_PRO is not set. ZAKI Pro checkout will be unavailable."
    );
  }
  if (billingProvider === "stripe" && !stripePriceProMaxMonthly) {
    pushIssue(
      stripeConfigIssues,
      "STRIPE_PRICE_PRO_MAX",
      "STRIPE_PRICE_PRO_MAX is not set. ZAKI Pro Max checkout will be unavailable."
    );
  }
  if (billingProvider === "stripe" && !stripePriceAccessCodeMonthly) {
    pushIssue(
      warnings,
      "STRIPE_PRICE_ACCESS_CODE_MONTHLY",
      "STRIPE_PRICE_ACCESS_CODE_MONTHLY is not set. Access-code purchase checkout will be unavailable."
    );
  }
  if (
    billingProvider === "stripe" &&
    stripePricePersonalMonthly &&
    stripePriceProMonthly &&
    stripePriceProMaxMonthly &&
    !stripeBillingPortalConfiguration
  ) {
    pushIssue(
      warnings,
      "STRIPE_BILLING_PORTAL_CONFIGURATION",
      "STRIPE_BILLING_PORTAL_CONFIGURATION is not set. Personal/Pro/Pro Max plan changes will be unavailable."
    );
  }
  if (learningEnabled) {
    if (!learningBaseUrl) {
      pushIssue(
        errors,
        "LEARNING_ENGINE_BASE_URL",
        "LEARNING_ENGINE_BASE_URL is required when ZAKI_LEARNING_ENABLED=true."
      );
    } else if (!hasHttpUrl(learningBaseUrl)) {
      pushIssue(
        errors,
        "LEARNING_ENGINE_BASE_URL",
        "LEARNING_ENGINE_BASE_URL must start with http:// or https://."
      );
    }
    if (!learningInternalToken) {
      pushIssue(
        errors,
        "LEARNING_ENGINE_INTERNAL_TOKEN",
        "LEARNING_ENGINE_INTERNAL_TOKEN is required when ZAKI_LEARNING_ENABLED=true."
      );
    }
  } else if (learningBaseUrl || learningInternalToken) {
    pushIssue(
      warnings,
      "ZAKI_LEARNING_ENABLED",
      "Learning engine config is present, but ZAKI_LEARNING_ENABLED is not true."
    );
  }
  if (minutesEnabled) {
    if (!minutesBaseUrl) {
      pushIssue(
        errors,
        "MINUTES_ENGINE_BASE_URL",
        "MINUTES_ENGINE_BASE_URL is required when ZAKI_MINUTES_ENABLED=true."
      );
    } else if (!hasHttpOrigin(minutesBaseUrl)) {
      pushIssue(
        errors,
        "MINUTES_ENGINE_BASE_URL",
        "MINUTES_ENGINE_BASE_URL must be a fixed HTTP(S) origin without credentials, path, query, or fragment."
      );
    }
    if (minutesReadTokenFile && !path.isAbsolute(minutesReadTokenFile)) {
      pushIssue(
        errors,
        "MINUTES_ENGINE_READ_TOKEN_FILE",
        "MINUTES_ENGINE_READ_TOKEN_FILE must be an absolute secret-file path."
      );
    }
    if (isProduction && minutesReadToken) {
      pushIssue(
        errors,
        "MINUTES_ENGINE_READ_TOKEN",
        "MINUTES_ENGINE_READ_TOKEN cannot carry a production credential; use MINUTES_ENGINE_READ_TOKEN_FILE."
      );
    }
    if (isProduction && !minutesReadTokenFile) {
      pushIssue(
        errors,
        "MINUTES_ENGINE_READ_TOKEN_FILE",
        "MINUTES_ENGINE_READ_TOKEN_FILE is required in production when ZAKI_MINUTES_ENABLED=true."
      );
    } else if (!minutesReadTokenFile && !isValidMinutesReadToken(minutesReadToken)) {
      pushIssue(
        errors,
        "MINUTES_ENGINE_READ_TOKEN",
        "MINUTES_ENGINE_READ_TOKEN must be a dedicated 32-512 character printable ASCII local-development token without surrounding whitespace."
      );
    }
  } else if (minutesBaseUrl || minutesReadToken || minutesReadTokenFile) {
    pushIssue(
      warnings,
      "ZAKI_MINUTES_ENABLED",
      "Minutes read config is present, but ZAKI_MINUTES_ENABLED is not true."
    );
  }
  const minutesControlActive = minutesControlEnabled && minutesControlStagingReady;
  if (minutesControlStagingReady && !minutesControlEnabled) {
    pushIssue(
      errors,
      "ZAKI_MINUTES_CONTROL_STAGING_READY",
      "ZAKI_MINUTES_CONTROL_STAGING_READY requires ZAKI_MINUTES_CONTROL_ENABLED=true."
    );
  }
  if (minutesControlActive) {
    if (!minutesEnabled) {
      pushIssue(
        errors,
        "ZAKI_MINUTES_ENABLED",
        "ZAKI_MINUTES_ENABLED=true is required when Minutes control is active so the read and control planes launch together."
      );
    }
    if (!minutesBaseUrl) {
      pushIssue(errors, "MINUTES_ENGINE_BASE_URL", "MINUTES_ENGINE_BASE_URL is required when Minutes control is active.");
    } else if (!hasHttpOrigin(minutesBaseUrl)) {
      pushIssue(errors, "MINUTES_ENGINE_BASE_URL", "MINUTES_ENGINE_BASE_URL must be a fixed HTTP(S) origin without credentials, path, query, or fragment.");
    }
    for (const [fileKey, fileValue] of [
      ["MINUTES_ENGINE_CONTROL_TOKEN_FILE", minutesControlSigningKeyFile],
      ["MINUTES_ENGINE_CALLBACK_HMAC_KEY_FILE", minutesCallbackHmacKeyFile],
      ["MINUTES_CONTROL_RECOVERY_KEY_FILE", minutesRecoveryKeyFile],
    ]) {
      if (fileValue && !path.isAbsolute(fileValue)) {
        pushIssue(errors, fileKey, `${fileKey} must be an absolute secret-file path.`);
      }
    }
    if (isProduction && minutesControlSigningKey) {
      pushIssue(errors, "MINUTES_ENGINE_CONTROL_TOKEN", "MINUTES_ENGINE_CONTROL_TOKEN cannot carry a production signing secret; use MINUTES_ENGINE_CONTROL_TOKEN_FILE.");
    }
    if (isProduction && minutesCallbackHmacKey) {
      pushIssue(errors, "MINUTES_ENGINE_CALLBACK_HMAC_KEY", "MINUTES_ENGINE_CALLBACK_HMAC_KEY cannot carry a production credential; use MINUTES_ENGINE_CALLBACK_HMAC_KEY_FILE.");
    }
    if (isProduction && minutesRecoveryKey) {
      pushIssue(errors, "MINUTES_CONTROL_RECOVERY_KEY", "MINUTES_CONTROL_RECOVERY_KEY cannot carry a production credential; use MINUTES_CONTROL_RECOVERY_KEY_FILE.");
    }
    if (isProduction && !minutesControlSigningKeyFile) {
      pushIssue(errors, "MINUTES_ENGINE_CONTROL_TOKEN_FILE", "MINUTES_ENGINE_CONTROL_TOKEN_FILE is required in production when Minutes control is active.");
    } else if (!minutesControlSigningKeyFile && !isValidMinutesControlSigningKey(minutesControlSigningKey)) {
      pushIssue(errors, "MINUTES_ENGINE_CONTROL_TOKEN", "MINUTES_ENGINE_CONTROL_TOKEN must be a 32-512 character printable signing secret for scoped control tokens.");
    }
    if (isProduction && !minutesCallbackHmacKeyFile) {
      pushIssue(errors, "MINUTES_ENGINE_CALLBACK_HMAC_KEY_FILE", "MINUTES_ENGINE_CALLBACK_HMAC_KEY_FILE is required in production when Minutes control is active.");
    } else if (!minutesCallbackHmacKeyFile && !isValidMinutesCallbackHmacKey(minutesCallbackHmacKey)) {
      pushIssue(errors, "MINUTES_ENGINE_CALLBACK_HMAC_KEY", "MINUTES_ENGINE_CALLBACK_HMAC_KEY must be a 32-512 character printable HMAC key.");
    }
    if (isProduction && !minutesRecoveryKeyFile) {
      pushIssue(errors, "MINUTES_CONTROL_RECOVERY_KEY_FILE", "MINUTES_CONTROL_RECOVERY_KEY_FILE is required in production when Minutes control is active.");
    } else if (!minutesRecoveryKeyFile && !isValidMinutesControlRecoveryKey(minutesRecoveryKey)) {
      pushIssue(errors, "MINUTES_CONTROL_RECOVERY_KEY", "MINUTES_CONTROL_RECOVERY_KEY must be a dedicated 32-512 character printable encryption key.");
    }
    if (!isSafeIntegerInRange(minutesControlReserveUnits, 1, 1_000_000)) {
      pushIssue(errors, "MINUTES_CONTROL_CAPTURE_RESERVE_UNITS", "MINUTES_CONTROL_CAPTURE_RESERVE_UNITS must be an integer from 1 to 1000000 when Minutes control is active.");
    }
    if (!isSafeIntegerInRange(minutesControlTokenTtlSeconds, 30, 300)) {
      pushIssue(errors, "MINUTES_CONTROL_TOKEN_TTL_SECONDS", "MINUTES_CONTROL_TOKEN_TTL_SECONDS must be an integer from 30 to 300.");
    }
    if (!isSafeIntegerInRange(minutesControlHoldTtlMs, 60_000, 24 * 60 * 60 * 1_000)) {
      pushIssue(errors, "MINUTES_CONTROL_CAPTURE_HOLD_TTL_MS", "MINUTES_CONTROL_CAPTURE_HOLD_TTL_MS must be an integer from 60000 to 86400000.");
    }
    if (!isSafeIntegerInRange(
      minutesControlMaxCaptureSeconds,
      MINUTES_CONTROL_MAX_CAPTURE_SECONDS_MIN,
      MINUTES_CONTROL_MAX_CAPTURE_SECONDS_MAX
    )) {
      pushIssue(
        errors,
        "MINUTES_CONTROL_MAX_CAPTURE_SECONDS",
        `MINUTES_CONTROL_MAX_CAPTURE_SECONDS must be an integer from ${MINUTES_CONTROL_MAX_CAPTURE_SECONDS_MIN} to ${MINUTES_CONTROL_MAX_CAPTURE_SECONDS_MAX}.`
      );
    }
    const fundingWindow = validateMinutesCaptureFundingWindow({
      maxCaptureSeconds: Number(minutesControlMaxCaptureSeconds),
      reservedUnits: Number(minutesControlReserveUnits),
      holdTtlMs: Number(minutesControlHoldTtlMs),
    });
    if (fundingWindow.requiredUnits !== null && isSafeIntegerInRange(minutesControlReserveUnits, 1, 1_000_000) && !fundingWindow.ok) {
      pushIssue(
        errors,
        "MINUTES_CONTROL_CAPTURE_RESERVE_UNITS",
        `MINUTES_CONTROL_CAPTURE_RESERVE_UNITS must equal ${fundingWindow.requiredUnits} to fund MINUTES_CONTROL_MAX_CAPTURE_SECONDS.`
      );
    }
    if (
      fundingWindow.requiredHoldTtlMs !== null &&
      isSafeIntegerInRange(minutesControlHoldTtlMs, 60_000, 24 * 60 * 60 * 1_000) &&
      Number(minutesControlHoldTtlMs) < fundingWindow.requiredHoldTtlMs
    ) {
      pushIssue(
        errors,
        "MINUTES_CONTROL_CAPTURE_HOLD_TTL_MS",
        `MINUTES_CONTROL_CAPTURE_HOLD_TTL_MS must cover the maximum capture plus terminal-settlement grace (${fundingWindow.requiredHoldTtlMs}ms).`
      );
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(minutesControlPolicyVersion)) {
      pushIssue(errors, "MINUTES_CONTROL_POLICY_VERSION", "MINUTES_CONTROL_POLICY_VERSION must be a 1-160 character control-policy identifier.");
    }
    if (!isSafeIntegerInRange(minutesControlAudioRetentionDays, 0, 365)) {
      pushIssue(errors, "MINUTES_CONTROL_AUDIO_RETENTION_DAYS", "MINUTES_CONTROL_AUDIO_RETENTION_DAYS must be an integer from 0 to 365.");
    }
    if (!isSafeIntegerInRange(minutesControlTranscriptRetentionDays, 1, 3_650)) {
      pushIssue(errors, "MINUTES_CONTROL_TRANSCRIPT_RETENTION_DAYS", "MINUTES_CONTROL_TRANSCRIPT_RETENTION_DAYS must be an integer from 1 to 3650.");
    }
    if (!isSafeIntegerInRange(minutesControlSummaryRetentionDays, 1, 3_650)) {
      pushIssue(errors, "MINUTES_CONTROL_SUMMARY_RETENTION_DAYS", "MINUTES_CONTROL_SUMMARY_RETENTION_DAYS must be an integer from 1 to 3650.");
    } else if (
      isSafeIntegerInRange(minutesControlTranscriptRetentionDays, 1, 3_650) &&
      Number(minutesControlSummaryRetentionDays) > Number(minutesControlTranscriptRetentionDays)
    ) {
      pushIssue(errors, "MINUTES_CONTROL_SUMMARY_RETENTION_DAYS", "MINUTES_CONTROL_SUMMARY_RETENTION_DAYS cannot exceed MINUTES_CONTROL_TRANSCRIPT_RETENTION_DAYS.");
    }
  } else if (
    minutesControlEnabled || minutesControlStagingReady || minutesControlSigningKey || minutesControlSigningKeyFile ||
    minutesCallbackHmacKey || minutesCallbackHmacKeyFile || minutesControlReserveUnits
  ) {
    pushIssue(
      warnings,
      "ZAKI_MINUTES_CONTROL_STAGING_READY",
      "Minutes control remains dark until both ZAKI_MINUTES_CONTROL_ENABLED and ZAKI_MINUTES_CONTROL_STAGING_READY are true."
    );
  }
  if (designControllerEnabled) {
    if (!designControllerBaseUrl) {
      pushIssue(errors, "ZAKI_DESIGN_CONTROLLER_BASE_URL", "Design controller base URL is required when its gate is enabled.");
    } else if (!hasHttpUrl(designControllerBaseUrl)) {
      pushIssue(errors, "ZAKI_DESIGN_CONTROLLER_BASE_URL", "Design controller base URL must start with http:// or https://.");
    }
    if (!designControllerToken) {
      pushIssue(errors, "ZAKI_DESIGN_CONTROLLER_TOKEN", "Hub-to-controller token is required when the Design controller is enabled.");
    }
    if (!designHubCallbackToken) {
      pushIssue(errors, "ZAKI_DESIGN_HUB_CALLBACK_TOKEN", "Controller-to-hub token is required when the Design controller is enabled.");
    }
    if (designControllerToken && designHubCallbackToken && designControllerToken === designHubCallbackToken) {
      pushIssue(errors, "ZAKI_DESIGN_HUB_CALLBACK_TOKEN", "Design directional bearer tokens must be distinct.");
    }
  }
  if (designEnabled && !designControllerEnabled) {
    if (!designBaseUrl) {
      pushIssue(
        errors,
        "DESIGN_ENGINE_BASE_URL",
        "DESIGN_ENGINE_BASE_URL is required when ZAKI_DESIGN_ENABLED=true."
      );
    } else if (!hasHttpUrl(designBaseUrl)) {
      pushIssue(
        errors,
        "DESIGN_ENGINE_BASE_URL",
        "DESIGN_ENGINE_BASE_URL must start with http:// or https://."
      );
    }
    if (!designInternalToken) {
      pushIssue(
        errors,
        "DESIGN_ENGINE_INTERNAL_TOKEN",
        "DESIGN_ENGINE_INTERNAL_TOKEN is required when ZAKI_DESIGN_ENABLED=true."
      );
    }
  } else if (!designEnabled && !designControllerEnabled && (designBaseUrl || designInternalToken)) {
    pushIssue(
      warnings,
      "ZAKI_DESIGN_ENABLED",
      "Design engine config is present, but ZAKI_DESIGN_ENABLED is not true."
    );
  }

  if (hireEnabled) {
    if (!hireBaseUrl) {
      pushIssue(
        errors,
        "HIRE_ENGINE_BASE_URL",
        "HIRE_ENGINE_BASE_URL is required when ZAKI_HIRE_ENABLED=true."
      );
    } else if (!hasHttpUrl(hireBaseUrl)) {
      pushIssue(
        errors,
        "HIRE_ENGINE_BASE_URL",
        "HIRE_ENGINE_BASE_URL must start with http:// or https://."
      );
    }
    if (!hireInternalToken) {
      pushIssue(
        errors,
        "HIRE_ENGINE_INTERNAL_TOKEN",
        "HIRE_ENGINE_INTERNAL_TOKEN is required when ZAKI_HIRE_ENABLED=true."
      );
    }
    if (isProduction && hireMeterSigningKey.length < 32) {
      pushIssue(
        errors,
        "ZAKI_METER_GRANT_SIGNING_SECRET",
        "ZAKI_METER_GRANT_SIGNING_SECRET must be set to a dedicated 32+ character central meter secret in production when Hire is enabled."
      );
    }
  } else if (hireBaseUrl || hireInternalToken) {
    pushIssue(
      warnings,
      "ZAKI_HIRE_ENABLED",
      "Hire engine config is present, but ZAKI_HIRE_ENABLED is not true."
    );
  }

  if (nullalisDevUserId && !isProduction) {
    pushIssue(
      warnings,
      "NULLALIS_DEV_USER_ID",
      "NULLALIS_DEV_USER_ID/NULLCLAW_DEV_USER_ID is a local-only agent auth bypass; unset it for multi-user smoke tests."
    );
  }

  const hasPartialGoogleOAuth =
    googleClientId || googleClientSecret || googleRedirectUri || normalize(env.GOOGLE_OAUTH_STATE_SECRET);
  if (hasPartialGoogleOAuth) {
    if (!googleClientId) {
      pushIssue(warnings, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID is required to enable Google OAuth.");
    }
    if (!googleClientSecret) {
      pushIssue(warnings, "GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET is required to enable Google OAuth.");
    }
    if (googleRedirectUri && !hasHttpUrl(googleRedirectUri)) {
      pushIssue(warnings, "GOOGLE_OAUTH_REDIRECT_URI", "GOOGLE_OAUTH_REDIRECT_URI must start with http:// or https://.");
    }
    if (!googleStateSecret) {
      pushIssue(warnings, "GOOGLE_OAUTH_STATE_SECRET", "GOOGLE_OAUTH_STATE_SECRET or ZAKI_JWT_SIGNING_KEY is required for Google OAuth state signing.");
    }
  }

  if (superAdminEmails.length === 0) {
    pushIssue(
      warnings,
      "ZAKI_SUPER_ADMIN_EMAILS",
      "ZAKI_SUPER_ADMIN_EMAILS is not set. Falling back to in-code super admin defaults."
    );
  }
  if (legacyAdminEmails.length > 0) {
    pushIssue(
      warnings,
      "ZAKI_ADMIN_EMAILS",
      "ZAKI_ADMIN_EMAILS is deprecated for runtime admin access. Use hidden admin management with super admin control."
    );
  }

  if (emailMode === "resend") {
    if (!normalize(env.RESEND_API_KEY)) {
      pushIssue(errors, "RESEND_API_KEY", "RESEND_API_KEY is required when ZAKI_EMAIL_MODE=resend.");
    }
    if (!normalize(env.RESEND_FROM)) {
      pushIssue(errors, "RESEND_FROM", "RESEND_FROM is required when ZAKI_EMAIL_MODE=resend.");
    }
  } else if (emailMode === "smtp") {
    if (!normalize(env.SMTP_HOST)) {
      pushIssue(errors, "SMTP_HOST", "SMTP_HOST is required when ZAKI_EMAIL_MODE=smtp.");
    }
    if (!normalize(env.SMTP_USER)) {
      pushIssue(errors, "SMTP_USER", "SMTP_USER is required when ZAKI_EMAIL_MODE=smtp.");
    }
    if (!normalize(env.SMTP_PASS)) {
      pushIssue(errors, "SMTP_PASS", "SMTP_PASS is required when ZAKI_EMAIL_MODE=smtp.");
    }
    if (!normalize(env.SMTP_FROM)) {
      pushIssue(errors, "SMTP_FROM", "SMTP_FROM is required when ZAKI_EMAIL_MODE=smtp.");
    }
  }

  // SUN-02 — ZAKI_LEGACY_TYP_AUTH_CUTOFF (optional; triggers cutoff enforcement when set)
  const legacyCutoff = normalize(env.ZAKI_LEGACY_TYP_AUTH_CUTOFF);
  if (legacyCutoff) {
    const parsed = new Date(legacyCutoff).getTime();
    if (Number.isNaN(parsed)) {
      pushIssue(
        warnings,
        "ZAKI_LEGACY_TYP_AUTH_CUTOFF",
        "ZAKI_LEGACY_TYP_AUTH_CUTOFF must be a valid ISO date string (e.g. 2026-07-01T00:00:00Z)."
      );
    }
  }

  // OATH-09 — ZAKI_JWT_SIGNING_KEY: warn in dev (error in prod block below)
  const zakiSigningKeyEarly = normalize(env.ZAKI_JWT_SIGNING_KEY);
  if (!zakiSigningKeyEarly) {
    pushIssue(
      warnings,
      "ZAKI_JWT_SIGNING_KEY",
      "ZAKI_JWT_SIGNING_KEY is not set. Auth will throw at runtime. Add a 64-char hex key to .env."
    );
  } else if (!/^[0-9a-f]{64}$/i.test(zakiSigningKeyEarly)) {
    pushIssue(
      warnings,
      "ZAKI_JWT_SIGNING_KEY",
      "ZAKI_JWT_SIGNING_KEY must be a 64-character hex string (256-bit key)."
    );
  }

  if (!isProduction) {
    return {
      ok: errors.length === 0,
      isProduction,
      errors,
      warnings,
      summary: {
        nodeEnv,
        allowedOriginsCount: allowedOrigins.length,
        superAdminEmailsCount: superAdminEmails.length,
        legacyAdminEmailsCount: legacyAdminEmails.length,
        emailMode,
      },
    };
  }

  if (allowedOrigins.length === 0) {
    pushIssue(
      errors,
      "ZAKI_ALLOWED_ORIGINS",
      "ZAKI_ALLOWED_ORIGINS must include explicit production origins."
    );
  }
  if (allowedOrigins.some(hasUnsafeOrigin)) {
    pushIssue(
      errors,
      "ZAKI_ALLOWED_ORIGINS",
      "ZAKI_ALLOWED_ORIGINS contains localhost/file origins, which are not allowed in production."
    );
  }

  if (!normalize(env.ZAKI_PUBLIC_URL)) {
    pushIssue(errors, "ZAKI_PUBLIC_URL", "ZAKI_PUBLIC_URL must be set in production.");
  } else if (!hasHttpsUrl(env.ZAKI_PUBLIC_URL)) {
    pushIssue(errors, "ZAKI_PUBLIC_URL", "ZAKI_PUBLIC_URL must start with https:// in production.");
  }

  if (!normalize(env.ZAKI_APP_URL)) {
    pushIssue(errors, "ZAKI_APP_URL", "ZAKI_APP_URL must be set in production.");
  } else if (!hasHttpsUrl(env.ZAKI_APP_URL)) {
    pushIssue(errors, "ZAKI_APP_URL", "ZAKI_APP_URL must start with https:// in production.");
  }

  if (memoryAlertWebhook && !hasHttpsUrl(memoryAlertWebhook)) {
    pushIssue(
      errors,
      "ZAKI_MEMORY_ALERT_WEBHOOK_URL",
      "ZAKI_MEMORY_ALERT_WEBHOOK_URL must start with https:// in production."
    );
  }
  if (billingAlertWebhook && !hasHttpsUrl(billingAlertWebhook)) {
    pushIssue(
      errors,
      "ZAKI_BILLING_ALERT_WEBHOOK_URL",
      "ZAKI_BILLING_ALERT_WEBHOOK_URL must start with https:// in production."
    );
  }

  if (isSkipVerificationMode(emailMode)) {
    pushIssue(
      errors,
      "ZAKI_EMAIL_MODE",
      "ZAKI_EMAIL_MODE must not bypass verification in production."
    );
  }

  if (nullalisDevUserId) {
    pushIssue(
      errors,
      "NULLALIS_DEV_USER_ID",
      "NULLALIS_DEV_USER_ID/NULLCLAW_DEV_USER_ID must not be set in production because it maps all agent traffic to one configured user."
    );
  }

  if (!legalPolicyVersion) {
    pushIssue(
      errors,
      "ZAKI_LEGAL_POLICY_VERSION",
      "ZAKI_LEGAL_POLICY_VERSION must be explicitly set in production."
    );
  }

  if (!turnstileDisabled && !turnstileSecret) {
    pushIssue(
      errors,
      "ZAKI_TURNSTILE_SECRET_KEY",
      "ZAKI_TURNSTILE_SECRET_KEY must be set in production unless ZAKI_TURNSTILE_DISABLED=true."
    );
  }

  // OATH-09 — ZAKI_JWT_SIGNING_KEY (256-bit hex, in k8s secret zaki-api-secrets)
  const zakiSigningKey = normalize(env.ZAKI_JWT_SIGNING_KEY);
  if (!zakiSigningKey) {
    pushIssue(
      errors,
      "ZAKI_JWT_SIGNING_KEY",
      "ZAKI_JWT_SIGNING_KEY must be set in production (256-bit hex string)."
    );
  } else if (!/^[0-9a-f]{64}$/i.test(zakiSigningKey)) {
    pushIssue(
      errors,
      "ZAKI_JWT_SIGNING_KEY",
      "ZAKI_JWT_SIGNING_KEY must be a 64-character hex string (256-bit key)."
    );
  }

  return {
    ok: errors.length === 0,
    isProduction,
    errors,
    warnings,
    summary: {
      nodeEnv,
      allowedOriginsCount: allowedOrigins.length,
      superAdminEmailsCount: superAdminEmails.length,
      legacyAdminEmailsCount: legacyAdminEmails.length,
      emailMode,
    },
  };
}

export function enforceRuntimeConfig(env = process.env) {
  const report = validateRuntimeConfig(env);
  if (!report.ok) {
    const details = report.errors.map((issue) => `${issue.key}: ${issue.message}`).join(" | ");
    throw new Error(`[Config] Invalid runtime configuration. ${details}`);
  }
  return report;
}
