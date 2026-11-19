import type {Movie} from '../types/movie';

export interface PainPointContext {
  imdbScore?: number | null;
  imdbVotes?: number;
}

interface PainPointCandidate {
  family: string;
  text: string;
}

const COUNTRY_ADJECTIVE_MAP: Record<string, string> = {
  Italy: 'Italian',
  USA: 'American',
  UK: 'British',
  France: 'French',
  Germany: 'German',
  Spain: 'Spanish',
  Japan: 'Japanese',
  'Hong Kong': 'Hong Kong',
  'South Korea': 'South Korean',
  Taiwan: 'Taiwanese',
  China: 'Chinese',
  Sweden: 'Swedish',
  Czechoslovakia: 'Czech',
  Poland: 'Polish',
  Belgium: 'Belgian',
  Netherlands: 'Dutch',
  Denmark: 'Danish',
  Norway: 'Norwegian',
  Austria: 'Austrian',
  Switzerland: 'Swiss',
  Hungary: 'Hungarian',
  Portugal: 'Portuguese',
  Ireland: 'Irish',
  Canada: 'Canadian',
  Australia: 'Australian',
  Mexico: 'Mexican',
  Brazil: 'Brazilian',
  Argentina: 'Argentine',
  Russia: 'Russian',
  'Soviet Union': 'Soviet',
};

function getCountryAdjective(countryLabel: string): string {
  return Object.hasOwn(COUNTRY_ADJECTIVE_MAP, countryLabel)
    ? COUNTRY_ADJECTIVE_MAP[countryLabel]
    : countryLabel;
}

function cleanShortTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim() || title.trim();
}

function hashTitleYear(title: string, year: number): number {
  const str = `${title.toLowerCase()}::${year}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hasRealDirector(director: string | undefined): director is string {
  if (!director) return false;
  const trimmed = director.trim();
  return Boolean(
    trimmed &&
      trimmed !== 'Director uncredited' &&
      trimmed !== 'Archive Director',
  );
}

function buildLabeledCandidates(
  movie: Pick<
    Movie,
    | 'title'
    | 'year'
    | 'decade'
    | 'origin'
    | 'countryLabel'
    | 'director'
    | 'runtimeMinutes'
    | 'genres'
    | 'synopsis'
    | 'isNonEnglishPrimary'
  >,
  extra?: PainPointContext,
): PainPointCandidate[] {
  const shortTitle = cleanShortTitle(movie.title);
  const syn = (movie.synopsis || '').toLowerCase();
  const genres = new Set(movie.genres);
  const realDirector = hasRealDirector(movie.director) ? movie.director : null;
  const countryAdj = getCountryAdjective(movie.countryLabel);
  const seed = hashTitleYear(shortTitle, movie.year);
  const candidates: PainPointCandidate[] = [];

  // 1. Concrete synopsis-matched hooks (strictly triggered by real words present in synopsis)
  if (/\b(witch|occult|satan|devil|curse|demon|cult|ritual|coven|possession)\b/.test(syn)) {
    candidates.push({
      family: 'occult',
      text: `Occult ${movie.year} dread in ${shortTitle} leans into surreal nightmares over tidy explanations.`,
    });
  }
  if (/\b(zombie|undead|cannibal|vampire|ghoul|living dead|corpse|morgue)\b/.test(syn)) {
    candidates.push({
      family: 'gore',
      text: `Grimy ${movie.year} gore and macabre creature work in ${shortTitle} are not built for queasy stomachs.`,
    });
  }
  if (/\b(serial killer|psychopath|slasher|murderer|murders|slaughter|stalker|giallo)\b/.test(syn)) {
    candidates.push({
      family: 'killer',
      text: realDirector
        ? `${realDirector} piles on cold-blooded ${movie.year} tension and ruthless suspense in ${shortTitle}.`
        : `Nasty ${movie.year} stalk-and-slash brutality in ${shortTitle} leaves cozy whodunits far behind.`,
    });
  }
  if (/\b(alien|spaceship|spacecraft|planet|astronaut|galaxy|orbit|extraterrestrial|mars)\b/.test(syn)) {
    candidates.push({
      family: 'space',
      text: `Handmade ${movie.year} space sets and analog miniatures give ${shortTitle} charmingly dated sci-fi seams.`,
    });
  }
  if (/\b(cyborg|robot|android|virtual|computer|cyber|experiment|mutant|virus|radiation)\b/.test(syn)) {
    candidates.push({
      family: 'tech-experiment',
      text: `Retro ${movie.year} lab-and-tech paranoia in ${shortTitle} looks delightfully scrappy next to modern VFX.`,
    });
  }
  if (/\b(detective|inspector|investigat|conspiracy|private eye|undercover|spy|espionage|cia|fbi)\b/.test(syn)) {
    candidates.push({
      family: 'conspiracy',
      text: `Twisty ${movie.year} investigative plotting in ${shortTitle} asks you to pay close attention to every clue.`,
    });
  }
  if (/\b(mafia|mob|gangster|cartel|heist|robbery|smuggl|hitman|syndicate|assassin)\b/.test(syn)) {
    candidates.push({
      family: 'underworld',
      text: `Gritty ${movie.year} ${countryAdj} underworld cynicism in ${shortTitle} offers very few likable heroes.`,
    });
  }
  if (/\b(war|soldier|army|platoon|battle|combat|nazi|vietnam|resistance|frontline|military)\b/.test(syn)) {
    candidates.push({
      family: 'wartime',
      text: `Unflinching ${movie.year} wartime grimness in ${shortTitle} hits noticeably harder than glossy action fare.`,
    });
  }
  if (/\b(monster|beast|creature|shark|alligator|crocodile|dragon|giant)\b/.test(syn)) {
    candidates.push({
      family: 'creature',
      text: `Practical ${movie.year} creature effects steal scenes in ${shortTitle}—for better or for campy worse.`,
    });
  }
  if (/\b(wedding|marriage|divorce|affair|romance|lover|boyfriend|girlfriend|jealous)\b/.test(syn)) {
    candidates.push({
      family: 'relationship',
      text: `Dating and relationship attitudes in ${shortTitle} feel unmistakably stamped by ${movie.year} ${movie.countryLabel}.`,
    });
  }
  if (/\b(musical|rock|band|punk|singer|concert|dance|ballet|disco|pop star)\b/.test(syn)) {
    candidates.push({
      family: 'music',
      text: `Full-tilt ${movie.year} musical setpieces in ${shortTitle} frequently pause the story to let the soundtrack rule.`,
    });
  }
  if (/\b(dream|hallucin|surreal|nightmare|fever|madness|bizarre|weird|fantasy)\b/.test(syn)) {
    candidates.push({
      family: 'surreal',
      text: `Fever-dream logic in ${shortTitle} prioritizes ${movie.year} atmosphere over neat plot answers.`,
    });
  }
  if (/\b(sequel|part ii|part two|chapter|trilogy)\b/.test(syn) || /\b(ii|2|iii|3|part)\b/i.test(shortTitle)) {
    candidates.push({
      family: 'sequel',
      text: `Mid-series lore around ${shortTitle} (${movie.year}) assumes you are happy jumping straight into the chaos.`,
    });
  }

  // 2. Exact runtime friction when verified
  if (typeof movie.runtimeMinutes === 'number' && movie.runtimeMinutes > 0) {
    if (movie.runtimeMinutes >= 135) {
      candidates.push({
        family: 'long-runtime',
        text: realDirector
          ? `At ${movie.runtimeMinutes} minutes, ${realDirector} asks for serious late-night stamina on ${shortTitle}.`
          : `Clocking in at ${movie.runtimeMinutes} minutes, ${shortTitle} (${movie.year}) is a full marathon commitment.`,
      });
    } else if (movie.runtimeMinutes >= 118) {
      candidates.push({
        family: 'deliberate-runtime',
        text: `${shortTitle} runs a deliberate ${movie.runtimeMinutes} minutes—give its ${movie.year} buildup room to breathe.`,
      });
    } else if (movie.runtimeMinutes <= 80) {
      candidates.push({
        family: 'short-runtime',
        text: `At a brisk ${movie.runtimeMinutes} minutes, ${shortTitle} sprints to the credits almost before the setup settles.`,
      });
    }
  }

  // 3. IMDb audience split / ultra-deep-cut signal (only when passed from JustWatch/TMDB)
  if (typeof extra?.imdbScore === 'number' && extra.imdbScore > 0 && extra.imdbScore < 6.0) {
    candidates.push({
      family: 'audience-split',
      text: `${shortTitle} (${movie.year}) splits viewers down the middle—pure cult fun if you forgive rough ${movie.decade} craft.`,
    });
  } else if (typeof extra?.imdbVotes === 'number' && extra.imdbVotes > 0 && extra.imdbVotes < 900) {
    candidates.push({
      family: 'vault-print',
      text: `Ultra-obscure ${movie.year} print of ${shortTitle}—expect theatrical grit rather than polished blockbuster pacing.`,
    });
  }

  // 4. Language / localization & dubbing catch
  if (movie.isNonEnglishPrimary && movie.origin !== 'usa') {
    candidates.push({
      family: 'subtitles',
      text: `Original ${countryAdj} audio with subtitles beats stiff ${movie.decade} English dubs on ${shortTitle}.`,
    });
  }

  // 5. Director + Genre + Year specific variations (rotated deterministically by title+year hash)
  const genreSpecific: PainPointCandidate[] = [];
  if (genres.has('Horror') && genres.has('Comedy')) {
    genreSpecific.push({
      family: 'horror-comedy',
      text: `${shortTitle} (${movie.year}) whiplash between laughs and gore won’t match every viewer's threshold.`,
    });
  } else if (genres.has('Horror')) {
    genreSpecific.push({
      family: 'horror-tone',
      text: realDirector
        ? `${realDirector} indulges in raw ${movie.year} genre shocks in ${shortTitle} instead of subtle restraint.`
        : `Low-budget ${movie.year} ${countryAdj} terror in ${shortTitle} wears its grindhouse edges openly.`,
    });
  }
  if (genres.has('Science fiction')) {
    genreSpecific.push({
      family: 'scifi-retro',
      text: `Retro ${movie.year} future-tech predictions in ${shortTitle} look quaintly analog today.`,
    });
  }
  if (genres.has('Thriller') || genres.has('Mystery')) {
    genreSpecific.push({
      family: 'thriller-burn',
      text: realDirector
        ? `${realDirector} stretches suspense deliberately in ${shortTitle} (${movie.year}) before the payoff lands.`
        : `Slow-burning ${movie.year} intrigue in ${shortTitle} asks for patience through the first act.`,
    });
  }
  if (genres.has('Comedy')) {
    genreSpecific.push({
      family: 'comedy-era',
      text: `Several punchlines in ${shortTitle} are pure ${movie.year} ${countryAdj} humor—time-capsule energy guaranteed.`,
    });
  }
  if (genres.has('Crime')) {
    genreSpecific.push({
      family: 'crime-grit',
      text: `Bleak ${movie.year} street-level crime tone in ${shortTitle} prioritizes grit over glossy charisma.`,
    });
  }
  if (genres.has('War')) {
    genreSpecific.push({
      family: 'war-grit',
      text: `${shortTitle} (${movie.year}) trades heroic Hollywood polish for harsh, muddy frontline tension.`,
    });
  }
  if (genres.has('Action') || genres.has('Adventure')) {
    genreSpecific.push({
      family: 'action-physics',
      text: `Stunt physics and explosive plotting in ${shortTitle} (${movie.year}) happily outrun strict realism.`,
    });
  }
  if (genres.has('Fantasy')) {
    genreSpecific.push({
      family: 'fantasy-fx',
      text: `Lo-fi ${movie.year} matte paintings and practical illusions in ${shortTitle} reward a soft spot for analog magic.`,
    });
  }
  if (genres.has('Romance')) {
    genreSpecific.push({
      family: 'romance-melo',
      text: `${shortTitle} (${movie.year}) leans hard into lush ${movie.decade} melodrama and sweeping emotions.`,
    });
  }
  if (genres.has('Musical')) {
    genreSpecific.push({
      family: 'musical-camp',
      text: `Kitschy ${movie.year} choreography and vintage pop hooks in ${shortTitle} go all-in on camp.`,
    });
  }
  if (genres.has('Family')) {
    genreSpecific.push({
      family: 'family-retro',
      text: `${movie.year} family sensibilities in ${shortTitle} can feel surprisingly cheeky compared to modern kids’ fare.`,
    });
  }

  if (genreSpecific.length > 0) {
    const startIdx = seed % genreSpecific.length;
    for (let i = 0; i < genreSpecific.length; i += 1) {
      candidates.push(genreSpecific[(startIdx + i) % genreSpecific.length]);
    }
  }

  candidates.push({
    family: 'era-cut',
    text: realDirector
      ? `${realDirector}’s ${movie.year} cut of ${shortTitle} favors offbeat ${countryAdj} atmosphere over safe pacing.`
      : `${shortTitle} (${movie.year}) brings unapologetic ${movie.decade} ${countryAdj} eccentricity rather than slick polish.`,
  });

  // Deduplicate exact text while preserving priority order
  const unique: PainPointCandidate[] = [];
  const seenText = new Set<string>();
  for (const item of candidates) {
    const clean = item.text.trim();
    if (clean && !seenText.has(clean)) {
      seenText.add(clean);
      unique.push({family: item.family, text: clean});
    }
  }
  return unique;
}

export function buildMoviePainPointCandidates(
  movie: Pick<
    Movie,
    | 'title'
    | 'year'
    | 'decade'
    | 'origin'
    | 'countryLabel'
    | 'director'
    | 'runtimeMinutes'
    | 'genres'
    | 'synopsis'
    | 'isNonEnglishPrimary'
  >,
  extra?: PainPointContext,
): string[] {
  return buildLabeledCandidates(movie, extra).map((c) => c.text);
}

export function buildMovieSpecificPainPoint(
  movie: Pick<
    Movie,
    | 'title'
    | 'year'
    | 'decade'
    | 'origin'
    | 'countryLabel'
    | 'director'
    | 'runtimeMinutes'
    | 'genres'
    | 'synopsis'
    | 'isNonEnglishPrimary'
  >,
  extra?: PainPointContext,
): string {
  return buildLabeledCandidates(movie, extra)[0].text;
}

/**
 * Picks the highest-priority pain point for a movie that hasn't already appeared on another card
 * (avoiding both duplicate text and repeated template families on the same result list).
 */
export function selectUniqueMoviePainPoint(
  movie: Pick<
    Movie,
    | 'title'
    | 'year'
    | 'decade'
    | 'origin'
    | 'countryLabel'
    | 'director'
    | 'runtimeMinutes'
    | 'genres'
    | 'synopsis'
    | 'isNonEnglishPrimary'
  >,
  usedCons: Set<string>,
  extra?: PainPointContext,
): string {
  const candidates = buildLabeledCandidates(movie, extra);
  // First pass: prefer a candidate whose template family AND exact text haven't been used yet
  for (const candidate of candidates) {
    const familyKey = `family::${candidate.family}`;
    if (!usedCons.has(candidate.text) && !usedCons.has(familyKey)) {
      usedCons.add(candidate.text);
      usedCons.add(familyKey);
      return candidate.text;
    }
  }
  // Second pass: fall back to any unused exact text
  for (const candidate of candidates) {
    if (!usedCons.has(candidate.text)) {
      usedCons.add(candidate.text);
      return candidate.text;
    }
  }
  const fallback = candidates[0].text;
  usedCons.add(fallback);
  return fallback;
}
