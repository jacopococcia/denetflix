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

const summaryCache = new Map<string, {posterUrl: string | null; extract: string | null}>();

export async function resolveWikipediaSummary(
  wikiSlug: string | undefined,
  callerSignal?: AbortSignal,
): Promise<{posterUrl: string | null; extract: string | null}> {
  if (!wikiSlug) return {posterUrl: null, extract: null};
  if (summaryCache.has(wikiSlug)) {
    return summaryCache.get(wikiSlug)!;
  }

  const wikiTimeout = createTimeoutSignal(callerSignal, 3500);
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiSlug)}`,
      {signal: wikiTimeout.signal},
    );
    if (!res.ok) {
      const empty = {posterUrl: null, extract: null};
      summaryCache.set(wikiSlug, empty);
      return empty;
    }
    const json = (await res.json()) as {
      thumbnail?: {source?: string};
      extract?: string;
    };
    const result = {
      posterUrl: json.thumbnail?.source ?? null,
      extract: json.extract?.trim() || null,
    };
    summaryCache.set(wikiSlug, result);
    if (result.posterUrl) {
      posterCache.set(wikiSlug, result.posterUrl);
    }
    return result;
  } catch (error) {
    if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
      throw error;
    }
    return {posterUrl: null, extract: null};
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
