import apiClient from "./apiClient";

const toQueryParams = ({ search, category, inStockOnly } = {}) => {
  const params = {};
  if (search?.trim()) params.search = search.trim();
  if (category && category !== "all") params.category = category;
  if (inStockOnly) params.inStockOnly = true;
  return params;
};

export default {
  list: (filters) => apiClient.get("/products", { params: toQueryParams(filters) }),
  getById: (id) => apiClient.get(`/products/${id}`),
  getCategories: () => apiClient.get("/products/categories"),
};
