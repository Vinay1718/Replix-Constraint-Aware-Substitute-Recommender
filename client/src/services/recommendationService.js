import apiClient from "./apiClient";
export default {
  getSubstitutes: ({ productId, requirements, quantity, topN }) =>
    apiClient.post("/recommendations", { productId, requirements, ...(quantity && { quantity }), ...(topN && { topN }) }),
  recordDecision: ({ originalProductId, substituteProductId, decision }) =>
    apiClient.post("/recommendations/decisions", { originalProductId, substituteProductId, decision }),
};
