/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute backend origin for remote/standalone hosting (e.g. the dashboard
   * served from Vercel while the Mangaba FastAPI backend runs elsewhere behind
   * a public tunnel). Empty/unset = same-origin (served by the Python server).
   * Example: https://meu-gateway.trycloudflare.com
   */
  readonly VITE_API_BASE?: string;
  /**
   * Stable dashboard session token ($MANGABA_HOME/.dashboard_session_token).
   * Needed only for remote hosting, where the Python server can't inject
   * window.__MANGABA_SESSION_TOKEN__ into the static index.html.
   */
  readonly VITE_SESSION_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
