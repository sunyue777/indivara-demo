/**
 * ============================================================
 * generate-llm-content.js
 * ============================================================
 *
 * One-time script that calls OpenAI (GPT-4o-mini by default) to
 * generate personalized talking points and banner text for every
 * client in clients_detail.json. Output overwrites the talking_points_pool
 * and banners fields in clients_detail.json with LLM-generated content.
 *
 * Run from project root:
 *   OPENAI_API_KEY=sk-... node scripts/generate-llm-content.js
 *
 * Optional flags:
 *   --limit=10        only process first 10 clients (for testing)
 *   --model=gpt-4o    use a different OpenAI model (default: gpt-4o-mini)
 *   --resume          skip clients that already have llm_generated=true
 *   --rm=RAMPVERIMG   only process one specific RM
 *
 * Cost estimate (GPT-4o-mini, 3909 clients):
 *   ~$1.00 USD total. Takes ~30-60 minutes due to API rate limits.
 *
 * The script writes progress every 50 clients so you can interrupt
 * and resume later with --resume.
 */

const fs = require('fs');
const path = require('path');

// ---- Config ----
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.replace(/^--/, '').split('=');
  acc[k] = v ?? true;
  return acc;
}, {});

const MODEL = args.model || 'gpt-4o-mini';
const LIMIT = args.limit ? parseInt(args.limit, 10) : null;
const RESUME = !!args.resume;
const RM_FILTER = args.rm || null;

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is required.');
  console.error('Run: OPENAI_API_KEY=sk-... node scripts/generate-llm-content.js');
  process.exit(1);
}

const DETAIL_PATH = path.join(__dirname, '..', 'public', 'data', 'clients_detail.json');
const LIST_PATH   = path.join(__dirname, '..', 'public', 'data', 'clients_list.json');

// ---- Prompt builder ----
function buildPrompt(detail) {
  const s = detail.summary;
  const portfolio = (detail.portfolio || []).slice(0, 10).map(h => ({
    name: h.product_name,
    category: h.category,
    risk_level: h.risk_level,
    value: h.value,
    pct_of_aum: h.pct_of_aum,
  }));
  const flags = detail.priority_flags || [];
  const labels = detail.flag_labels || [];
  const risk = detail.risk_check || {};
  const q = detail.questionnaire || {};

  const clientCtx = {
    name: s.name,
    age: s.age,
    gender: s.gender,
    profession: s.profession,
    marital_status: s.marital_status,
    income_bracket: s.income,
    location: s.location,
    risk_profile: s.risk_profile,
    total_aum_php: s.total_aum,
    holdings_count: s.holdings_count,
    days_to_birthday: s.days_to_birthday,
    portfolio,
    risk_alignment: risk,
    triggered_tags: flags.map((f, i) => ({ tag: f, label: labels[i] })),
    questionnaire: q,
  };

  return [
    {
      role: 'system',
      content: `You are a senior wealth-management assistant for ATRAM Funds in the Philippines.
You help Relationship Managers (RMs) prepare for client conversations.

Output STRICT JSON only — no prose, no markdown fences. The JSON must match this shape:

{
  "talking_points": [
    {
      "tag": "<one of: REBALANCE, UPSELL, CROSSSELL, GROWTH, BIRTHDAY, LIFESTAGE, PROFESSION, FAMILY, CONTEXT, CONCENTRATION>",
      "icon": "<one of: risk, concentration, diversify, opportunity, horizon, aligned>",
      "title": "<3-5 word headline>",
      "body": "<2-3 sentence insight, max 60 words. Reference specific peso amounts, fund names, percentages from the input. End with a clear suggested action.>"
    }
    // 4 to 6 items total — give the RM rich choice
  ],
  "banners": {
    // Include ONE banner per triggered tag in the input. Each banner is a personalized
    // 1-2 sentence story explaining "why this client is on this list", written in the
    // RM's voice. Use the client's first name. Be specific with numbers and fund names.
    // Keys: "GROWTH", "UPSELL", "REBALANCE", "CROSSSELL"
    "<TAG>": "<personalized 1-2 sentence story>"
  }
}

Rules:
- Currency is Philippine Peso (₱). Use thousand separators.
- Reference SPECIFIC fund names and peso amounts from the input — never speak in generalities.
- If risk_alignment.status is "mismatch", include a REBALANCE talking point as one of the items.
- Birthday in next 7 days → include a BIRTHDAY talking point.
- Generate 4-6 talking points so the system can pick the most relevant 3 per tab context.
- Write in professional RM-to-RM tone, not customer-facing.
- Each talking_point.body must end with an action verb ("Suggest...", "Discuss...", "Highlight...", "Propose...").
- Banners must use the client's first name and feel personal, not templated.`
    },
    {
      role: 'user',
      content: `Client data:\n${JSON.stringify(clientCtx, null, 2)}`
    }
  ];
}

// ---- OpenAI call ----
async function callOpenAI(messages, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 300)}`);
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response');
      return JSON.parse(content);
    } catch (err) {
      console.error(`  Attempt ${attempt + 1} failed: ${err.message}`);
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }
}

// ---- Main ----
async function main() {
  console.log(`Loading ${DETAIL_PATH}...`);
  const detail = JSON.parse(fs.readFileSync(DETAIL_PATH, 'utf-8'));

  let entries = Object.entries(detail);
  if (RM_FILTER) {
    entries = entries.filter(([_, d]) => d.sales_code === RM_FILTER);
    console.log(`Filtered to ${entries.length} clients in ${RM_FILTER}`);
  }
  if (RESUME) {
    const before = entries.length;
    entries = entries.filter(([_, d]) => !d.llm_generated);
    console.log(`Resume: skipping ${before - entries.length} already-generated clients`);
  }
  if (LIMIT) {
    entries = entries.slice(0, LIMIT);
    console.log(`Limited to first ${LIMIT} clients`);
  }

  console.log(`Will process ${entries.length} clients with ${MODEL}`);
  console.log('---');

  let processed = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const [cid, d] of entries) {
    processed++;
    const name = d.summary?.name || cid;
    process.stdout.write(`[${processed}/${entries.length}] ${name.slice(0, 30).padEnd(30)} ... `);

    try {
      const messages = buildPrompt(d);
      const result = await callOpenAI(messages);

      // Convert talking_points array → talking_points_pool dict
      // (the frontend reads pool keyed by tag)
      const pool = {};
      if (Array.isArray(result.talking_points)) {
        for (const tp of result.talking_points) {
          if (tp.tag) pool[tp.tag] = tp;
        }
      }

      // Update detail object
      d.talking_points_pool = pool;
      d.banners = result.banners || {};
      d.llm_generated = true;

      console.log('OK');
    } catch (err) {
      failed++;
      console.log(`FAIL (${err.message.slice(0, 60)})`);
    }

    // Save every 50 clients in case of interrupt
    if (processed % 50 === 0) {
      fs.writeFileSync(DETAIL_PATH, JSON.stringify(detail, null, 0));
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const eta = (entries.length - processed) / rate;
      console.log(`  ✓ Saved checkpoint. Rate: ${rate.toFixed(1)}/sec. ETA: ${(eta / 60).toFixed(1)} min`);
    }
  }

  // Final save
  fs.writeFileSync(DETAIL_PATH, JSON.stringify(detail, null, 0));

  // Also propagate updated suggestions to clients_list.json
  // (regenerate the contextual_suggestion strings from the new banners/talking points)
  console.log('\nSyncing clients_list.json with new banner/suggestion text...');
  const list = JSON.parse(fs.readFileSync(LIST_PATH, 'utf-8'));
  for (const c of list.clients) {
    const d = detail[c.customer_id];
    if (!d || !d.llm_generated) continue;
    // Build a short suggestion per tag from the banners (first sentence)
    const newSugs = {};
    for (const [tag, text] of Object.entries(d.banners || {})) {
      // Take first sentence as the inline suggestion
      const firstSentence = text.split(/[.!?]/)[0].trim();
      newSugs[tag] = firstSentence + '.';
    }
    if (Object.keys(newSugs).length > 0) {
      c.suggestions = { ...c.suggestions, ...newSugs };
      // Recompute default_suggestion using priority order
      for (const p of ['GROWTH','UPSELL','REBALANCE','CROSSSELL']) {
        if (c.priority_flags.includes(p) && newSugs[p]) {
          c.default_suggestion = newSugs[p];
          break;
        }
      }
    }
  }
  fs.writeFileSync(LIST_PATH, JSON.stringify(list, null, 0));

  console.log(`\nDone! Processed ${processed} clients (${failed} failed)`);
  console.log(`Time elapsed: ${((Date.now() - startTime) / 60000).toFixed(1)} min`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
