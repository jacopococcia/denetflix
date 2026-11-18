import type {Movie} from '../types/movie';
import {createTimeoutSignal, getApiBaseUrl} from './tmdbService';

export interface PosterLookupContext {
  title?: string;
  year?: number;
  archiveOrgId?: string;
  origin?: Movie['origin'];
}

const posterCache = new Map<string, string | null>();
const summaryCache = new Map<string, {posterUrl: string | null; extract: string | null}>();

function buildPosterCacheKey(wikiSlug: string | undefined, meta?: PosterLookupContext): string {
  return `${(wikiSlug || '').toLowerCase()}::${(meta?.title || '').toLowerCase()}::${meta?.year ?? ''}`;
}

async function fetchBackendPoster(
  wikiSlug: string | undefined,
  meta?: PosterLookupContext,
  callerSignal?: AbortSignal,
): Promise<string | null> {
  if (!wikiSlug && !meta?.title) return null;

  const apiBase = getApiBaseUrl();
  const params = new URLSearchParams();
  if (wikiSlug) params.set('slug', wikiSlug);
  if (meta?.title) params.set('title', meta.title);
  if (typeof meta?.year === 'number' && Number.isFinite(meta.year)) {
    params.set('year', String(meta.year));
  }

  const proxyTimeout = createTimeoutSignal(callerSignal, 4200);
  try {
    const proxyRes = await fetch(`${apiBase}/api/poster?${params.toString()}`, {
      signal: proxyTimeout.signal,
    });
    const contentType = proxyRes.headers.get('content-type') || '';
    if (proxyRes.ok && contentType.includes('application/json')) {
      const data = (await proxyRes.json()) as {posterUrl?: string | null};
      if (data.posterUrl) {
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
  return null;
}

async function fetchWikiSummaryDirect(
  lang: 'en' | 'it',
  slug: string,
  callerSignal?: AbortSignal,
): Promise<{posterUrl: string | null; extract: string | null}> {
  const wikiTimeout = createTimeoutSignal(callerSignal, 3500);
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
      {signal: wikiTimeout.signal},
    );
    if (!res.ok) {
      return {posterUrl: null, extract: null};
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return {posterUrl: null, extract: null};
    }
    const json = (await res.json()) as {
      thumbnail?: {source?: string};
      extract?: string;
    };
    return {
      posterUrl: json.thumbnail?.source ?? null,
      extract: json.extract?.trim() || null,
    };
  } catch (error) {
    if ((error as Error)?.name === 'AbortError' && callerSignal?.aborted) {
      throw error;
    }
    return {posterUrl: null, extract: null};
  } finally {
    wikiTimeout.cleanup();
  }
}

export async function resolveWikipediaSummary(
  wikiSlug: string | undefined,
  callerSignal?: AbortSignal,
  meta?: PosterLookupContext,
): Promise<{posterUrl: string | null; extract: string | null}> {
  const cacheKey = buildPosterCacheKey(wikiSlug, meta);
  if (summaryCache.has(cacheKey)) {
    return summaryCache.get(cacheKey)!;
  }

  // 1. Direct English Wikipedia REST summary gives BOTH poster thumbnail + clean plot extract
  const enSummary = wikiSlug
    ? await fetchWikiSummaryDirect('en', wikiSlug, callerSignal)
    : {posterUrl: null, extract: null};

  let resolvedPoster = enSummary.posterUrl;

  // 2. If English Wikipedia lacked a fair-use thumbnail, resolve via /api/poster (IMDb + JustWatch)
  if (!resolvedPoster) {
    resolvedPoster = await fetchBackendPoster(wikiSlug, meta, callerSignal);
  }

  // 3. Static-mode fallback: Internet Archive poster image when archiveOrgId is known
  if (!resolvedPoster && meta?.archiveOrgId) {
    resolvedPoster = `https://archive.org/services/img/${encodeURIComponent(meta.archiveOrgId)}`;
  }

  // 4. Static-mode fallback for Italian titles: Italian Wikipedia REST summary often hosts posters/stills
  if (!resolvedPoster && meta?.origin === 'italy' && meta.title) {
    const itSlug = meta.title.replace(/\s*\([^)]*\)\s*/g, ' ').trim().replace(/\s+/g, '_');
    const itSummary = await fetchWikiSummaryDirect('it', itSlug, callerSignal);
    if (itSummary.posterUrl) {
      resolvedPoster = itSummary.posterUrl;
    }
  }

  const result = {
    posterUrl: resolvedPoster,
    extract: enSummary.extract,
  };
  summaryCache.set(cacheKey, result);
  if (resolvedPoster) {
    posterCache.set(cacheKey, resolvedPoster);
  }
  return result;
}

export async function resolveFallbackPoster(
  wikiSlug: string | undefined,
  callerSignal?: AbortSignal,
  meta?: PosterLookupContext,
): Promise<string | null> {
  if (!wikiSlug && !meta?.title && !meta?.archiveOrgId) return null;

  const cacheKey = buildPosterCacheKey(wikiSlug, meta);
  if (posterCache.has(cacheKey)) {
    return posterCache.get(cacheKey) ?? null;
  }

  // 1. Express /api/poster chains Wikipedia -> IMDb Suggestion -> JustWatch GraphQL
  let posterUrl = await fetchBackendPoster(wikiSlug, meta, callerSignal);

  // 2. Direct Wikipedia REST API (CORS-enabled for static GitHub Pages)
  if (!posterUrl && wikiSlug) {
    const enSummary = await fetchWikiSummaryDirect('en', wikiSlug, callerSignal);
    posterUrl = enSummary.posterUrl;
  }

  // 3. Static fallback: Internet Archive poster thumbnail
  if (!posterUrl && meta?.archiveOrgId) {
    posterUrl = `https://archive.org/services/img/${encodeURIComponent(meta.archiveOrgId)}`;
  }

  // 4. Static fallback: Italian Wikipedia REST summary for Italian titles
  if (!posterUrl && meta?.origin === 'italy' && meta.title) {
    const itSlug = meta.title.replace(/\s*\([^)]*\)\s*/g, ' ').trim().replace(/\s+/g, '_');
    const itSummary = await fetchWikiSummaryDirect('it', itSlug, callerSignal);
    posterUrl = itSummary.posterUrl;
  }

  posterCache.set(cacheKey, posterUrl);
  return posterUrl;
}
