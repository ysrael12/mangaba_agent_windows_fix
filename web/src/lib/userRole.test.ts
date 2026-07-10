// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { ROLE_META, ROLE_ORDER, canSee, getRole, setRole } from "./userRole";

beforeEach(() => {
  localStorage.clear();
});

describe("hierarquia de perfis", () => {
  it("tem a ordem operador < gestor < dev", () => {
    expect(ROLE_ORDER).toEqual(["operador", "gestor", "dev"]);
    expect(ROLE_META.operador.rank).toBeLessThan(ROLE_META.gestor.rank);
    expect(ROLE_META.gestor.rank).toBeLessThan(ROLE_META.dev.rank);
  });
});

describe("canSee", () => {
  it("aba sem minRole é visível a todos", () => {
    expect(canSee("operador", undefined)).toBe(true);
  });

  it("operador NÃO vê abas de gestor/dev", () => {
    expect(canSee("operador", "gestor")).toBe(false);
    expect(canSee("operador", "dev")).toBe(false);
    expect(canSee("operador", "operador")).toBe(true);
  });

  it("gestor vê operador+gestor, mas não dev", () => {
    expect(canSee("gestor", "operador")).toBe(true);
    expect(canSee("gestor", "gestor")).toBe(true);
    expect(canSee("gestor", "dev")).toBe(false);
  });

  it("dev vê tudo", () => {
    expect(canSee("dev", "operador")).toBe(true);
    expect(canSee("dev", "gestor")).toBe(true);
    expect(canSee("dev", "dev")).toBe(true);
  });
});

describe("persistência", () => {
  it("padrão é dev quando não há nada salvo", () => {
    expect(getRole()).toBe("dev");
  });

  it("setRole/getRole faz roundtrip via localStorage", () => {
    setRole("gestor");
    expect(getRole()).toBe("gestor");
    expect(localStorage.getItem("mangaba-perfil")).toBe("gestor");
  });

  it("valor inválido no storage cai no padrão", () => {
    localStorage.setItem("mangaba-perfil", "hacker");
    expect(getRole()).toBe("dev");
  });

  it("setRole dispara evento para re-render reativo", () => {
    let disparou = false;
    window.addEventListener("mangaba:role-change", () => (disparou = true));
    setRole("dev");
    expect(disparou).toBe(true);
  });
});

// Espelha o agrupamento real das abas (App.tsx) para travar a distribuição 5/12/24.
describe("distribuição das abas por perfil (espelho de App.tsx)", () => {
  const NAV: Array<{ min: "operador" | "gestor" | "dev" }> = [
    // operador (5)
    { min: "operador" }, // Início
    { min: "operador" }, // Chat
    { min: "operador" }, // Sessões
    { min: "operador" }, // Análise
    { min: "operador" }, // Exemplos
    // gestor (+7 = 12)
    { min: "gestor" }, // Criar funcionário agêntico
    { min: "gestor" }, // Perfis
    { min: "gestor" }, // Roteamento
    { min: "gestor" }, // Frota
    { min: "gestor" }, // Agentes no Teams
    { min: "gestor" }, // Agendamentos
    { min: "gestor" }, // Kanban
    // dev (+12 = 24)
    { min: "dev" }, // Começar
    { min: "dev" }, // Documentação
    { min: "dev" }, // Modelos
    { min: "dev" }, // Chaves
    { min: "dev" }, // Habilidades
    { min: "dev" }, // Plugins
    { min: "dev" }, // Memória
    { min: "dev" }, // Clientes & API
    { min: "dev" }, // Sessões Globais
    { min: "dev" }, // Observabilidade
    { min: "dev" }, // Logs
    { min: "dev" }, // Configuração
  ];

  it.each([
    ["operador", 5],
    ["gestor", 12],
    ["dev", 24],
  ] as const)("%s vê %i abas", (role, expected) => {
    const visiveis = NAV.filter((n) => canSee(role, n.min)).length;
    expect(visiveis).toBe(expected);
  });
});
