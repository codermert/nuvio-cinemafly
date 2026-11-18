const { sortStreamsByQuality } = require('../shared/quality.js');
const {
  resolveMediaInfo,
  normalizeTitle,
  titleToSlug,
  parseStreamArgs,
} = require('../shared/cinemeta.js');
const { streamsFromEpisodePage, UA } = require('../shared/pilavyer.js');

var cheerio;
try {
  cheerio = require('cheerio-without-node-native');
} catch (e) {
  cheerio = null;
}

var BASE_URL = 'https://ddizimom.net';
var PROVIDER = 'DiziMom';

async function directEpisodeUrl(info, season, episode) {
  var slugs = [titleToSlug(info.origTitle), titleToSlug(info.title)].filter(
    Boolean,
  );
  var seen = {};
  for (var i = 0; i < slugs.length; i++) {
    if (seen[slugs[i]]) continue;
    seen[slugs[i]] = true;
    var url =
      BASE_URL + '/dizi/' + slugs[i] + '/sezon-' + season + '/bolum-' + episode;
    var res = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: BASE_URL + '/' },
    });
    if (!res.ok) continue;
    var html = await res.text();
    if (/data-pv=["'][^"']+["']/i.test(html)) return url;
  }
  return null;
}

async function searchEpisodeUrl(title, season, episode, isMovie) {
  if (!cheerio) return null;
  var searchUrl = BASE_URL + '/ara?q=' + encodeURIComponent(title);
  var sRes = await fetch(searchUrl, {
    headers: { 'User-Agent': UA, Referer: BASE_URL + '/' },
  });
  if (!sRes.ok) return null;
  var html = await sRes.text();
  var $ = cheerio.load(html);
  var normQ = normalizeTitle(title);
  var href = '';

  $('a').each(function (i, el) {
    if (href) return;
    var h = $(el).attr('href') || '';
    var ok = isMovie
      ? h.indexOf('/film/') !== -1
      : h.indexOf('/dizi/') !== -1 && h.indexOf('/sezon-') === -1;
    if (!ok) return;
    var text = normalizeTitle($(el).text());
    if (text.indexOf(normQ) !== -1 || normQ.indexOf(text) !== -1) {
      href = h;
    }
  });

  if (!href) return null;
  if (isMovie) {
    return href.startsWith('http')
      ? href
      : BASE_URL + (href.startsWith('/') ? '' : '/') + href;
  }
  var slug = href.split('/dizi/')[1].replace(/\/$/, '');
  return (
    BASE_URL + '/dizi/' + slug + '/sezon-' + season + '/bolum-' + episode
  );
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    var args = parseStreamArgs(tmdbId, mediaType, seasonNum, episodeNum);
    tmdbId = args.id;
    mediaType = args.mediaType;
    seasonNum = args.season;
    episodeNum = args.episode;

    var isMovie = mediaType === 'movie';
    var season = parseInt(seasonNum, 10) || 1;
    var episode = parseInt(episodeNum, 10) || 1;

    if (typeof tmdbId === 'string' && tmdbId.indexOf('cinemafly_dizimom:ep:') === 0) {
      var epPath = tmdbId.replace('cinemafly_dizimom:ep:', '');
      var epUrl =
        epPath.startsWith('http')
          ? epPath
          : BASE_URL +
            '/dizi/' +
            epPath.replace(/^\//, '');
      return sortStreamsByQuality(
        await streamsFromEpisodePage(epUrl, BASE_URL, '', PROVIDER),
      );
    }

    var info = await resolveMediaInfo(tmdbId, mediaType);
    var labels = [info.origTitle, info.title].filter(Boolean);

    if (!isMovie) {
      var direct = await directEpisodeUrl(info, season, episode);
      if (direct) {
        var got = await streamsFromEpisodePage(
          direct,
          BASE_URL,
          labels[0] || '',
          PROVIDER,
        );
        if (got.length) return sortStreamsByQuality(got);
      }
    }

    for (var q of labels) {
      var pageUrl = await searchEpisodeUrl(q, season, episode, isMovie);
      if (!pageUrl) continue;
      var streams = await streamsFromEpisodePage(
        pageUrl,
        BASE_URL,
        q,
        PROVIDER,
      );
      if (streams.length) return sortStreamsByQuality(streams);
    }

    return [];
  } catch (err) {
    return [];
  }
}

if (typeof module !== 'undefined') {
  module.exports = { getStreams };
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
}