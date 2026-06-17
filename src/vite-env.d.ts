/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_DEV__: boolean | undefined;
declare const __APP_PROD__: boolean | undefined;
declare const __VITE_ZAKI_BACKEND_URL__: string | undefined;
declare const __VITE_API_BASE_URL__: string | undefined;
declare const __VITE_TURNSTILE_SITE_KEY__: string | undefined;

// Runtime config injected by /env.js (written at container start from the BACKEND_URL container env).
interface Window {
  __ZAKI_ENV__?: Record<string, string | undefined>;
}
