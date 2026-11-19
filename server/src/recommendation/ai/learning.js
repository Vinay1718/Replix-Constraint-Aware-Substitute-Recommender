import { scorePreference } from "../rankingEngine/scorers/preference.js";
import { clamp01, round4 } from "../rankingEngine/math.js";
import { norm } from "../rankingEngine/text.js";

/**
 * Turns raw history rows into plain signals (pure, no database).
 *  userDecisions: [{ brand, decision: "accepted"|"rejected" }]   this user's past choices
 *  ratings:       [{ productId, avg, count }]                     feedback per substitute (all users)
 *  pairs:         [{ substituteId, accepted, rejected }]          outcomes for THIS original (all users)
 */
export const buildSignals = ({ userDecisions = [], ratings = [], pairs = [] } = {}) => {
  const tally = new Map();
  for (const d of userDecisions) {
    if (!d?.brand) continue;
    const key = norm(d.brand);
    const t = tally.get(key) ?? { accepted: 0, rejected: 0 };
    if (d.decision === "accepted") t.accepted++;
    else if (d.decision === "rejected") t.rejected++;
    tally.set(key, t);
  }
  // -1..1, shrunk toward 0 when there is little evidence
  const brandAffinity = new Map(
    [...tally].map(([brand, t]) => [brand, (t.accepted - t.rejected) / (t.accepted + t.rejected + 1)])
  );
  return {
    brandAffinity,
    ratings: new Map(ratings.map((r) => [String(r.productId), { avg: r.avg, count: r.count }])),
    pairs: new Map(pairs.map((p) => [String(p.substituteId), { accepted: p.accepted, rejected: p.rejected }])),
    userDecisionCount: userDecisions.length,
  };
};

const PRIOR_RATING = 3;
const PRIOR_WEIGHT = 3; // acts like 3 neutral ratings, so one 5-star review is not decisive

/**
 * Preference scorer that learns from feedback and accept/reject history.
 * Blends the rule-based preference score with the learned score. When there
 * is no evidence at all, the rule-based result is returned unchanged.
 */
export const createLearnedPreferenceScorer = ({ signals, weight = 0.3, base = scorePreference }) => {
  const w = clamp01(weight);
  return (candidate, ctx) => {
    const baseResult = base(candidate, ctx);
    const id = candidate.product.id;

    const affinity = signals.brandAffinity.get(norm(candidate.product.brand));
    const rating = signals.ratings.get(id);
    const pair = signals.pairs.get(id);

    const parts = [];
    if (affinity !== undefined) parts.push((affinity + 1) / 2);
    if (rating) {
      const shrunk = (rating.avg * rating.count + PRIOR_RATING * PRIOR_WEIGHT) / (rating.count + PRIOR_WEIGHT);
      parts.push((shrunk - 1) / 4);
    }
    if (pair && pair.accepted + pair.rejected > 0) parts.push((pair.accepted + 1) / (pair.accepted + pair.rejected + 2));

    if (parts.length === 0) {
      return { score: baseResult.score, details: { ...baseResult.details, learned: { used: false } } };
    }
    const learned = parts.reduce((a, b) => a + b, 0) / parts.length;
    return {
      score: clamp01((1 - w) * baseResult.score + w * learned),
      details: {
        ...baseResult.details,
        learned: {
          used: true,
          score: round4(learned),
          weight: w,
          brandAffinity: affinity ?? null,
          rating: rating ?? null,
          pair: pair ?? null,
        },
      },
    };
  };
};
