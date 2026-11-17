import {createTimeoutSignal, getApiBaseUrl} from './tmdbService';

const posterCache = new Map<string, string | null>();

async function fetchSingleWikiPoster(
  wikiSlug: string,
  callerSignal?: AbortSignal,
): Promise<string | null> {
  if (posterCache.has(wikiSlug)) {
    return posterCache.get(wikiSlug) ?? null;
  }

  const apiBase = getApiBaseUrl();
  const proxyTimeout = createTimeoutSignal(callerSignal, 3500);
  try {
    const proxyRes = await fetch(
      `${apiBase}/api/poster?slug=${encodeURIComponent(wikiSlug)}`,
      {signal: proxyTimeout.signal},
    );
    if (proxyRes.ok) {
      const data = (await proxyRes.json()) as {posterUrl?: string | null};
      if (data.posterUrl) {
        posterCache.set(wikiSlug, data.posterUrl);
        return data.posterUrl;
      }
    }
  } catch (error) {
    if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
      throw error;
    }
  } finally {
    proxyTimeout.cleanup();
  }

  // Fallback directly to Wikipedia REST API (CORS-enabled for static GitHub Pages)
  const wikiTimeout = createTimeoutSignal(callerSignal, 3500);
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiSlug)}`,
      {signal: wikiTimeout.signal},
    );
    if (!res.ok) {
      posterCache.set(wikiSlug, null);
      return null;
    }
    const json = (await res.json()) as {thumbnail?: {source?: string}};
    const url = json.thumbnail?.source ?? null;
    posterCache.set(wikiSlug, url);
    return url;
  } catch (error) {
    if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
      throw error;
    }
    return null;
  } finally {
    wikiTimeout.cleanup();
  }
}

export async function resolveFallbackPoster(
  wikiSlug: string | undefined,
  callerSignal?: AbortSignal,
): Promise<string | null> {
  if (!wikiSlug) return null;
  return fetchSingleWikiPoster(wikiSlug, callerSignal);
}
