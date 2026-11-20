/**
 * Strict validator for film director names.
 * Rejects placeholders ("Archive Director", "Director uncredited", "Unknown")
 * and non-person entities such as studios, production companies, distributors,
 * networks, archives, and uploaders (e.g., "Universal Pictures", "Warner Bros.").
 * Returns the cleaned director string or null when no reliable person name is available.
 */

const PLACEHOLDER_EXACT = new Set([
  'archive director',
  'director uncredited',
  'uncredited',
  'unknown',
  'unknown director',
  'anonymous',
  'various',
  'various directors',
  'multiple',
  'multiple directors',
  'none',
  'n/a',
  'na',
  'tbd',
  'tba',
  'not available',
  'not credited',
  'no director',
  'staff',
  'archive',
  'internet archive',
  'public domain',
  'classic cinema',
  'vintage films',
  'uploader',
  'admin',
]);

const CORPORATE_OR_ORG_PATTERN =
  /\b(inc\.?|ltd\.?|llc\.?|corp\.?|corporation|company|co\.|gmbh|s\.?r\.?l\.?|s\.?p\.?a\.?|pty|plc|b\.?v\.?|pictures?|studios?|productions?|films?|cinema|cinematografica|produzioni|cinecitt[aà]|entertainment|releasing|distribution|distributors?|broadcasting|network|television|tv|channel|video|media|group|association|institute|foundation|museum|library|archive|archives|collection|committee|department|ministry|bureau|office|agency|project|syndicate|trust|organization|organisation|society|guild|university|college|school|press|publishing|publishers?|records?|music|sound|works|labs?|laboratories?|animation|communications?|international|worldwide|classics|features|motion\s+pictures?)\b/i;

const KNOWN_STUDIO_BRAND_PATTERN =
  /\b(universal|paramount|warner\s*bros\.?|metro[\s-]*goldwyn[\s-]*mayer|mgm|columbia|20th\s+century|twentieth\s+century|fox|rko|united\s+artists|disney|walt\s+disney|miramax|orion|cannon|hammer|toho|toei|shochiku|daiei|nikkatsu|shaw\s+brothers|golden\s+harvest|new\s+line|tri[\s-]*star|tristar|dreamworks|lionsgate|a24|netflix|hbo|bbc|itv|rai|mediaset|titanus|lux\s+film|gaumont|path[eé]|studiocanal|mosfilm|lenfilm|defa|ufa|troma|full\s+moon|american\s+international|allied\s+artists|monogram|republic|embassy|avco|lorimar|carolco|vestron|hemdale|goldcrest|rank\s+organisation|ealing|arte|zdf|ard|nhk|cbs|nbc|abc|pbs|npr)\b/i;

const URL_OR_HANDLE_PATTERN = /(https?:\/\/|www\.|@|\.(com|org|net|io|tv|co|uk|it|fr|de)\b|\/)/i;

/**
 * Validates and cleans a candidate director name.
 * Returns null if the value is empty, a placeholder, a studio/company, or not a plausible person name.
 */
export function sanitizeDirectorName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;

  const cleaned = raw
    .replace(/^(directed\s+by|dir\.?)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 3 || cleaned.length > 90) return null;

  const lower = cleaned.toLowerCase();
  if (PLACEHOLDER_EXACT.has(lower)) return null;

  // Reject URLs, email addresses, handles, digits, or short ALL-CAPS acronyms (e.g. MGM, RKO, BBC)
  if (URL_OR_HANDLE_PATTERN.test(cleaned)) return null;
  if (/\d/.test(cleaned)) return null;
  if (/^[A-Z]{2,5}$/.test(cleaned)) return null;

  // Reject corporate entities, film studios, broadcasters, and archive labels
  if (CORPORATE_OR_ORG_PATTERN.test(cleaned)) return null;
  if (KNOWN_STUDIO_BRAND_PATTERN.test(cleaned)) return null;

  // Must contain letters and at least two name tokens (blocks stray single-word studio/uploader labels)
  const tokens = cleaned.split(/[\s,&]+/).filter((t) => /[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]/.test(t));
  if (tokens.length < 2) return null;

  return cleaned;
}
