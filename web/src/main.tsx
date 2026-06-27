import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App";
import { SystemActionsProvider } from "./contexts/SystemActions";
import { I18nProvider } from "./i18n";
import { exposePluginSDK } from "./plugins";
import { ThemeProvider } from "./themes";
import { MANGABA_BASE_PATH } from "./lib/api";

// Expose the plugin SDK before rendering so plugins loaded via <script>
// can access React, components, etc. immediately.
exposePluginSDK();

// Cliente de dados: cache + revalidação automática (foco/reconexão), com
// staleTime curto para o dashboard refletir mudanças rapidamente.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={MANGABA_BASE_PATH || undefined}>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <SystemActionsProvider>
            <App />
          </SystemActionsProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  </BrowserRouter>,
);
