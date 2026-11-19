import { DECISIONS } from "../constants/index.js";
import { buildRankingEngine } from "../ai/engineFactory.js";
import { llmExplain } from "../ai/llmExplainer.js";
import { candidateSource, toEngineProduct } from "../repositories/candidate.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { recommendationRepository } from "../repositories/recommendation.repository.js";
import { applyConstraints, buildExplanation, createCandidateGenerator } from "../recommendation/index.js";
import { ApiError } from "../utils/ApiError.js";
import { toObjectId } from "../utils/objectId.js";
import { preferenceService } from "./preference.service.js";

const generator = createCandidateGenerator(candidateSource);

// Engine product (id) -> the shape the frontend already uses (_id)
const toClientProduct = (p) => ({
  _id: p.id, name: p.name, brand: p.brand, category: p.category, price: p.price,
  dietaryTags: p.dietaryTags, attributes: p.attributes, stock: p.stock,
});

export const recommendationService = {
  // user=null + persist=false is the public demo: rule-based only, nothing stored.
  async recommend(user, { productId, requirements, quantity = 1, topN }, { persist = true } = {}) {
    const oid = toObjectId(productId);
    const doc = oid && (await productRepository.findOneWithStock({ _id: oid }));
    if (!doc) throw ApiError.notFound("Product not found.");
    const original = toEngineProduct(doc);

    // Explicit requirements win; otherwise use the user's saved ones
    const reqInput = requirements ?? (user ? await preferenceService.get(user._id) : null) ?? {};

    // 1 + 2 + 3: candidates, then HARD constraints (rule-based only)
    const { candidates } = await generator.generate({ original });
    const constrained = applyConstraints({ candidates, original, requirements: reqInput, quantity });

    // 4 + 5: rank feasible products (rule-based, or hybrid when AI is enabled)
    const { engine, version, ai } = await buildRankingEngine({
      userId: user?._id ?? null,
      originalId: original.id,
      candidateIds: constrained.feasible.map((c) => c.product.id),
      topN,
    });
    const { ranked } = engine.rank({ original, feasible: constrained.feasible, requirements: constrained.requirements, quantity });

    // 6: explanations from verified facts, optionally rephrased by an LLM
    const items = await Promise.all(
      ranked.map(async (item) => {
        const { tags, explanation, facts } = buildExplanation({ original, item, requirements: constrained.requirements, quantity });
        const smart = await llmExplain(facts);
        return { item, tags, explanation: smart ?? explanation };
      })
    );

    // Log the run (for decisions, analytics, learning). Never fails the request.
    let recommendationId = null;
    if (persist && user) try {
      const saved = await recommendationRepository.create({
        user: user._id,
        originalProduct: oid,
        requirements: constrained.requirements,
        items: items.map(({ item, tags }) => ({
          product: toObjectId(item.product.id),
          rank: item.rank,
          similarityScore: item.similarityScore,
          preferenceScore: item.preferenceScore,
          finalScore: item.finalScore,
          explanationTags: tags,
          decision: DECISIONS.PENDING,
        })),
        stats: constrained.stats,
        engineVersion: version,
      });
      recommendationId = saved._id;
    } catch (err) {
      console.error("Could not store recommendation run:", err.message);
    }

    return {
      originalProductId: original.id,
      recommendationId,
      engineVersion: version,
      ai,
      recommendations: items.map(({ item, tags, explanation }) => ({
        product: toClientProduct(item.product),
        similarityScore: item.similarityScore,
        preferenceScore: item.preferenceScore,
        finalScore: item.finalScore,
        explanationTags: tags,
        explanation,
      })),
    };
  },

  async recordDecision(user, { originalProductId, substituteProductId, decision }) {
    const run = await recommendationRepository.recordDecision({
      user: user._id,
      originalProduct: toObjectId(originalProductId),
      substituteProduct: toObjectId(substituteProductId),
      decision,
    });
    if (!run) throw ApiError.notFound("No recommendation found for that product pair.");
    return { saved: true };
  },
};
