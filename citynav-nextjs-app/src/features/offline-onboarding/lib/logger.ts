const isDev = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface AppLogEntry { level: LogLevel; timestamp: number; args: unknown[] }
interface AppLogRoot { __app_log?: { entries: AppLogEntry[] } }

function pushGlobalLog(level: LogLevel, args: unknown[]) {
  try {
    const root = globalThis as unknown as AppLogRoot;
    if (!root.__app_log) root.__app_log = { entries: [] };
    root.__app_log.entries.push({ level, timestamp: Date.now(), args });
  } catch {
    // ignore
  }
}

export const debug = (...args: unknown[]) => {
  if (!isDev) return;
  pushGlobalLog('debug', args);
};

export const info = (...args: unknown[]) => {
  if (!isDev) return;
  pushGlobalLog('info', args);
};

export const warn = (...args: unknown[]) => {
  if (!isDev) return;
  pushGlobalLog('warn', args);
};

export const error = (...args: unknown[]) => {
  pushGlobalLog('error', args);
};

const logger = { debug, info, warn, error };
export default logger;
