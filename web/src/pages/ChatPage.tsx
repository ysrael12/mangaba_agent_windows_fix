/**
 * Página de chat — conecta ao backend via /api/pty WebSocket.
 * O conteúdo real é renderizado pelo plugin ou pelo backend diretamente.
 * Este é um stub que placeholder enquanto a conexão é estabelecida.
 */
export default function ChatPage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "20px",
        backgroundColor: "var(--color-background-base)",
        color: "var(--color-text-secondary)",
      }}
    >
      <div style={{ fontSize: "18px", fontWeight: "600" }}>
        💬 Conversando com seu agente…
      </div>
      <p style={{ fontSize: "14px", opacity: 0.7, margin: 0 }}>
        O terminal do chat deve aparecer aqui. Se não aparecer, tente recarregar a página.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: "10px",
          padding: "8px 16px",
          backgroundColor: "var(--color-midground)",
          color: "var(--color-background-base)",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "500",
        }}
      >
        Recarregar
      </button>
    </div>
  );
}
