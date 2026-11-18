/**
 * CinemaFly Nuvio — cinemafly-dizibox
 * v1.0.1
 */

var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/shared/quality.js
var require_quality = __commonJS({
  "src/shared/quality.js"(exports2, module2) {
    function getQualityScore(s) {
      if (!s || !s.url) return 0;
      var q = ((s.quality || "") + " " + (s.title || "") + " " + (s.name || "")).toLowerCase();
      var score = 0;
      if (/\b(1080|fhd)\b/.test(q)) score = 1080;
      else if (/\b(720|hd)\b/.test(q)) score = 720;
      else if (/\b480\b/.test(q)) score = 480;
      return score;
    }
    function sortStreamsByQuality2(streams) {
      if (!Array.isArray(streams) || !streams.length) return streams;
      return streams.slice().sort(function(a, b) {
        return getQualityScore(b) - getQualityScore(a);
      });
    }
    module2.exports = { sortStreamsByQuality: sortStreamsByQuality2, getQualityScore };
  }
});

// src/shared/cinemeta.js
var require_cinemeta = __commonJS({
  "src/shared/cinemeta.js"(exports2, module2) {
    function resolveMediaInfo2(id, mediaType) {
      return __async(this, null, function* () {
        var clean = String(id || "").trim().replace(/^(?:movie|tv|series|tmdb|imdb):+/i, "");
        if (clean.includes(":")) clean = clean.split(":")[0];
        var type = mediaType === "movie" ? "movie" : "series";
        if (!clean.startsWith("tt") && !clean.startsWith("tmdb")) {
          return { title: "", origTitle: "", id: clean };
        }
        var metaId = clean.startsWith("tt") ? clean : "tmdb:" + clean;
        var url = "https://v3-cinemeta.strem.io/meta/" + type + "/" + encodeURIComponent(metaId) + ".json";
        try {
          var res = yield fetch(url, {
            headers: { Accept: "application/json" }
          });
          if (!res.ok) return { title: "", origTitle: "", id: clean };
          var body = yield res.json();
          var m = body && body.meta;
          if (!m) return { title: "", origTitle: "", id: clean };
          return {
            title: m.name || "",
            origTitle: m.originalTitle || m.name || "",
            id: clean
          };
        } catch (e) {
          return { title: "", origTitle: "", id: clean };
        }
      });
    }
    function normalizeTitle2(str) {
      if (!str) return "";
      return String(str).toLowerCase().replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    }
    function titleToSlug2(str) {
      return normalizeTitle2(str).replace(/\s+/g, "-").replace(/^-|-$/g, "");
    }
    function parseStreamArgs2(tmdbId, mediaType, seasonNum, episodeNum) {
      if (typeof tmdbId === "object" && tmdbId !== null) {
        mediaType = tmdbId.type || mediaType;
        seasonNum = tmdbId.season != null ? tmdbId.season : seasonNum;
        episodeNum = tmdbId.episode != null ? tmdbId.episode : episodeNum;
        tmdbId = tmdbId.id;
      }
      if (typeof tmdbId === "string" && !String(tmdbId).startsWith("cinemafly_")) {
        var tail = tmdbId.match(/^(.*):(\d+):(\d+)$/);
        if (tail) {
          tmdbId = tail[1];
          seasonNum = parseInt(tail[2], 10);
          episodeNum = parseInt(tail[3], 10);
        }
      }
      if (!mediaType) {
        mediaType = seasonNum !== void 0 && episodeNum !== void 0 ? "tv" : "movie";
      }
      return { id: tmdbId, mediaType, season: seasonNum, episode: episodeNum };
    }
    module2.exports = {
      resolveMediaInfo: resolveMediaInfo2,
      normalizeTitle: normalizeTitle2,
      titleToSlug: titleToSlug2,
      parseStreamArgs: parseStreamArgs2
    };
  }
});

// src/shared/pilavyer.js
var require_pilavyer = __commonJS({
  "src/shared/pilavyer.js"(exports2, module2) {
    var UA2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    function mapSubtitles(subs, referer) {
      if (!Array.isArray(subs)) return [];
      return subs.filter(function(s) {
        return s && s.src;
      }).map(function(s, i) {
        var lang = s.lang || "tr";
        return {
          id: lang + "-" + i,
          lang: lang === "tr" ? "tur" : lang === "en" ? "eng" : lang,
          language: lang,
          label: s.label || (lang === "tr" ? "T\xFCrk\xE7e" : lang),
          url: s.src,
          format: "vtt",
          type: "text/vtt",
          headers: { "User-Agent": UA2, Referer: referer }
        };
      });
    }
    function hasTrDub(audios) {
      if (!Array.isArray(audios)) return false;
      return audios.some(function(a) {
        var t = ((a.label || "") + " " + (a.lang || "")).toLowerCase();
        return /dublaj|türkçe|^tr\b/.test(t);
      });
    }
    function hasOrig(audios) {
      if (!Array.isArray(audios)) return false;
      return audios.some(function(a) {
        var t = ((a.label || "") + " " + (a.lang || "")).toLowerCase();
        return /orijinal|english|^en\b/.test(t);
      });
    }
    function streamsFromEpisodePage2(pageUrl, pageOrigin, prefix, providerTag) {
      return __async(this, null, function* () {
        var epRes = yield fetch(pageUrl, {
          headers: { "User-Agent": UA2, Referer: pageOrigin + "/" }
        });
        if (!epRes.ok) return [];
        var epHtml = yield epRes.text();
        var pvMatch = epHtml.match(/data-pv=["']([a-zA-Z0-9_-]+)["']/i);
        var coreMatch = epHtml.match(
          /src=["'](https:\/\/[^"']*pilavyerplay[^"']*\/assets\/js\/(?:core|c)\.js)["']/i
        );
        if (!pvMatch) return [];
        var playerBase = "https://play2.pilavyerplay.top";
        if (coreMatch) {
          playerBase = coreMatch[1].replace(/\/(?:e\/c|assets\/js\/core)\.js.*$/, "");
        }
        var sUrl = playerBase + "/assets/js/s.php?s=" + encodeURIComponent(pvMatch[1]);
        var pRes = yield fetch(sUrl, {
          headers: {
            "User-Agent": UA2,
            Referer: pageUrl,
            Origin: pageOrigin
          }
        });
        if (!pRes.ok) return [];
        var pHtml = yield pRes.text();
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
          "User-Agent": UA2,
          Referer: referer,
          Origin: pageOrigin
        };
        var hints = {
          notWebReady: true,
          proxyHeaders: { request: reqHeaders }
        };
        var out = [];
        var dub = hasTrDub(pData.audios);
        var orig = hasOrig(pData.audios);
        function pushStream(label, quality) {
          out.push({
            name: providerTag,
            title: "\u231C CinemaFly \xB7 " + providerTag + " \u231F | " + label + " (" + quality + " HLS)",
            url: pData.stream,
            quality,
            format: "hls",
            isHls: true,
            headers: reqHeaders,
            behaviorHints: hints,
            provider: providerTag,
            subtitles: subs
          });
        }
        if (dub && orig) {
          pushStream((prefix ? prefix + " \xB7 " : "") + "\u{1F1F9}\u{1F1F7} T\xFCrk\xE7e Dublaj", "720p");
          pushStream((prefix ? prefix + " \xB7 " : "") + "\u{1F4AC} Orijinal + Altyaz\u0131", "720p");
        } else if (subs.length) {
          pushStream((prefix ? prefix + " \xB7 " : "") + "\u{1F4AC} T\xFCrk\xE7e Altyaz\u0131", "720p");
        } else {
          pushStream((prefix ? prefix + " \xB7 " : "") + "HD", "720p");
        }
        return out;
      });
    }
    module2.exports = { streamsFromEpisodePage: streamsFromEpisodePage2, UA: UA2 };
  }
});

// src/shared/config.js
var require_config = __commonJS({
  "src/shared/config.js"(exports2, module2) {
    function loadConfig2() {
      return Promise.resolve({});
    }
    function val2() {
      return void 0;
    }
    function wrapAll2(obj, pre) {
      var out = {};
      for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        if (typeof obj[k] === "function") {
          (function(name, fn) {
            out[name] = function() {
              var self = this;
              var args = arguments;
              var chain = pre ? pre() : Promise.resolve();
              return chain.then(function() {
                return fn.apply(self, args);
              });
            };
          })(k, obj[k]);
        } else {
          out[k] = obj[k];
        }
      }
      return out;
    }
    module2.exports = { loadConfig: loadConfig2, val: val2, wrapAll: wrapAll2 };
  }
});

// src/cinemafly-dizibox/index.js
var { sortStreamsByQuality } = require_quality();
var {
  resolveMediaInfo,
  normalizeTitle,
  titleToSlug,
  parseStreamArgs
} = require_cinemeta();
var { streamsFromEpisodePage, UA } = require_pilavyer();
var cheerio;
try {
  cheerio = require("cheerio-without-node-native");
} catch (e) {
  cheerio = null;
}
var BASE_URL = "https://ddizibox.net";
var PROVIDER = "DiziBOX";
function directEpisodeUrl(info, season, episode) {
  return __async(this, null, function* () {
    var slugs = [titleToSlug(info.origTitle), titleToSlug(info.title)].filter(
      Boolean
    );
    var seen = {};
    for (var i = 0; i < slugs.length; i++) {
      if (seen[slugs[i]]) continue;
      seen[slugs[i]] = true;
      var url = BASE_URL + "/dizi/" + slugs[i] + "/sezon-" + season + "/bolum-" + episode;
      var res = yield fetch(url, {
        headers: { "User-Agent": UA, Referer: BASE_URL + "/" }
      });
      if (!res.ok) continue;
      var html = yield res.text();
      if (/data-pv=["'][^"']+["']/i.test(html)) return url;
    }
    return null;
  });
}
function searchEpisodeUrl(title, season, episode, isMovie) {
  return __async(this, null, function* () {
    if (!cheerio) return null;
    var searchUrl = BASE_URL + "/ara?q=" + encodeURIComponent(title);
    var sRes = yield fetch(searchUrl, {
      headers: { "User-Agent": UA, Referer: BASE_URL + "/" }
    });
    if (!sRes.ok) return null;
    var html = yield sRes.text();
    var $ = cheerio.load(html);
    var normQ = normalizeTitle(title);
    var href = "";
    $("a").each(function(i, el) {
      if (href) return;
      var h = $(el).attr("href") || "";
      var path = h.replace(/^https?:\/\/[^/]+/, "");
      var ok = isMovie ? path.indexOf("/film/") !== -1 : path.indexOf("/dizi/") !== -1 && path.indexOf("/sezon-") === -1;
      if (!ok) return;
      var text = normalizeTitle($(el).text());
      if (text.indexOf(normQ) !== -1 || normQ.indexOf(text) !== -1) {
        href = h.startsWith("http") ? h : BASE_URL + path;
      }
    });
    if (!href) return null;
    if (isMovie) return href;
    var slug = href.split("/dizi/")[1].replace(/\/$/, "");
    return BASE_URL + "/dizi/" + slug + "/sezon-" + season + "/bolum-" + episode;
  });
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      var args = parseStreamArgs(tmdbId, mediaType, seasonNum, episodeNum);
      mediaType = args.mediaType;
      var isMovie = mediaType === "movie";
      var season = parseInt(args.season, 10) || 1;
      var episode = parseInt(args.episode, 10) || 1;
      var info = yield resolveMediaInfo(args.id, mediaType);
      var labels = [info.origTitle, info.title].filter(Boolean);
      if (!isMovie) {
        var direct = yield directEpisodeUrl(info, season, episode);
        if (direct) {
          var got = yield streamsFromEpisodePage(
            direct,
            BASE_URL,
            labels[0] || "",
            PROVIDER
          );
          if (got.length) return sortStreamsByQuality(got);
        }
      }
      for (var q of labels) {
        var pageUrl = yield searchEpisodeUrl(q, season, episode, isMovie);
        if (!pageUrl) continue;
        var streams = yield streamsFromEpisodePage(
          pageUrl,
          BASE_URL,
          q,
          PROVIDER
        );
        if (streams.length) return sortStreamsByQuality(streams);
      }
      return [];
    } catch (err) {
      return [];
    }
  });
}
var { wrapAll, loadConfig, val } = require_config();
var _cfgReady = loadConfig();
if (typeof getStreams === "function") {
  _orig = getStreams;
  getStreams = function() {
    return __async(this, arguments, function* () {
      return sortStreamsByQuality(yield _orig.apply(this, arguments));
    });
  };
}
var _orig;
if (typeof module !== "undefined") {
  module.exports = wrapAll({ getStreams }, function() {
    return _cfgReady;
  });
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
  if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
  if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
  if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
  if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}
