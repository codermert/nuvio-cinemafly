#!/usr/bin/env node
/** src/<provider>/index.js → providers/<provider>.js */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const pkg = require('./package.json');
const srcDir = path.join(__dirname, 'src');
const outDir = path.join(__dirname, 'providers');

const EXTERNAL = [
  'cheerio-without-node-native',
  'react-native-cheerio',
  'cheerio',
  'crypto-js',
  'axios',
  'path',
  'fs',
];

function providersToBuild() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  if (args.length) return args;
  return fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'shared')
    .map((d) => d.name);
}

async function buildOne(name, opts) {
  const entry = path.join(srcDir, name, 'index.js');
  const out = path.join(outDir, `${name}.js`);
  if (!fs.existsSync(entry)) {
    console.warn(`skip ${name}: no index.js`);
    return false;
  }
  fs.mkdirSync(outDir, { recursive: true });
  const banner = `/**\n * CinemaFly Nuvio — ${name}\n * v${pkg.version}\n */\n`;
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    outfile: out,
    format: 'cjs',
    platform: 'neutral',
    target: 'es2016',
    minify: Boolean(opts.minify),
    external: EXTERNAL,
    banner: { js: banner },
    footer: {
      js: `
if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
  if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
  if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
  if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
  if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}`,
    },
  });
  console.log(`✓ ${name}`);
  return true;
}

async function main() {
  const minify = process.argv.includes('--minify');
  const list = providersToBuild();
  for (const p of list) await buildOne(p, { minify });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});