// Polyfill de localStorage para os testes.
// Motivo: nesta combinação jsdom + Node 22 o `window.localStorage` fica
// indefinido (o Node expõe um localStorage experimental que exige
// --localstorage-file e atrapalha o do jsdom). Um Storage em memória garante
// testes determinísticos para código que usa `localStorage` (ex.: userRole).
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const ls = new MemoryStorage();
const define = (target: object) =>
  Object.defineProperty(target, "localStorage", {
    value: ls,
    configurable: true,
    writable: true,
  });

define(globalThis);
if (typeof window !== "undefined") define(window);
