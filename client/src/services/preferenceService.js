import apiClient from "./apiClient";
export default {
  get: () => apiClient.get("/preferences"),
  save: (payload) => apiClient.put("/preferences", payload),
};
