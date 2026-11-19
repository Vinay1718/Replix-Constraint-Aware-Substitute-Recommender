import apiClient from "./apiClient";
export default {
  place: (payload) => apiClient.post("/orders", payload),
  list: (params) => apiClient.get("/orders", { params }),
  get: (id) => apiClient.get(`/orders/${id}`),
  cancel: (id) => apiClient.post(`/orders/${id}/cancel`),
};
