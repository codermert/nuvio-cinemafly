function getQualityScore(s) {
  if (!s || !s.url) return 0;
  var q = ((s.quality || '') + ' ' + (s.title || '') + ' ' + (s.name || '')).toLowerCase();
  var score = 0;
  if (/\b(1080|fhd)\b/.test(q)) score = 1080;
  else if (/\b(720|hd)\b/.test(q)) score = 720;
  else if (/\b480\b/.test(q)) score = 480;
  return score;
}

function sortStreamsByQuality(streams) {
  if (!Array.isArray(streams) || !streams.length) return streams;
  return streams.slice().sort(function (a, b) {
    return getQualityScore(b) - getQualityScore(a);
  });
}

module.exports = { sortStreamsByQuality, getQualityScore };