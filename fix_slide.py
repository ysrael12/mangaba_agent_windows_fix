import re
path = r"C:\Users\smart\Desktop\Projetos\lab mangaba\mangaba-agent\web\src\components\wizard\slides\Slide1Model.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# Replace import
text = text.replace("import { useEffect, useState } from \"react\";", "import { useState } from \"react\";")
text = text.replace("import { Spinner } from \"@dheiver2/ui/ui/components/spinner\";\n", "")
text = text.replace("import { Spinner } from \"@dheiver2/ui/ui/components/spinner\";", "")

# Replace export function slide1IsValid to function slide1IsValid
text = text.replace("export function slide1IsValid", "function slide1IsValid")

# Replace loading state and useEffect
text = re.sub(r"  const \[loading, setLoading\].*?\}\);\r?\n", "  const [pickerOpen, setPickerOpen] = useState(false);\n", text, flags=re.DOTALL)

# Replace JSX loading condition
old_jsx = """          {loading ? (
            <Spinner className="mt-1" />
          ) : (
            <p className="truncate text-base font-medium text-text-primary">
              {draft.model_config.model ? brandModel(draft.model_config.model) : "Nenhum modelo configurado"}
              {draft.model_config.provider && (
                <span className="ml-1.5 text-sm text-text-tertiary">\u00b7 {draft.model_config.provider}</span>
              )}
            </p>
          )}"""

new_jsx = """          <p className="truncate text-base font-medium text-text-primary">
            {draft.model_config.model ? brandModel(draft.model_config.model) : "Nenhum modelo configurado"}
            {draft.model_config.provider && (
              <span className="ml-1.5 text-sm text-text-tertiary">\u00b7 {draft.model_config.provider}</span>
            )}
          </p>"""

# Normalize line endings to do simple replacement
text_norm = text.replace("\r\n", "\n")
old_jsx_norm = old_jsx.replace("\r\n", "\n")
new_jsx_norm = new_jsx.replace("\r\n", "\n")

if old_jsx_norm in text_norm:
    text_norm = text_norm.replace(old_jsx_norm, new_jsx_norm)
else:
    # If not found, use a slightly looser regex
    text_norm = re.sub(r"\{loading \? \(.*?Spinner.*?\) : \(\s*(<p class.*?/p>)\s*\)\}", r"\\1", text_norm, flags=re.DOTALL)

with open(path, "w", encoding="utf-8") as f:
    f.write(text_norm)

print("Slide1Model fixed successfully")

