/**
 * Kelly Criterion Calculator (Single Binary Bet)
 *
 * We assume:
 * - You bet a fraction f of your bankroll.
 * - With probability p you win, with probability q = 1 - p you lose.
 * - If you win, you gain b * f of your bankroll (net profit), where b is "net odds".
 *   Example: Decimal odds D=2.10 => net odds b = D - 1 = 1.10
 * - If you lose, you lose your stake: -f of bankroll.
 *
 * Full Kelly fraction:
 *   f* = (b*p - q) / b
 *
 * Many people apply "fractional Kelly":
 *   f_applied = k * f*
 * where k is in [0, 1] (e.g., 0.5 for half-Kelly).
 */

// ------------------------
// DOM helper
// ------------------------
const $ = (id) => document.getElementById(id);

// Inputs
const bankrollEl = $("bankroll");
const pEl = $("p");
const pFormatEl = $("pFormat");
const oddsEl = $("odds");
const oddsFormatEl = $("oddsFormat");
const fractionalEl = $("fractional");
const fractionalLabelEl = $("fractionalLabel");

// Outputs
const bOut = $("bOut");
const qOut = $("qOut");
const kellyOut = $("kellyOut");
const appliedOut = $("appliedOut");
const stakeOut = $("stakeOut");
const growthOut = $("growthOut");
const breakdownEl = $("breakdown");

// Buttons
const exampleBtn = $("example");
const resetBtn = $("reset");

// ------------------------
// Parsing helpers
// ------------------------

/**
 * Convert probability input into a decimal p in (0,1).
 * Supports:
 * - decimal format: 0.55
 * - percent format: 55
 */
function parseProbability(value, format) {
  const x = Number(value);
  if (!Number.isFinite(x)) return null;

  if (format === "percent") {
    return x / 100;
  }
  return x;
}

/**
 * Convert odds input into "net odds" b (profit per 1 unit staked).
 * - Decimal odds D => b = D - 1
 * - Fractional odds A/B => b = A/B
 * Returns null if invalid.
 */
function parseNetOdds(oddsStr, format) {
  const s = String(oddsStr).trim();
  if (!s) return null;

  if (format === "decimal") {
    const D = Number(s);
    // Decimal odds must be > 1.0 (otherwise you can’t win profit)
    if (!Number.isFinite(D) || D <= 1) return null;
    return D - 1;
  }

  // Fractional odds like "11/10"
  // Net odds b = 11/10 = 1.1
  const parts = s.split("/");
  if (parts.length !== 2) return null;

  const A = Number(parts[0].trim());
  const B = Number(parts[1].trim());
  if (!Number.isFinite(A) || !Number.isFinite(B) || B <= 0 || A <= 0) return null;

  return A / B;
}

/**
 * Format decimals nicely (avoid too many digits).
 */
function fmt(x, digits = 4) {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  return Number(x).toFixed(digits);
}

/**
 * Clamp a number to [min, max].
 */
function clamp(x, min, max) {
  return Math.min(max, Math.max(min, x));
}

// ------------------------
// Core Kelly math
// ------------------------

/**
 * Full Kelly fraction f* for a binary bet.
 * f* = (b*p - q)/b where q = 1 - p
 *
 * NOTE: f* can be negative (meaning "don't bet" if you require positive f).
 */
function kellyFraction(p, b) {
  const q = 1 - p;
  return (b * p - q) / b;
}

/**
 * Expected log growth per bet (Kelly objective) if you bet fraction f.
 * g(f) = p*ln(1 + f*b) + q*ln(1 - f)
 *
 * - If you win: bankroll multiplies by (1 + f*b)
 * - If you lose: bankroll multiplies by (1 - f)
 *
 * Returns null if invalid (e.g., log of non-positive).
 */
function expectedLogGrowth(p, b, f) {
  const q = 1 - p;

  const winFactor = 1 + f * b; // must be > 0
  const loseFactor = 1 - f;    // must be > 0

  if (winFactor <= 0 || loseFactor <= 0) return null;

  return p * Math.log(winFactor) + q * Math.log(loseFactor);
}

// ------------------------
// UI update
// ------------------------

function update() {
  // Read inputs
  const p = parseProbability(pEl.value, pFormatEl.value);
  const b = parseNetOdds(oddsEl.value, oddsFormatEl.value);
  const k = Number(fractionalEl.value); // fractional Kelly multiplier
  fractionalLabelEl.textContent = `${k.toFixed(2)}×`;

  // Validate p and b
  const problems = [];

  if (p === null || !Number.isFinite(p)) problems.push("Probability (p) is missing or not a number.");
  if (p !== null && (p <= 0 || p >= 1)) problems.push("Probability (p) must be between 0 and 1 (exclusive).");

  if (b === null || !Number.isFinite(b)) problems.push("Odds are missing/invalid (check format).");
  if (b !== null && b <= 0) problems.push("Net odds (b) must be > 0.");

  // If invalid, clear outputs + show error in breakdown
  if (problems.length > 0) {
    bOut.textContent = "—";
    qOut.textContent = "—";
    kellyOut.textContent = "—";
    appliedOut.textContent = "—";
    stakeOut.textContent = "—";
    growthOut.textContent = "—";

    breakdownEl.textContent =
      "Fix these input issues:\n- " + problems.join("\n- ");
    return;
  }

  // Compute q
  const q = 1 - p;

  // Compute full Kelly f*
  const fStar = kellyFraction(p, b);

  // Many calculators clamp negative f* to 0 (meaning "don't bet")
  // We'll show the raw value AND apply a clamp for actual stake guidance.
  const fStarClamped = Math.max(0, fStar);

  // Apply fractional Kelly multiplier k (0..1)
  const fAppliedRaw = k * fStarClamped;

  // Safety: betting fraction f must be < 1 to avoid losing more than bankroll.
  // We'll clamp it to [0, 0.9999] just to avoid log(0) cases and nonsense stakes.
  const fApplied = clamp(fAppliedRaw, 0, 0.9999);

  // Optional bankroll -> stake
  const bankroll = bankrollEl.value === "" ? null : Number(bankrollEl.value);
  const stake = (bankroll !== null && Number.isFinite(bankroll) && bankroll > 0)
    ? bankroll * fApplied
    : null;

  // Expected log growth
  const g = expectedLogGrowth(p, b, fApplied);

  // Write outputs
  bOut.textContent = fmt(b, 4);
  qOut.textContent = fmt(q, 4);
  kellyOut.textContent = `${fmt(fStar, 4)} (raw), ${fmt(fStarClamped, 4)} (clamped ≥ 0)`;
  appliedOut.textContent = fmt(fApplied, 4);

  stakeOut.textContent = stake === null
    ? "Enter bankroll to compute"
    : `${fmt(stake, 2)} (units)`;

  growthOut.textContent = g === null ? "—" : fmt(g, 6);

  // Build breakdown text
  const lines = [];

  lines.push("Step-by-step:");
  lines.push("");
  lines.push(`1) Parse probability: p = ${p}  =>  q = 1 - p = ${q}`);
  lines.push("");
  lines.push("2) Convert odds -> net odds (b):");
  if (oddsFormatEl.value === "decimal") {
    lines.push(`   Decimal odds D = ${oddsEl.value.trim()}`);
    lines.push(`   Net odds b = D - 1 = ${b}`);
  } else {
    lines.push(`   Fractional odds = ${oddsEl.value.trim()}`);
    lines.push(`   Net odds b = A/B = ${b}`);
  }
  lines.push("");
  lines.push("3) Full Kelly fraction (raw):");
  lines.push("   f* = (b*p - q) / b");
  lines.push(`      = (${b} * ${p} - ${q}) / ${b}`);
  lines.push(`      = ${fStar}`);
  lines.push("");
  lines.push("4) Clamp negative Kelly to 0 (common practical rule):");
  lines.push(`   f*_clamped = max(0, f*) = ${fStarClamped}`);
  lines.push("");
  lines.push("5) Apply fractional Kelly multiplier k:");
  lines.push(`   k = ${k}`);
  lines.push(`   f_applied_raw = k * f*_clamped = ${k} * ${fStarClamped} = ${fAppliedRaw}`);
  lines.push(`   f_applied = clamp(f_applied_raw, 0, 0.9999) = ${fApplied}`);
  lines.push("");
  lines.push("6) If bankroll provided, compute stake:");
  if (stake === null) {
    lines.push("   bankroll not provided -> stake not computed");
  } else {
    lines.push(`   stake = bankroll * f_applied = ${bankroll} * ${fApplied} = ${stake}`);
  }
  lines.push("");
  lines.push("7) Expected log growth per bet (Kelly objective):");
  lines.push("   g(f) = p*ln(1 + f*b) + q*ln(1 - f)");
  if (g === null) {
    lines.push("   Not computable (invalid log factors).");
  } else {
    lines.push(`   g = ${p}*ln(1 + ${fApplied}*${b}) + ${q}*ln(1 - ${fApplied})`);
    lines.push(`     = ${g}`);
  }

  // Extra note about negative edge
  if (fStar <= 0) {
    lines.push("");
    lines.push("Note:");
    lines.push("Your inputs imply no positive edge (f* <= 0). Kelly recommends not betting (stake = 0).");
  }

  breakdownEl.textContent = lines.join("\n");
}

// ------------------------
// Events
// ------------------------
[pEl, pFormatEl, oddsEl, oddsFormatEl, bankrollEl, fractionalEl].forEach((el) => {
  el.addEventListener("input", update);
  el.addEventListener("change", update);
});

exampleBtn.addEventListener("click", () => {
  // A common demo example:
  // p = 0.55, decimal odds 2.10 -> b = 1.10
  // Kelly f* = (1.10*0.55 - 0.45)/1.10
  bankrollEl.value = "1000";
  pEl.value = "0.55";
  pFormatEl.value = "decimal";
  oddsEl.value = "2.10";
  oddsFormatEl.value = "decimal";
  fractionalEl.value = "0.50"; // half-Kelly for a safer demo
  update();
});

resetBtn.addEventListener("click", () => {
  bankrollEl.value = "";
  pEl.value = "";
  pFormatEl.value = "decimal";
  oddsEl.value = "";
  oddsFormatEl.value = "decimal";
  fractionalEl.value = "1";
  update();
});

// Initial render
update();
