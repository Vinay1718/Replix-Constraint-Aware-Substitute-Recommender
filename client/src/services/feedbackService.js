import apiClient from "./apiClient";
export default { submit: (payload) => apiClient.post("/feedback", payload) };
