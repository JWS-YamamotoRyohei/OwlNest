// src/utils/error.ts
export function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
  }
  
  export function getErrorMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    if (isRecord(e) && typeof e.message === 'string') return e.message;
    try { return JSON.stringify(e); } catch { return String(e); }
  }
  
  export function hasString(v: unknown, key: string): v is Record<string, string> {
    return isRecord(v) && typeof (v as any)[key] === 'string';
  }
  