import apiClient from "./apiClient";
export default {
  register: (payload) => apiClient.post("/auth/register", payload),
  login: (payload) => apiClient.post("/auth/login", payload),
};
