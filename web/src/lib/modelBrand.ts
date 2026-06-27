// Branding: exibe TODOS os modelos sob a marca Mangaba na interface.
// Mantém o ID real (Qwen/Qwen2.5-7B-Instruct, meta-llama/Llama-3.3-70B…) por
// baixo — só o rótulo mostrado ao usuário muda. Assim a troca de modelo
// continua funcionando. Funciona com IDs do Hugging Face (Vendor/Modelo) e
// do Ollama (modelo:tag).

const BRAND_MAP: Record<string, string> = {
  // Hugging Face (formato Vendor/Modelo, em minúsculas)
  "qwen/qwen2.5-7b-instruct": "Mangaba Pro 7B",
  "qwen/qwen2.5-72b-instruct": "Mangaba Max 72B",
  "qwen/qwen2.5-coder-32b-instruct": "Mangaba Code 32B",
  "meta-llama/llama-3.3-70b-instruct": "Mangaba Ultra 70B",
  "meta-llama/llama-3.1-8b-instruct": "Mangaba Lite 8B",
  "deepseek-ai/deepseek-v3-0324": "Mangaba Reasoner",
  // Ollama (formato modelo:tag) — legado
  "mangaba-gemma": "Mangaba Gemma",
  "mangaba-gemma4": "Mangaba Gemma 4",
  "mangaba-7b": "Mangaba 7B",
  "qwen2.5:14b-instruct": "Mangaba Max 14B",
  "qwen2.5:7b-instruct": "Mangaba Pro 7B",
  "qwen2.5:3b-instruct": "Mangaba Rápido 3B",
  "qwen3:4b": "Mangaba 4B",
  "llama3.2:3b": "Mangaba Lite 3B",
  "gemma4:e4b": "Mangaba Edge 4B",
};

/** Rótulo Mangaba para um id de modelo. Sempre começa com "Mangaba". */
export function brandModel(raw: string | null | undefined): string {
  if (!raw) return "Mangaba";
  const id = raw.toLowerCase().replace(/:latest$/, "");
  if (BRAND_MAP[id]) return BRAND_MAP[id];

  // Remove o prefixo do fornecedor (ex.: "qwen/", "meta-llama/", "deepseek-ai/").
  const noVendor = id.includes("/") ? id.split("/").slice(-1)[0] : id;
  if (BRAND_MAP[noVendor]) return BRAND_MAP[noVendor];

  // Já é um modelo "mangaba-*" → title-case do restante.
  if (noVendor.startsWith("mangaba")) {
    const rest = noVendor
      .replace(/^mangaba[-_]?/, "")
      .replace(/[-_:]/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return rest ? `Mangaba ${rest}` : "Mangaba";
  }

  // Genérico: usa o tamanho (ex. 7b/70b) se houver.
  const size = noVendor.match(/(\d+(?:\.\d+)?b)\b/);
  if (size) return `Mangaba ${size[1].toUpperCase()}`;

  // Último recurso: nome limpo do modelo (sem fornecedor), com a marca.
  const clean = noVendor.replace(/[-_:]/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
  return `Mangaba ${clean}`;
}
