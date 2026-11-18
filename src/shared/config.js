function loadConfig() {
  return Promise.resolve({});
}

function val() {
  return undefined;
}

function wrapAll(obj, pre) {
  var out = {};
  for (var k in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    if (typeof obj[k] === 'function') {
      (function (name, fn) {
        out[name] = function () {
          var self = this;
          var args = arguments;
          var chain = pre ? pre() : Promise.resolve();
          return chain.then(function () {
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

module.exports = { loadConfig, val, wrapAll };