/**
 * TMDB API anahtarı yok — Cinemeta (Stremio) ile başlık çözümleme.
 */
async function resolveMediaInfo(id, mediaType) {
  var clean = String(id || '')
    .trim()
    .replace(/^(?:movie|tv|series|tmdb|imdb):+/i, '');
  if (clean.includes(':')) clean = clean.split(':')[0];

  var type = mediaType === 'movie' ? 'movie' : 'series';
  if (!clean.startsWith('tt') && !clean.startsWith('tmdb')) {
    return { title: '', origTitle: '', id: clean };
  }

  var metaId = clean.startsWith('tt') ? clean : 'tmdb:' + clean;
  var url =
    'https://v3-cinemeta.strem.io/meta/' + type + '/' + encodeURIComponent(metaId) + '.json';

  try {
    var res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { title: '', origTitle: '', id: clean };
    var body = await res.json();
    var m = body && body.meta;
    if (!m) return { title: '', origTitle: '', id: clean };
    return {
      title: m.name || '',
      origTitle: m.originalTitle || m.name || '',
      id: clean,
    };
  } catch (e) {
    return { title: '', origTitle: '', id: clean };
  }
}

function normalizeTitle(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
  .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleToSlug(str) {
  return normalizeTitle(str).replace(/\s+/g, '-').replace(/^-|-$/g, '');
}

function parseStreamArgs(tmdbId, mediaType, seasonNum, episodeNum) {
  if (typeof tmdbId === 'object' && tmdbId !== null) {
    mediaType = tmdbId.type || mediaType;
    seasonNum = tmdbId.season != null ? tmdbId.season : seasonNum;
    episodeNum = tmdbId.episode != null ? tmdbId.episode : episodeNum;
    tmdbId = tmdbId.id;
  }
  if (
    typeof tmdbId === 'string' &&
    !String(tmdbId).startsWith('cinemafly_')
  ) {
    var tail = tmdbId.match(/^(.*):(\d+):(\d+)$/);
    if (tail) {
      tmdbId = tail[1];
      seasonNum = parseInt(tail[2], 10);
      episodeNum = parseInt(tail[3], 10);
    }
  }
  if (mediaType === 'series' || mediaType === 'show') mediaType = 'tv';
  if (!mediaType) {
    mediaType =
      seasonNum !== undefined && episodeNum !== undefined ? 'tv' : 'movie';
  }
  return { id: tmdbId, mediaType: mediaType, season: seasonNum, episode: episodeNum };
}

module.exports = {
  resolveMediaInfo,
  normalizeTitle,
  titleToSlug,
  parseStreamArgs,
};