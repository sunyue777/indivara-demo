/**
 * ============================================================
 * fix-data.js
 * ============================================================
 * One-time data migration script. Run from project root:
 *   node scripts/fix-data.js
 *
 * What it does (in order):
 *   1. Trims clients_list.json and clients_detail.json so only RAMPVERIMG
 *      clients remain (other RMs were never used in the demo).
 *   2. Recomputes risk_check for every client using a strict tier hierarchy:
 *        Conservative(1) < ModConservative(2) < Moderate(3)
 *        < ModAggressive(4) < Aggressive(5)
 *      A holding is mismatch iff product_tier > client_tier (NOT >=).
 *      This fixes a prior bug where Moderately Aggressive clients holding
 *      Aggressive products were silently allowed.
 *   3. Renames the REBALANCE flag/label/banner-key/suggestion-key to
 *      RISK_MISMATCH everywhere, since the new logic is genuinely a
 *      suitability check, not a portfolio drift check.
 *   4. Recomputes priority_flags so every client whose risk_check is
 *      mismatch carries the RISK_MISMATCH flag (and removes it from
 *      clients without mismatches).
 *   5. Rewrites the inline suggestion strings under the renamed key.
 *
 * Talking-points-pool keys are also renamed REBALANCE -> RISK_MISMATCH
 * so existing LLM-generated content carries through. The source-of-truth
 * frontend constants must also be updated to use RISK_MISMATCH (see
 * pages/index.js and pages/detail.js).
 */

const fs = require('fs');
const path = require('path');

const LIST_PATH   = path.join(__dirname, '..', 'public', 'data', 'clients_list.json');
const DETAIL_PATH = path.join(__dirname, '..', 'public', 'data', 'clients_detail.json');

const TARGET_RM = 'RAMPVERIMG';

// Strict tier hierarchy. Anything not in this map is treated as unknown.
const TIER = {
  'Conservative': 1,
  'Moderately Conservative': 2,
  'Moderate': 3,
  'Moderately Aggressive': 4,
  'Aggressive': 5,
};

const OLD_FLAG = 'REBALANCE';
const NEW_FLAG = 'RISK_MISMATCH';
const NEW_LABEL = 'Risk Mismatch';

function recomputeRiskCheck(detail) {
  const clientRiskName = detail.summary?.risk_profile;
  const clientTier = TIER[clientRiskName];

  // No assessed risk profile → cannot evaluate
  if (!clientTier) {
    return {
      status: 'unknown',
      client_risk: clientRiskName || 'Not assessed',
      mismatches: [],
    };
  }

  const portfolio = detail.portfolio || [];
  const mismatches = [];

  for (const h of portfolio) {
    const productTier = TIER[h.risk_level];
    if (!productTier) {
      h.risk_status = 'unknown';
      continue;
    }
    if (productTier > clientTier) {
      // Strict: a Mod Aggressive (4) client holding Aggressive (5) IS a mismatch
      h.risk_status = 'mismatch';
      mismatches.push({
        product_name: h.product_name,
        product_risk: h.risk_level,
        gap: productTier - clientTier,
      });
    } else {
      h.risk_status = 'aligned';
    }
  }

  return {
    status: mismatches.length > 0 ? 'mismatch' : 'aligned',
    client_risk: clientRiskName,
    mismatches,
  };
}

function renameFlagInArray(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(f => (f === OLD_FLAG ? NEW_FLAG : f));
}

function renameKeyInObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Object.prototype.hasOwnProperty.call(obj, OLD_FLAG)) {
    obj[NEW_FLAG] = obj[OLD_FLAG];
    delete obj[OLD_FLAG];
  }
  return obj;
}

function rebuildSuggestionForMismatch(detail) {
  // Build a short, deterministic suggestion string from the worst mismatch.
  const rc = detail.risk_check;
  if (!rc || rc.status !== 'mismatch' || !rc.mismatches?.length) return null;
  const worst = [...rc.mismatches].sort((a, b) => b.gap - a.gap)[0];
  const tierWord = worst.gap > 1 ? `+${worst.gap} tiers` : `+${worst.gap} tier`;
  return `${worst.product_name} (${worst.product_risk}) exceeds ${rc.client_risk} tolerance by ${tierWord}.`;
}

function main() {
  console.log('Loading data files...');
  const list = JSON.parse(fs.readFileSync(LIST_PATH, 'utf-8'));
  const detail = JSON.parse(fs.readFileSync(DETAIL_PATH, 'utf-8'));

  const beforeListCount = list.clients.length;
  const beforeDetailCount = Object.keys(detail).length;

  // 1. Trim to RAMPVERIMG only
  list.clients = list.clients.filter(c => c.sales_code === TARGET_RM);
  for (const cid of Object.keys(detail)) {
    if (detail[cid].sales_code !== TARGET_RM) delete detail[cid];
  }
  console.log(`Trimmed list:   ${beforeListCount} -> ${list.clients.length}`);
  console.log(`Trimmed detail: ${beforeDetailCount} -> ${Object.keys(detail).length}`);

  // 2-4. Per-client recompute
  let mismatchCount = 0;
  let alignedCount = 0;
  let unknownCount = 0;

  // Keep a quick lookup of detail keyed by customer_id so we can sync back to list
  for (const cid of Object.keys(detail)) {
    const det = detail[cid];

    // Recompute risk_check (mutates portfolio risk_status in place)
    det.risk_check = recomputeRiskCheck(det);
    if (det.risk_check.status === 'mismatch') mismatchCount++;
    else if (det.risk_check.status === 'aligned') alignedCount++;
    else unknownCount++;

    // Rename flag in arrays
    det.priority_flags = renameFlagInArray(det.priority_flags);
    if (Array.isArray(det.flag_labels)) {
      // Replace the label too
      const idx = det.priority_flags.indexOf(NEW_FLAG);
      if (idx >= 0) {
        // recompute labels in-sync; we rebuild based on flag list to be safe
      }
    }

    // Rename keys in banners + talking_points_pool + suggestions
    renameKeyInObject(det.banners);
    renameKeyInObject(det.talking_points_pool);
    renameKeyInObject(det.suggestions);
    if (det.talking_points_pool && det.talking_points_pool[NEW_FLAG]) {
      det.talking_points_pool[NEW_FLAG].tag = NEW_FLAG;
    }

    // Recompute priority_flags membership for RISK_MISMATCH based on
    // the *new* risk_check result (not the old REBALANCE rule).
    const hasMismatch = det.risk_check.status === 'mismatch';
    const flags = new Set(det.priority_flags || []);
    if (hasMismatch) flags.add(NEW_FLAG);
    else flags.delete(NEW_FLAG);

    // Stable order: GROWTH > UPSELL > RISK_MISMATCH > CROSSSELL
    const ORDER = ['GROWTH', 'UPSELL', NEW_FLAG, 'CROSSSELL'];
    det.priority_flags = ORDER.filter(f => flags.has(f));

    // Regenerate flag_labels in lockstep
    const LABEL_MAP = {
      GROWTH: 'Growth Opportunity',
      UPSELL: 'Up-sell Opportunity',
      CROSSSELL: 'Cross-sell Opportunity',
      [NEW_FLAG]: NEW_LABEL,
    };
    det.flag_labels = det.priority_flags.map(f => LABEL_MAP[f] || f);

    // Rebuild RISK_MISMATCH suggestion deterministically (fresh & accurate)
    if (hasMismatch) {
      const sug = rebuildSuggestionForMismatch(det);
      if (sug) {
        if (!det.suggestions) det.suggestions = {};
        det.suggestions[NEW_FLAG] = sug;
      }
      // Also rebuild banner so the "why on this list" panel reflects the
      // new strict logic (uses first sentence-ish).
      const worst = [...det.risk_check.mismatches].sort((a, b) => b.gap - a.gap)[0];
      const firstName = (det.summary?.name || '').split(' ')[0] || 'this client';
      if (!det.banners) det.banners = {};
      det.banners[NEW_FLAG] =
        `${firstName} is rated ${det.risk_check.client_risk}, but holds ${worst.product_name} ` +
        `which is rated ${worst.product_risk} — ${worst.gap} tier${worst.gap > 1 ? 's' : ''} above ` +
        `their assessed tolerance. A suitability review is warranted before the next conversation.`;
    } else {
      // Drop stale RISK_MISMATCH content if no longer applicable
      if (det.suggestions) delete det.suggestions[NEW_FLAG];
      if (det.banners) delete det.banners[NEW_FLAG];
    }
  }

  console.log(`\nRisk-check distribution (RAMPVERIMG):`);
  console.log(`  mismatch: ${mismatchCount}`);
  console.log(`  aligned:  ${alignedCount}`);
  console.log(`  unknown:  ${unknownCount}`);

  // 5. Sync clients_list.json from refreshed detail
  // For each list row, copy over priority_flags, default_suggestion, suggestions
  const ORDER = ['GROWTH', 'UPSELL', NEW_FLAG, 'CROSSSELL'];
  let listMismatchFlagged = 0;
  for (const c of list.clients) {
    const det = detail[c.customer_id];
    if (!det) continue;
    c.priority_flags = det.priority_flags;
    c.suggestions = det.suggestions || {};
    // default_suggestion = first available by priority order
    c.default_suggestion = '';
    for (const p of ORDER) {
      if (c.priority_flags.includes(p) && c.suggestions[p]) {
        c.default_suggestion = c.suggestions[p];
        break;
      }
    }
    // Refresh max_gap on the list row to support sorting under the new flag
    c.max_gap = det.risk_check?.mismatches?.length
      ? Math.max(...det.risk_check.mismatches.map(m => m.gap))
      : 0;
    if (c.priority_flags.includes(NEW_FLAG)) listMismatchFlagged++;
  }
  console.log(`\nlist rows tagged ${NEW_FLAG}: ${listMismatchFlagged}`);

  // Write back
  fs.writeFileSync(LIST_PATH, JSON.stringify(list));
  fs.writeFileSync(DETAIL_PATH, JSON.stringify(detail));
  console.log(`\nWrote ${LIST_PATH}`);
  console.log(`Wrote ${DETAIL_PATH}`);
  console.log('\nDone.');
}

main();
