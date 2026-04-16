/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_DEV__: boolean | undefined;
declare const __APP_PROD__: boolean | undefined;
declare const __VITE_ZAKI_BACKEND_URL__: string | undefined;
declare const __VITE_API_BASE_URL__: string | undefined;
