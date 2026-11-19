import { env } from "../../config/env.js";
import { localProvider } from "./localHash.js";
import { createOpenAIProvider } from "./openai.js";

let provider;
export const getEmbeddingProvider = () => {
  if (!provider) {
    provider = env.EMBEDDINGS_PROVIDER === "openai"
      ? createOpenAIProvider({ apiKey: env.OPENAI_API_KEY, model: env.EMBEDDINGS_MODEL })
      : localProvider;
  }
  return provider;
};
