// Central type exports

export * from './auth';
export * from './discussion';
export * from './categories';
export * from './follow';
export * from './notification';
export * from './websocket';
export * from './error';

// Re-export legacy types for backward compatibility (with explicit naming to avoid conflicts)
export type { Discussion as LegacyDiscussion, Post as LegacyPost, Reference, Graph } from './post';