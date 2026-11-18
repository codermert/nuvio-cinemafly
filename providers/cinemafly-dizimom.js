/**
 * CinemaFly Nuvio — cinemafly-dizimom
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
    function titleToSlug(str) {
      return normalizeTitle2(str).replace(/\s+/g, "-").replace(/^-|-$/g, "");
    }
    function parseStreamArgs(tmdbId, mediaType, seasonNum, episodeNum) {
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
      titleToSlug,
      parseStreamArgs
    };
  }
});

// src/cinemafly-dizimom/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { resolveMediaInfo, normalizeTitle } = require_cinemeta();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v = val("urls.series.dizimom.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://ddizimom.net";
var ID_PREFIX = "cinemafly_dizimom";
var POSTER_FALLBACK = "https://www.google.com/s2/favicons?domain=ddizimom.net&sz=256";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: "https://ddizimom.net/"
};
function resolvePilavyerStream(epUrl, titlePrefix) {
  return __async(this, null, function* () {
    try {
      let oneStream2 = function(label) {
        return {
          name: "CinemaFly \xB7 DiziMom",
          title: "\u231C CinemaFly \xB7 DiziMom \u231F | " + (titlePrefix ? titlePrefix + " \xB7 " : "") + label + " (720p HLS)",
          url: pData.stream,
          quality: "720p",
          format: "hls",
          isHls: true,
          headers: reqHeaders,
          behaviorHints: hints,
          provider: "cinemafly_dizimom",
          subtitles: subs
        };
      };
      var oneStream = oneStream2;
      var epRes = yield fetch(epUrl, { headers: HEADERS });
      if (!epRes.ok) return [];
      var epHtml = yield epRes.text();
      var pvMatch = epHtml.match(/data-pv=["']([^"']+)["']/i);
      var coreMatch = epHtml.match(
        /src=["'](https:\/\/[^"']*pilavyerplay[^"']*\/assets\/js\/(?:core|c)\.js)["']/i
      );
      if (!pvMatch) return [];
      var playerBase = "https://play2.pilavyerplay.top";
      if (coreMatch) {
        playerBase = coreMatch[1].replace(/\/(?:e\/c|assets\/js\/core)\.js.*$/, "");
      }
      var sPhpUrl = playerBase + "/assets/js/s.php?s=" + encodeURIComponent(pvMatch[1]);
      var pRes = yield fetch(sPhpUrl, {
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          Referer: epUrl,
          Origin: "https://ddizimom.net"
        }
      });
      if (!pRes.ok) return [];
      var pHtml = yield pRes.text();
      var playerMatch = pHtml.match(/window\.__PLAYER__\s*=\s*(\{[\s\S]*?\});/);
      if (!playerMatch) return [];
      var pData = JSON.parse(playerMatch[1]);
      if (!pData || !pData.stream) return [];
      var subs = [];
      if (Array.isArray(pData.subs)) {
        subs = pData.subs.map(function(s, i) {
          return {
            id: s.lang || "tr-" + i,
            lang: s.lang === "tr" ? "tur" : s.lang === "en" ? "eng" : s.lang || "tur",
            language: s.lang || "tr",
            label: s.label || (s.lang === "tr" ? "T\xFCrk\xE7e" : "\u0130ngilizce"),
            url: s.src,
            format: "vtt",
            type: "text/vtt",
            headers: {
              "User-Agent": HEADERS["User-Agent"],
              Referer: sPhpUrl,
              Origin: "https://ddizimom.net"
            }
          };
        });
      }
      var reqHeaders = {
        "User-Agent": HEADERS["User-Agent"],
        Referer: sPhpUrl,
        Origin: "https://ddizimom.net"
      };
      var hints = {
        notWebReady: true,
        proxyHeaders: { request: reqHeaders }
      };
      var audios = pData.audios || [];
      var hasDub = audios.some(function(a) {
        return /dublaj|türkçe|^tr\b/i.test((a.label || "") + " " + (a.lang || ""));
      });
      var hasOrig = audios.some(function(a) {
        return /orijinal|english|^en\b/i.test((a.label || "") + " " + (a.lang || ""));
      });
      if (hasDub && hasOrig) {
        return [oneStream2("\u{1F1F9}\u{1F1F7} Dublaj"), oneStream2("\u{1F4AC} Orijinal + Altyaz\u0131")];
      }
      if (subs.length) {
        return [oneStream2("\u{1F4AC} Altyaz\u0131l\u0131")];
      }
      return [oneStream2("HD")];
    } catch (e) {
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbId === "object" && tmdbId !== null) {
        mediaType = tmdbId.type || mediaType;
        seasonNum = tmdbId.season != null ? tmdbId.season : seasonNum;
        episodeNum = tmdbId.episode != null ? tmdbId.episode : episodeNum;
        tmdbId = tmdbId.id;
      }
      if (typeof tmdbId === "string" && tmdbId.indexOf(":") !== -1 && tmdbId.indexOf(ID_PREFIX) !== 0) {
        var parts = tmdbId.split(":");
        if (parts.length >= 3) {
          var s = parseInt(parts[parts.length - 2], 10);
          var e = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(s)) seasonNum = s;
          if (!isNaN(e)) episodeNum = e;
          tmdbId = parts[0];
        }
      }
      if (!mediaType) {
        mediaType = seasonNum !== void 0 && episodeNum !== void 0 ? "tv" : "movie";
      }
      if (typeof tmdbId === "string" && tmdbId.indexOf(ID_PREFIX + ":ep:") === 0) {
        var epSlug = tmdbId.replace(ID_PREFIX + ":ep:", "").replace(/^\//, "");
        var targetEpUrl = epSlug.startsWith("http") ? epSlug : BASE_URL + "/" + (epSlug.indexOf("dizi/") === 0 || epSlug.indexOf("film/") === 0 ? "" : "dizi/") + epSlug;
        return yield resolvePilavyerStream(targetEpUrl);
      }
      if (typeof tmdbId === "string" && tmdbId.indexOf(ID_PREFIX + ":show:") === 0) {
        var showSlug = tmdbId.replace(ID_PREFIX + ":show:", "").replace(/^\//, "");
        var sNum = parseInt(seasonNum, 10) || 1;
        var eNum = parseInt(episodeNum, 10) || 1;
        var directEpUrl = BASE_URL + "/dizi/" + showSlug + "/sezon-" + sNum + "/bolum-" + eNum;
        var directRes = yield resolvePilavyerStream(directEpUrl);
        if (directRes && directRes.length) return directRes;
      }
      var info = yield resolveMediaInfo(tmdbId, mediaType);
      var queries = [info.title, info.origTitle].filter(Boolean);
      if (!queries.length) return [];
      var season = parseInt(seasonNum, 10) || 1;
      var episode = parseInt(episodeNum, 10) || 1;
      var isMovie = mediaType === "movie";
      for (var q of queries) {
        var searchUrl = BASE_URL + "/ara?q=" + encodeURIComponent(q);
        var sRes = yield fetch(searchUrl, { headers: HEADERS });
        if (!sRes.ok) continue;
        var sHtml = yield sRes.text();
        var $ = cheerio.load(sHtml);
        var normQ = normalizeTitle(q);
        var matchedItems = [];
        $("a").each(function(i, el) {
          var href = $(el).attr("href") || "";
          var isDiziLink = href.indexOf("/dizi/") !== -1 && href.indexOf("/sezon-") === -1;
          var isFilmLink = href.indexOf("/film/") !== -1;
          if (!isMovie && isDiziLink || isMovie && isFilmLink) {
            var rawText = $(el).text().trim().replace(/\s+/g, " ");
            var normText = normalizeTitle(rawText);
            if (normText.indexOf(normQ) !== -1 || normQ.indexOf(normText) !== -1) {
              matchedItems.push({ href, title: rawText });
            }
          }
        });
        for (var item of matchedItems.slice(0, 3)) {
          var targetPageUrl = "";
          if (isMovie) {
            targetPageUrl = item.href.startsWith("http") ? item.href : BASE_URL + (item.href.startsWith("/") ? "" : "/") + item.href;
          } else {
            var slug = item.href.split("/dizi/")[1].replace(/\/$/, "");
            targetPageUrl = BASE_URL + "/dizi/" + slug + "/sezon-" + season + "/bolum-" + episode;
          }
          var label = item.title.replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, "").replace(/^Film\s+HD\s+(\d+\.\d+\s+)?/i, "").trim();
          var streams = yield resolvePilavyerStream(targetPageUrl, label);
          if (streams && streams.length) return streams;
        }
      }
      return [];
    } catch (err) {
      return [];
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      let pushFromHtml2 = function(html) {
        var $ = cheerio.load(html);
        $("a").each(function(i, el) {
          var href = $(el).attr("href") || "";
          if (href.indexOf("/dizi/") === -1 || href.indexOf("/sezon-") !== -1) return;
          var slug = href.split("/dizi/")[1].replace(/\/$/, "");
          if (!slug || seen[slug]) return;
          seen[slug] = true;
          var rawTitle = $(el).text().trim().replace(/\s+/g, " ");
          var title = rawTitle.replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, "").replace(/\s+\d{4}$/, "").trim() || slug;
          var img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || "";
          var poster = img.indexOf("http") === 0 ? img : POSTER_FALLBACK;
          metas.push({
            id: ID_PREFIX + ":show:" + slug,
            type: "tv",
            name: title,
            poster,
            background: poster,
            genres: ["Dizi", "CinemaFly"],
            description: title + " \u2014 DiziMom"
          });
        });
      };
      var pushFromHtml = pushFromHtml2;
      var query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      var metas = [];
      var seen = {};
      if (query) {
        var searchUrl = BASE_URL + "/ara?q=" + encodeURIComponent(query);
        var sRes = yield fetch(searchUrl, { headers: HEADERS });
        if (!sRes.ok) return { metas: [] };
        pushFromHtml2(yield sRes.text());
        return { metas };
      }
      var res = yield fetch(BASE_URL + "/diziler", { headers: HEADERS });
      if (!res.ok) return { metas: [] };
      pushFromHtml2(yield res.text());
      return { metas };
    } catch (e) {
      return { metas: [] };
    }
  });
}
function getMeta(args) {
  return __async(this, null, function* () {
    try {
      var rawId = typeof args === "string" ? args : args && args.id ? args.id : "";
      if (!rawId) return { meta: null };
      if (rawId.indexOf(ID_PREFIX + ":show:") === 0) {
        var showSlug = rawId.replace(ID_PREFIX + ":show:", "");
        var showUrl = BASE_URL + "/dizi/" + showSlug;
        var res = yield fetch(showUrl, { headers: HEADERS });
        if (!res.ok) return { meta: null };
        var html = yield res.text();
        var $ = cheerio.load(html);
        var titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        var rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : showSlug;
        var title = rawTitle.replace(/\s*izle\s*$/i, "").replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, "").trim();
        var ogImg = html.match(
          /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
        );
        var poster = ogImg ? ogImg[1] : POSTER_FALLBACK;
        var desc = $('meta[name="description"]').attr("content") || title + " \u2014 CinemaFly DiziMom";
        var videos = [];
        var seen = {};
        $("a").each(function(i, el) {
          var href = $(el).attr("href") || "";
          var m = href.match(/\/sezon-(\d+)\/bolum-(\d+)/);
          if (!m) return;
          var sNum = parseInt(m[1], 10);
          var eNum = parseInt(m[2], 10);
          var epKey = sNum + ":" + eNum;
          if (seen[epKey]) return;
          seen[epKey] = true;
          videos.push({
            id: ID_PREFIX + ":ep:" + showSlug + "/sezon-" + sNum + "/bolum-" + eNum,
            title: $(el).text().trim().replace(/\s+/g, " ") || sNum + ". Sezon " + eNum + ". B\xF6l\xFCm",
            season: sNum,
            episode: eNum
          });
        });
        videos.sort(function(a, b) {
          return a.season - b.season || a.episode - b.episode;
        });
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: title,
            poster,
            background: poster,
            description: desc,
            genres: ["Dizi", "CinemaFly"],
            videos
          }
        };
      }
      if (rawId.indexOf(ID_PREFIX + ":ep:") === 0) {
        var epSlug = rawId.replace(ID_PREFIX + ":ep:", "").replace(/^\//, "");
        var epUrl = BASE_URL + "/dizi/" + epSlug;
        var epRes = yield fetch(epUrl, { headers: HEADERS });
        if (!epRes.ok) return { meta: null };
        var epHtml = yield epRes.text();
        var epTitleMatch = epHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || epHtml.match(/<title>([^<]+)<\/title>/i);
        var epTitle = epTitleMatch ? epTitleMatch[1].replace(/<[^>]+>/g, "").trim() : "B\xF6l\xFCm";
        var epOg = epHtml.match(
          /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
        );
        var epPoster = epOg ? epOg[1] : POSTER_FALLBACK;
        var sM = epSlug.match(/sezon-(\d+)/i);
        var eM = epSlug.match(/bolum-(\d+)/i);
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: epTitle,
            poster: epPoster,
            background: epPoster,
            description: epTitle + " \u2014 CinemaFly DiziMom",
            genres: ["Dizi", "CinemaFly"],
            videos: [
              {
                id: rawId,
                title: epTitle,
                season: sM ? parseInt(sM[1], 10) : 1,
                episode: eM ? parseInt(eM[1], 10) : 1
              }
            ]
          }
        };
      }
      return { meta: null };
    } catch (e) {
      return { meta: null };
    }
  });
}
if (typeof getStreams === "function") {
  _origGetStreams = getStreams;
  getStreams = function() {
    return __async(this, arguments, function* () {
      var res = yield _origGetStreams.apply(this, arguments);
      return sortStreamsByQuality(res);
    });
  };
}
var _origGetStreams;
if (typeof module !== "undefined") {
  module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
  if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
  if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
  if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
  if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}
