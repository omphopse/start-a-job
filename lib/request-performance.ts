import 'server-only';
import { cache } from 'react';
import { createPerformanceTrace } from './performance';

// React cache is scoped to a render; no identity or private data is shared.
export const requestPerformance = cache(() => createPerformanceTrace('server-render'));
