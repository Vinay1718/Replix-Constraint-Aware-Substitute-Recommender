import apiClient from "./apiClient";

const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null && v !== "all"));

export default {
  analytics: () => apiClient.get("/admin/analytics"),
  refreshEmbeddings: (force = false) => apiClient.post("/admin/ai/embeddings", { force }),

  listProducts: (params) => apiClient.get("/admin/products", { params: clean(params) }),
  createProduct: (data) => apiClient.post("/admin/products", data),
  updateProduct: (id, data) => apiClient.patch(`/admin/products/${id}`, data),
  deactivateProduct: (id) => apiClient.delete(`/admin/products/${id}`),
  updateInventory: (id, data) => apiClient.patch(`/admin/inventory/${id}`, data),

  listLabels: (params) => apiClient.get("/admin/labels", { params: clean(params) }),
  createLabel: (data) => apiClient.post("/admin/labels", data),
  updateLabel: (id, data) => apiClient.patch(`/admin/labels/${id}`, data),
  deleteLabel: (id) => apiClient.delete(`/admin/labels/${id}`),

  listOrders: (params) => apiClient.get("/admin/orders", { params: clean(params) }),
  updateOrderStatus: (id, status) => apiClient.patch(`/admin/orders/${id}/status`, { status }),

  listFeedback: (params) => apiClient.get("/admin/feedback", { params: clean(params) }),
};
