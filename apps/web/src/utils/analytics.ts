export interface UiAnalyticsEvent {
  event: string;
  payload?: Record<string, unknown>;
}

export function trackUiEvent({ event, payload }: UiAnalyticsEvent) {
  const detail = {
    event,
    payload: payload ?? {},
    timestamp: new Date().toISOString(),
  };

  window.dispatchEvent(new CustomEvent('gopass:analytics', { detail }));

  if (import.meta.env.DEV) {
    console.debug('[analytics]', detail);
  }
}
