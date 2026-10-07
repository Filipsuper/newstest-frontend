import { useEffect, useState } from 'react';
import { fetchResearchPreview } from '../utils/api';

export function usePublicPreview(resource) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ resource, data: null, error: false });
  useEffect(() => {
    const controller = new AbortController();
    setState({ resource, data: null, error: false });
    fetchResearchPreview(resource, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ resource, data, error: false });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ resource, data: null, error: true });
    });
    return () => controller.abort();
  }, [resource, attempt]);
  return { ...(state.resource === resource ? state : { data: null, error: false }), retry: () => setAttempt(value => value + 1) };
}
