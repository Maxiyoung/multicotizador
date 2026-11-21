import axios from 'axios';

const SENSITIVE_KEY_PATTERN =
  /(authorization|password|secret|token|subscription[-_]?key|api[-_]?key|client[-_]?id|cookie)/i;

export interface SafeErrorSummary {
  name: string;
  message: string;
  code?: string;
  status?: number;
  method?: string;
  url?: string;
}

export function redactObject(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactObject(item, depth + 1));
  }
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = redactObject(val, depth + 1);
      }
    }
    return output;
  }
  return '[UNSERIALIZABLE]';
}

export function sanitizeError(error: unknown): SafeErrorSummary {
  if (axios.isAxiosError(error)) {
    return {
      name: 'AxiosError',
      message: error.message,
      code: error.code,
      status: error.response?.status,
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: 'UnknownError',
    message: typeof error === 'string' ? error : 'Error no especificado',
  };
}

function writeLog(level: 'info' | 'warn' | 'error', event: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(meta ? (redactObject(meta) as Record<string, unknown>) : {}),
  };

  const serialized = JSON.stringify(entry);
  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

export const logger = {
  info(event: string, meta?: Record<string, unknown>) {
    writeLog('info', event, meta);
  },
  warn(event: string, meta?: Record<string, unknown>) {
    writeLog('warn', event, meta);
  },
  error(event: string, error?: unknown, meta?: Record<string, unknown>) {
    writeLog('error', event, {
      ...meta,
      ...(error !== undefined ? { error: sanitizeError(error) } : {}),
    });
  },
};
