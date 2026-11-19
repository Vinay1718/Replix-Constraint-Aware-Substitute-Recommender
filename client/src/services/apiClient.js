import axios from "axios";
import { API_BASE_URL, AUTH_EVENTS, STORAGE_KEYS } from "../utils/constants";
import { storage } from "../utils/storage";

export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const STATUS_MESSAGES = {
  400: "The request was invalid.", 403: "You don't have permission to do that.", 404: "The requested resource was not found.",
  409: "That conflicts with existing data.", 422: "Some of the submitted data is invalid.", 500: "Something went wrong on our side. Please try again.",
};

const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 15000, headers: { "Content-Type": "application/json" } });

apiClient.interceptors.request.use((config) => {
  const token = storage.get(STORAGE_KEYS.TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    return body && typeof body === "object" && "data" in body ? body.data : body;
  },
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    let message;
    if (!error.response) {
      message = error.code === "ECONNABORTED" ? "The request timed out. Please try again." : "Cannot reach the server. Check your connection.";
    } else {
      message = body?.message || STATUS_MESSAGES[status] || "Request failed.";
    }
    if (status === 401 && storage.get(STORAGE_KEYS.TOKEN)) window.dispatchEvent(new Event(AUTH_EVENTS.UNAUTHORIZED));
    return Promise.reject(new ApiError(message, { status, details: body?.errors ?? null }));
  }
);

export default apiClient;
