import type {RecommendationBundle} from '../types/movie';
import type {QuizAnswersMap} from '../types/quiz';
import {sanitizeDirectorName} from './directorValidation';
import {sanitizeImageUrl} from './urlSecurity';

export const BASE_SEO_TITLE = 'Denetflix – Rare & Cult Retro Cinema Finder (1960–1999)';
export const BASE_SEO_DESCRIPTION =
  "Ditch streaming algorithms. Take Denetflix's 5-question pop quiz to discover rare 1960s–1999 cult, giallo, sci-fi, and indie genre films.";

const CORE_SCHEMA_GRAPH_ID = 'denetflix-schema-graph';
const DYNAMIC_RESULTS_LD_ID = 'denetflix-results-jsonld';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function hydrateCoreSchemaGraph(canonicalUrl: string, ogImageUrl: string): void {
  if (typeof document === 'undefined') return;
  const script = document.getElementById(CORE_SCHEMA_GRAPH_ID) as HTMLScriptElement | null;
  if (!script?.textContent) return;

  try {
    const parsed = JSON.parse(script.textContent) as {
      '@context'?: string;
      '@graph'?: Array<Record<string, unknown>>;
    };
    if (!Array.isArray(parsed['@graph'])) return;

    let changed = false;
    for (const node of parsed['@graph']) {
      if (node['@type'] === 'WebApplication') {
        if (node.url !== canonicalUrl || node.image !== ogImageUrl) {
          node['@id'] = `${canonicalUrl}#webapp`;
          node.url = canonicalUrl;
          node.image = ogImageUrl;
          changed = true;
        }
      } else if (node['@type'] === 'WebSite') {
        if (node.url !== canonicalUrl) {
          node['@id'] = `${canonicalUrl}#website`;
          node.url = canonicalUrl;
          changed = true;
        }
      }
    }

    if (changed) {
      script.textContent = JSON.stringify(parsed);
    }
  } catch {
    // Keep static JSON-LD untouched if parsing fails
  }
}

function upsertResultsJsonLd(bundle: RecommendationBundle | null): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(DYNAMIC_RESULTS_LD_ID);
  if (!bundle || bundle.recommendations.length === 0) {
    existing?.remove();
    return;
  }

  const topMovies = bundle.recommendations.slice(0, 10);
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Denetflix Retro Cult Movie Recommendations',
    numberOfItems: bundle.recommendations.length,
    itemListElement: topMovies.map((rec, index) => {
      const verifiedDirector = sanitizeDirectorName(rec.movie.director);
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Movie',
          name: rec.movie.title,
          datePublished: String(rec.movie.year),
          dateCreated: String(rec.movie.year),
          genre: rec.movie.genres,
          countryOfOrigin: rec.movie.countryLabel
            ? {'@type': 'Country', name: rec.movie.countryLabel}
            : undefined,
          duration:
            typeof rec.movie.runtimeMinutes === 'number' && rec.movie.runtimeMinutes > 0
              ? `PT${Math.round(rec.movie.runtimeMinutes)}M`
              : undefined,
          director: verifiedDirector
            ? {'@type': 'Person', name: verifiedDirector}
            : undefined,
          description: rec.movie.synopsis,
          image: sanitizeImageUrl(rec.movie.posterUrl) || undefined,
        },
      };
    }),
  };

  let script = existing as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = DYNAMIC_RESULTS_LD_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(payload);
}

/**
 * Synchronizes document title, meta description, OpenGraph/Twitter tags,
 * canonical URL, absolute Schema.org graph URLs, and dynamic Movie ItemList JSON-LD.
 */
export function syncPageSeo(params: {
  activeView: 'home' | 'quiz' | 'loading' | 'results';
  currentStepIndex: number;
  totalSteps: number;
  answers: QuizAnswersMap;
  bundle: RecommendationBundle | null;
}): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
  const ogImageUrl = new URL('./og-denetflix.jpg', canonicalUrl).toString();

  let title = BASE_SEO_TITLE;
  let description = BASE_SEO_DESCRIPTION;

  if (params.activeView === 'quiz') {
    const stepNum = Math.min(params.totalSteps, Math.max(1, params.currentStepIndex + 1));
    title = `Step ${stepNum} of ${params.totalSteps} – Denetflix Retro Cinema Quiz`;
    description =
      'Pick your decade, genres, production country, vibe, and deal-breakers to uncover rare 1960–1999 independent and cult genre cinema.';
  } else if (params.activeView === 'loading') {
    title = 'Digging Up Rare Retro Cinema – Denetflix';
    description =
      'Searching rare 1960–1999 American, Italian, European, and Asian cult genre films matched to your quiz choices.';
  } else if (params.activeView === 'results' && params.bundle) {
    const count = params.bundle.recommendations.length;
    const decadeLabel =
      params.answers.decade === 'surprise' ? '1960–1999' : params.answers.decade;
    const genreLabel =
      params.answers.genres.length > 0 ? params.answers.genres.join(' & ') : 'Cult Genre';
    title =
      count > 0
        ? `${count} ${decadeLabel} ${genreLabel} Picks – Denetflix`
        : `No Exact Matches (${decadeLabel} ${genreLabel}) – Denetflix`;
    description =
      count > 0
        ? `Explore ${count} rare ${decadeLabel} ${genreLabel.toLowerCase()} retro films curated by Denetflix with regional streaming checks and disc links.`
        : BASE_SEO_DESCRIPTION;
  }

  document.title = title;
  upsertCanonical(canonicalUrl);
  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:image', ogImageUrl);
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', ogImageUrl);

  hydrateCoreSchemaGraph(canonicalUrl, ogImageUrl);
  upsertResultsJsonLd(params.activeView === 'results' ? params.bundle : null);
}
