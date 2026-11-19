import apiClient from "./apiClient";
export default {
  examples: () => apiClient.get("/demo/examples"),
  stats: () => apiClient.get("/demo/stats"),
  recommend: ({ productId, requirements, topN }) => apiClient.post("/demo/recommend", { productId, requirements, ...(topN && { topN }) }),
};
