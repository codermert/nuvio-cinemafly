const { sortStreamsByQuality } = require('../shared/quality.js');
const { loadConfig, val, wrapAll } = require('../shared/config.js');
const { resolveMediaInfo, normalizeTitle } = require('../shared/cinemeta.js');

var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function () {
      var v = val('urls.series.dizimom.base');
      if (v) BASE_URL = String(v).replace(/\/+$/, '');
      if (HEADERS) HEADERS.Referer = BASE_URL + '/';
    });
  }
  return _cfgReady;
}

var cheerio = require('cheerio-without-node-native');

var BASE_URL = 'https://ddizimom.net';
var ID_PREFIX = 'cinemafly_dizimom';
var POSTER_FALLBACK =
  'https://www.google.com/s2/favicons?domain=ddizimom.net&sz=256';

var HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Referer: 'https://ddizimom.net/',
};

async function resolvePilavyerStream(epUrl, titlePrefix) {
  try {
    var epRes = await fetch(epUrl, { headers: HEADERS });
    if (!epRes.ok) return [];
    var epHtml = await epRes.text();
    var pvMatch = epHtml.match(/data-pv=["']([^"']+)["']/i);
    var coreMatch = epHtml.match(
      /src=["'](https:\/\/[^"']*pilavyerplay[^"']*\/assets\/js\/(?:core|c)\.js)["']/i,
    );
    if (!pvMatch) return [];
    var playerBase = 'https://play2.pilavyerplay.top';
    if (coreMatch) {
      playerBase = coreMatch[1].replace(/\/(?:e\/c|assets\/js\/core)\.js.*$/, '');
    }
    var sPhpUrl =
      playerBase + '/assets/js/s.php?s=' + encodeURIComponent(pvMatch[1]);
    var pRes = await fetch(sPhpUrl, {
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        Referer: epUrl,
        Origin: 'https://ddizimom.net',
      },
    });
    if (!pRes.ok) return [];
    var pHtml = await pRes.text();
    var playerMatch = pHtml.match(/window\.__PLAYER__\s*=\s*(\{[\s\S]*?\});/);
    if (!playerMatch) return [];
    var pData = JSON.parse(playerMatch[1]);
    if (!pData || !pData.stream) return [];

    var subs = [];
    if (Array.isArray(pData.subs)) {
      subs = pData.subs.map(function (s, i) {
        return {
          id: s.lang || 'tr-' + i,
          lang: s.lang === 'tr' ? 'tur' : s.lang === 'en' ? 'eng' : s.lang || 'tur',
          language: s.lang || 'tr',
          label: s.label || (s.lang === 'tr' ? 'Türkçe' : 'İngilizce'),
          url: s.src,
          format: 'vtt',
          type: 'text/vtt',
          headers: {
            'User-Agent': HEADERS['User-Agent'],
            Referer: sPhpUrl,
            Origin: 'https://ddizimom.net',
          },
        };
      });
    }

    var reqHeaders = {
      'User-Agent': HEADERS['User-Agent'],
      Referer: sPhpUrl,
      Origin: 'https://ddizimom.net',
    };
    var hints = {
      notWebReady: true,
      proxyHeaders: { request: reqHeaders },
    };

    var audios = pData.audios || [];
    var hasDub = audios.some(function (a) {
      return /dublaj|türkçe|^tr\b/i.test((a.label || '') + ' ' + (a.lang || ''));
    });
    var hasOrig = audios.some(function (a) {
      return /orijinal|english|^en\b/i.test((a.label || '') + ' ' + (a.lang || ''));
    });

    function oneStream(label) {
      return {
        name: 'CinemaFly · DiziMom',
        title:
          '⌜ CinemaFly · DiziMom ⌟ | ' +
          (titlePrefix ? titlePrefix + ' · ' : '') +
          label +
          ' (720p HLS)',
        url: pData.stream,
        quality: '720p',
        format: 'hls',
        isHls: true,
        headers: reqHeaders,
        behaviorHints: hints,
        provider: 'cinemafly_dizimom',
        subtitles: subs,
      };
    }

    if (hasDub && hasOrig) {
      return [oneStream('🇹🇷 Dublaj'), oneStream('💬 Orijinal + Altyazı')];
    }
    if (subs.length) {
      return [oneStream('💬 Altyazılı')];
    }
    return [oneStream('HD')];
  } catch (e) {
    return [];
  }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    if (typeof tmdbId === 'object' && tmdbId !== null) {
      mediaType = tmdbId.type || mediaType;
      seasonNum = tmdbId.season != null ? tmdbId.season : seasonNum;
      episodeNum = tmdbId.episode != null ? tmdbId.episode : episodeNum;
      tmdbId = tmdbId.id;
    }
    if (
      typeof tmdbId === 'string' &&
      tmdbId.indexOf(':') !== -1 &&
      tmdbId.indexOf(ID_PREFIX) !== 0
    ) {
      var parts = tmdbId.split(':');
      if (parts.length >= 3) {
        var s = parseInt(parts[parts.length - 2], 10);
        var e = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(s)) seasonNum = s;
        if (!isNaN(e)) episodeNum = e;
        tmdbId = parts[0];
      }
    }
    if (!mediaType) {
      mediaType =
        seasonNum !== undefined && episodeNum !== undefined ? 'tv' : 'movie';
    }

    if (typeof tmdbId === 'string' && tmdbId.indexOf(ID_PREFIX + ':ep:') === 0) {
      var epSlug = tmdbId.replace(ID_PREFIX + ':ep:', '').replace(/^\//, '');
      var targetEpUrl = epSlug.startsWith('http')
        ? epSlug
        : BASE_URL +
          '/' +
          (epSlug.indexOf('dizi/') === 0 || epSlug.indexOf('film/') === 0
            ? ''
            : 'dizi/') +
          epSlug;
      return await resolvePilavyerStream(targetEpUrl);
    }
    if (typeof tmdbId === 'string' && tmdbId.indexOf(ID_PREFIX + ':show:') === 0) {
      var showSlug = tmdbId.replace(ID_PREFIX + ':show:', '').replace(/^\//, '');
      var sNum = parseInt(seasonNum, 10) || 1;
      var eNum = parseInt(episodeNum, 10) || 1;
      var directEpUrl =
        BASE_URL + '/dizi/' + showSlug + '/sezon-' + sNum + '/bolum-' + eNum;
      var directRes = await resolvePilavyerStream(directEpUrl);
      if (directRes && directRes.length) return directRes;
    }

    var info = await resolveMediaInfo(tmdbId, mediaType);
    var queries = [info.title, info.origTitle].filter(Boolean);
    if (!queries.length) return [];

    var season = parseInt(seasonNum, 10) || 1;
    var episode = parseInt(episodeNum, 10) || 1;
    var isMovie = mediaType === 'movie';

    for (var q of queries) {
      var searchUrl = BASE_URL + '/ara?q=' + encodeURIComponent(q);
      var sRes = await fetch(searchUrl, { headers: HEADERS });
      if (!sRes.ok) continue;
      var sHtml = await sRes.text();
      var $ = cheerio.load(sHtml);
      var normQ = normalizeTitle(q);
      var matchedItems = [];

      $('a').each(function (i, el) {
        var href = $(el).attr('href') || '';
        var isDiziLink = href.indexOf('/dizi/') !== -1 && href.indexOf('/sezon-') === -1;
        var isFilmLink = href.indexOf('/film/') !== -1;
        if ((!isMovie && isDiziLink) || (isMovie && isFilmLink)) {
          var rawText = $(el).text().trim().replace(/\s+/g, ' ');
          var normText = normalizeTitle(rawText);
          if (normText.indexOf(normQ) !== -1 || normQ.indexOf(normText) !== -1) {
            matchedItems.push({ href: href, title: rawText });
          }
        }
      });

      for (var item of matchedItems.slice(0, 3)) {
        var targetPageUrl = '';
        if (isMovie) {
          targetPageUrl = item.href.startsWith('http')
            ? item.href
            : BASE_URL + (item.href.startsWith('/') ? '' : '/') + item.href;
        } else {
          var slug = item.href.split('/dizi/')[1].replace(/\/$/, '');
          targetPageUrl =
            BASE_URL + '/dizi/' + slug + '/sezon-' + season + '/bolum-' + episode;
        }
        var label = item.title
          .replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, '')
          .replace(/^Film\s+HD\s+(\d+\.\d+\s+)?/i, '')
          .trim();
        var streams = await resolvePilavyerStream(targetPageUrl, label);
        if (streams && streams.length) return streams;
      }
    }
    return [];
  } catch (err) {
    return [];
  }
}

async function getCatalog(args) {
  try {
    var query =
      (args && args.search) ||
      (args && args.extra && args.extra.search) ||
      (args && args.query) ||
      '';
    var metas = [];
    var seen = {};

    function pushFromHtml(html) {
      var $ = cheerio.load(html);
      $('a').each(function (i, el) {
        var href = $(el).attr('href') || '';
        if (href.indexOf('/dizi/') === -1 || href.indexOf('/sezon-') !== -1) return;
        var slug = href.split('/dizi/')[1].replace(/\/$/, '');
        if (!slug || seen[slug]) return;
        seen[slug] = true;
        var rawTitle = $(el).text().trim().replace(/\s+/g, ' ');
        var title =
          rawTitle
            .replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, '')
            .replace(/\s+\d{4}$/, '')
            .trim() || slug;
        var img =
          $(el).find('img').attr('src') ||
          $(el).find('img').attr('data-src') ||
          '';
        var poster = img.indexOf('http') === 0 ? img : POSTER_FALLBACK;
        metas.push({
          id: ID_PREFIX + ':show:' + slug,
          type: 'tv',
          name: title,
          poster: poster,
          background: poster,
          genres: ['Dizi', 'CinemaFly'],
          description: title + ' — DiziMom',
        });
      });
    }

    if (query) {
      var searchUrl = BASE_URL + '/ara?q=' + encodeURIComponent(query);
      var sRes = await fetch(searchUrl, { headers: HEADERS });
      if (!sRes.ok) return { metas: [] };
      pushFromHtml(await sRes.text());
      return { metas: metas };
    }

    var res = await fetch(BASE_URL + '/diziler', { headers: HEADERS });
    if (!res.ok) return { metas: [] };
    pushFromHtml(await res.text());
    return { metas: metas };
  } catch (e) {
    return { metas: [] };
  }
}

async function getMeta(args) {
  try {
    var rawId =
      typeof args === 'string' ? args : args && args.id ? args.id : '';
    if (!rawId) return { meta: null };

    if (rawId.indexOf(ID_PREFIX + ':show:') === 0) {
      var showSlug = rawId.replace(ID_PREFIX + ':show:', '');
      var showUrl = BASE_URL + '/dizi/' + showSlug;
      var res = await fetch(showUrl, { headers: HEADERS });
      if (!res.ok) return { meta: null };
      var html = await res.text();
      var $ = cheerio.load(html);
      var titleMatch =
        html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
        html.match(/<title>([^<]+)<\/title>/i);
      var rawTitle = titleMatch
        ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
        : showSlug;
      var title = rawTitle
        .replace(/\s*izle\s*$/i, '')
        .replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, '')
        .trim();
      var ogImg = html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      );
      var poster = ogImg ? ogImg[1] : POSTER_FALLBACK;
      var desc =
        $('meta[name="description"]').attr('content') ||
        title + ' — CinemaFly DiziMom';
      var videos = [];
      var seen = {};
      $('a').each(function (i, el) {
        var href = $(el).attr('href') || '';
        var m = href.match(/\/sezon-(\d+)\/bolum-(\d+)/);
        if (!m) return;
        var sNum = parseInt(m[1], 10);
        var eNum = parseInt(m[2], 10);
        var epKey = sNum + ':' + eNum;
        if (seen[epKey]) return;
        seen[epKey] = true;
        videos.push({
          id:
            ID_PREFIX +
            ':ep:' +
            showSlug +
            '/sezon-' +
            sNum +
            '/bolum-' +
            eNum,
          title:
            $(el).text().trim().replace(/\s+/g, ' ') ||
            sNum + '. Sezon ' + eNum + '. Bölüm',
          season: sNum,
          episode: eNum,
        });
      });
      videos.sort(function (a, b) {
        return a.season - b.season || a.episode - b.episode;
      });
      return {
        meta: {
          id: rawId,
          type: 'tv',
          name: title,
          poster: poster,
          background: poster,
          description: desc,
          genres: ['Dizi', 'CinemaFly'],
          videos: videos,
        },
      };
    }

    if (rawId.indexOf(ID_PREFIX + ':ep:') === 0) {
      var epSlug = rawId.replace(ID_PREFIX + ':ep:', '').replace(/^\//, '');
      var epUrl = BASE_URL + '/dizi/' + epSlug;
      var epRes = await fetch(epUrl, { headers: HEADERS });
      if (!epRes.ok) return { meta: null };
      var epHtml = await epRes.text();
      var epTitleMatch =
        epHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
        epHtml.match(/<title>([^<]+)<\/title>/i);
      var epTitle = epTitleMatch
        ? epTitleMatch[1].replace(/<[^>]+>/g, '').trim()
        : 'Bölüm';
      var epOg = epHtml.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      );
      var epPoster = epOg ? epOg[1] : POSTER_FALLBACK;
      var sM = epSlug.match(/sezon-(\d+)/i);
      var eM = epSlug.match(/bolum-(\d+)/i);
      return {
        meta: {
          id: rawId,
          type: 'tv',
          name: epTitle,
          poster: epPoster,
          background: epPoster,
          description: epTitle + ' — CinemaFly DiziMom',
          genres: ['Dizi', 'CinemaFly'],
          videos: [
            {
              id: rawId,
              title: epTitle,
              season: sM ? parseInt(sM[1], 10) : 1,
              episode: eM ? parseInt(eM[1], 10) : 1,
            },
          ],
        },
      };
    }
    return { meta: null };
  } catch (e) {
    return { meta: null };
  }
}

if (typeof getStreams === 'function') {
  var _origGetStreams = getStreams;
  getStreams = async function () {
    var res = await _origGetStreams.apply(this, arguments);
    return sortStreamsByQuality(res);
  };
}

if (typeof module !== 'undefined') {
  module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}