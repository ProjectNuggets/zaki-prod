// A minimal AUTHENTICATED metered endpoint used to prove the meter-gate end-to-end (HTTP → wallet
// debit) in staging without retrofitting every product route. Mounted only when enabled
// (ZAKI_METER_DEMO_ENABLED) and only ever affects the caller's own wallet.
//
//   POST /api/meter/demo  { units?, actualUnits?, idempotencyKey?, grantId? }
//   → reserves `units` (default 3), settles `actualUnits` (default = units). 429 when out of balance.
import express from "express";
import { runMeteredOperation } from "./meter-gate.js";

/**
 * @param {object} opts
 * @param {(req,res)=>Promise<{userId:number, planId?:string}|null>} opts.resolveUser - auth resolver.
 *   May respond directly (e.g. requireAuthUser sends its own 401); the router checks res.headersSent.
 * @param {boolean} [opts.enabled]
 */
export function buildMeterDemoRouter({ resolveUser, enabled = true } = {}) {
  const router = express.Router();
  router.post("/api/meter/demo", express.json(), async (req, res) => {
    if (!enabled) return res.status(404).json({ error: "not_found" });
    try {
      const u = await resolveUser(req, res);
      if (!u?.userId) {
        if (!res.headersSent) res.status(401).json({ error: "unauthorized" });
        return;
      }
      const estimate = Number.isFinite(Number(req.body?.units)) ? Number(req.body.units) : 3;
      const actual = Number(req.body?.actualUnits);
      const out = await runMeteredOperation(
        {
          userId: u.userId, planId: u.planId || "free",
          productId: "demo", action: "demo_op",
          estimatedUnits: estimate,
          grantId: req.body?.grantId, idempotencyKey: req.body?.idempotencyKey,
        },
        async () => ({ units: Number.isFinite(actual) ? actual : estimate, result: { ran: true } })
      );
      return res.status(out.ok ? 200 : out.status || 402).json(out);
    } catch (err) {
      // Keep raw error detail server-side; never echo err.message to the client
      // (info-disclosure). Client gets only the stable code.
      console.error("[MeterDemo] Metered operation error:", err);
      return res.status(500).json({ error: "meter_demo_error" });
    }
  });
  return router;
}
