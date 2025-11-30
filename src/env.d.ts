// Type definitions for Vite environment variables used by the app
// Place this file in `src/` so TypeScript picks it up automatically

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // add other VITE_ variables you expect to use
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Temporary module declarations for libraries added at runtime
declare module 'jspdf';
