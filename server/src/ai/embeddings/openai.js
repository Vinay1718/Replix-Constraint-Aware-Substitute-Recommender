const BATCH = 100;

export const createOpenAIProvider = ({ apiKey, model }) => {
  if (!apiKey) throw new Error("EMBEDDINGS_PROVIDER=openai requires OPENAI_API_KEY");
  return {
    name: "openai",
    model,
    async embed(texts) {
      const out = [];
      for (let i = 0; i < texts.length; i += BATCH) {
        const res = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, input: texts.slice(i, i + BATCH) }),
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error(`Embedding request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
        const json = await res.json();
        for (const row of [...json.data].sort((a, b) => a.index - b.index)) out.push(row.embedding);
      }
      return out;
    },
  };
};
