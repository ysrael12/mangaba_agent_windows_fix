// Branding: exibe TODOS os modelos sob a marca Mangaba na interface.
// Mantém o ID real (qwen2.5:7b-instruct, llama3.2:3b, …) por baixo — só o
// rótulo mostrado ao usuário muda. Assim a troca de modelo continua funcionando.

const BRAND_MAP: Record<string, string> = {
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

  // Já é um modelo "mangaba-*" não mapeado → title-case do restante.
  if (id.startsWith("mangaba")) {
    const rest = id
      .replace(/^mangaba[-_]?/, "")
      .replace(/[-_:]/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return rest ? `Mangaba ${rest}` : "Mangaba";
  }

  // Genérico: usa o tamanho (ex. 7b) se houver; senão limpa o nome do fornecedor.
  const size = id.match(/(\d+(?:\.\d+)?b)\b/);
  if (size) return `Mangaba ${size[1].toUpperCase()}`;
  return `Mangaba ${raw}`;
}
