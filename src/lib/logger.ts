// Simple client-side logging utility for capturing barcode/OCR events.
// Since frontend code cannot write to the project filesystem at runtime,
// logs are kept in memory (and optionally mirrored to localStorage) with
// an export helper to download a .txt file.

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';
export interface LogEntry {
  ts: string; // ISO timestamp
  level: LogLevel;
  message: string;
  context?: any;
}

const logBuffer: LogEntry[] = [];
const MAX_BUFFER = 2000; // Avoid runaway memory
const ENABLE_PERSIST = false; // Set true if you want localStorage mirroring
const STORAGE_KEY = 'app_scan_logs';

function persist() {
  if (!ENABLE_PERSIST) return;
  try {
    const serialized = JSON.stringify(logBuffer.slice(-500)); // cap persistence size
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    // Ignore persistence errors
  }
}

export function log(level: LogLevel, message: string, context?: any) {
  const entry: LogEntry = { ts: new Date().toISOString(), level, message, context };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER) {
    logBuffer.splice(0, logBuffer.length - MAX_BUFFER);
  }
  // Always log to console in development - Vite env check
  const metaEnv = (import.meta as any).env;
  const isDev = metaEnv?.MODE === 'development' || metaEnv?.DEV;
  if (isDev) {
    // Mirror to console in dev only
    const prefix = `[${entry.ts}] [${level}]`;
    if (level === 'ERROR') console.error(prefix, message, context || '');
    else if (level === 'WARN') console.warn(prefix, message, context || '');
    else console.log(prefix, message, context || '');
  }
  persist();
}

export const logInfo = (msg: string, ctx?: any) => log('INFO', msg, ctx);
export const logWarn = (msg: string, ctx?: any) => log('WARN', msg, ctx);
export const logError = (msg: string, ctx?: any) => log('ERROR', msg, ctx);

export function getLogs(): LogEntry[] {
  return [...logBuffer];
}

export function clearLogs() {
  logBuffer.length = 0;
  persist();
}

export function exportLogsAsBlob(): Blob {
  const lines = logBuffer.map(l => `${l.ts}\t${l.level}\t${l.message}${l.context ? '\t' + JSON.stringify(l.context) : ''}`);
  return new Blob([lines.join('\n')], { type: 'text/plain' });
}

export function triggerLogDownload(filename: string = `scan-log-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.txt`) {
  const blob = exportLogsAsBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}

// Optional: restore from localStorage (development convenience)
(function restore() {
  if (!ENABLE_PERSIST) return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const arr: LogEntry[] = JSON.parse(stored);
      logBuffer.push(...arr);
    }
  } catch (e) {
    // Ignore
  }
})();