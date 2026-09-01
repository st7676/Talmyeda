/// <reference types="vite/client" />

declare module 'stylis' {
  export type Middleware = (...args: unknown[]) => string | void;
  export const prefixer: Middleware;
}

declare module 'stylis-plugin-rtl' {
  import type { Middleware } from 'stylis';
  const rtlPlugin: Middleware;
  export default rtlPlugin;
}
