import { env } from "../config/env.js";

const SYSTEM =
  "You write one or two short, friendly sentences explaining why a substitute product was recommended. " +
  "Use ONLY the facts in the JSON the user sends. Do not invent attributes, prices, ratings or claims. " +
  "Do not mention scores, JSON, or the word 'tags'. Plain text only.";

/**
 * Optional "smart explanation". The engine has already decided WHAT to recommend and
 * collected the verified facts; the model only rephrases them. Any failure, timeout,
 * or odd output returns null so the caller keeps the template sentence.
 */
export const llmExplain = async (facts) => {
  if (!env.AI_EXPLANATIONS || !env.ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: env.EXPLANATION_MODEL,
        max_tokens: 160,
        system: SYSTEM,
        messages: [{ role: "user", content: JSON.stringify(facts) }],
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.content?.find((b) => b.type === "text")?.text?.trim();
    return text && text.length >= 20 && text.length <= 500 ? text : null;
  } catch {
    return null;
  }
};
