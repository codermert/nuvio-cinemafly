var UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function mapSubtitles(subs, referer) {
  if (!Array.isArray(subs)) return [];
  return subs
    .filter(function (s) {
      return s && s.src;
    })
    .map(function (s, i) {
      var lang = s.lang || 'tr';
      return {
        id: lang + '-' + i,
        lang: lang === 'tr' ? 'tur' : lang === 'en' ? 'eng' : lang,
        language: lang,
        label: s.label || (lang === 'tr' ? 'Türkçe' : lang),
        url: s.src,
        format: 'vtt',
        type: 'text/vtt',
        headers: { 'User-Agent': UA, Referer: referer },
      };
    });
}

function hasTrDub(audios) {
  if (!Array.isArray(audios)) return false;
  return audios.some(function (a) {
    var t = ((a.label || '') + ' ' + (a.lang || '')).toLowerCase();
    return /dublaj|türkçe|^tr\b/.test(t);
  });
}

function hasOrig(audios) {
  if (!Array.isArray(audios)) return false;
  return audios.some(function (a) {
    var t = ((a.label || '') + ' ' + (a.lang || '')).toLowerCase();
    return /orijinal|english|^en\b/.test(t);
  });
}

/**
 * @param {string} pageUrl — bölüm sayfası
 * @param {string} pageOrigin — örn. https://ddizimom.net
 * @param {string} prefix — akış başlığı öneki
 * @param {string} providerTag — 'DiziMom' vb.
 */
async function streamsFromEpisodePage(pageUrl, pageOrigin, prefix, providerTag) {
  var epRes = await fetch(pageUrl, {
    headers: { 'User-Agent': UA, Referer: pageOrigin + '/' },
  });
  if (!epRes.ok) return [];
  var epHtml = await epRes.text();

  var pvMatch = epHtml.match(/data-pv=["']([a-zA-Z0-9_-]+)["']/i);
  var coreMatch = epHtml.match(
    /src=["'](https:\/\/[^"']*pilavyerplay[^"']*\/assets\/js\/(?:core|c)\.js)["']/i,
  );
  if (!pvMatch) return [];
  var playerBase = 'https://play2.pilavyerplay.top';
  if (coreMatch) {
    playerBase = coreMatch[1].replace(/\/(?:e\/c|assets\/js\/core)\.js.*$/, '');
  }

  var sUrl =
    playerBase +
    '/assets/js/s.php?s=' +
    encodeURIComponent(pvMatch[1]);
  var pRes = await fetch(sUrl, {
    headers: {
      'User-Agent': UA,
      Referer: pageUrl,
      Origin: pageOrigin,
    },
  });
  if (!pRes.ok) return [];
  var pHtml = await pRes.text();
  var playerMatch = pHtml.match(/window\.__PLAYER__\s*=\s*(\{[\s\S]*?\});/);
  if (!playerMatch) return [];
  var pData;
  try {
    pData = JSON.parse(playerMatch[1]);
  } catch (e) {
    return [];
  }
  if (!pData || !pData.stream) return [];

  var subs = mapSubtitles(pData.subs, sUrl);
  var referer = sUrl;
  var reqHeaders = {
    'User-Agent': UA,
    Referer: referer,
    Origin: pageOrigin,
  };
  var hints = {
    notWebReady: true,
    proxyHeaders: { request: reqHeaders },
  };

  var out = [];
  var dub = hasTrDub(pData.audios);
  var orig = hasOrig(pData.audios);

  function pushStream(label, quality) {
    out.push({
      name: providerTag,
      title: '⌜ CinemaFly · ' + providerTag + ' ⌟ | ' + label + ' (' + quality + ' HLS)',
      url: pData.stream,
      quality: quality,
      format: 'hls',
      isHls: true,
      headers: reqHeaders,
      behaviorHints: hints,
      provider: providerTag,
      subtitles: subs,
    });
  }

  if (dub && orig) {
    pushStream((prefix ? prefix + ' · ' : '') + '🇹🇷 Türkçe Dublaj', '720p');
    pushStream((prefix ? prefix + ' · ' : '') + '💬 Orijinal + Altyazı', '720p');
  } else if (subs.length) {
    pushStream((prefix ? prefix + ' · ' : '') + '💬 Türkçe Altyazı', '720p');
  } else {
    pushStream((prefix ? prefix + ' · ' : '') + 'HD', '720p');
  }

  return out;
}

module.exports = { streamsFromEpisodePage, UA };