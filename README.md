# CinemaFly — Nuvio Plugin Deposu

Türkçe film ve dizi için Nuvio **plugin (scraper) deposu**.  
`manifest.json` listeler; `providers/*.js` dosyaları cihazınızda (QuickJS) çalışır.

## Nuvio kurulum

1. **Nuvio** → **Ayarlar** → **İçerik & Keşif** → **Pluginler** → **Depo Ekle**
2. Depo URL:

```text
https://raw.githubusercontent.com/codermert/nuvio-cinemafly/main/manifest.json
```

3. Depoyu yenileyin; **CinemaFly · DiziMom** ve **CinemaFly · DiziBOX** sağlayıcılarını etkinleştirin.

Yerel test: `npx serve .` ile bu klasörü yayınlayıp çıkan adresi depo URL’si yapın.

## Geliştirme

```bash
npm install
npm run build
```

Kaynak: `src/<provider>/index.js` → `providers/<provider>.js`

## Sağlayıcılar

| Ad | Site |
|----|------|
| CinemaFly · DiziMom | ddizimom.net |
| CinemaFly · DiziBOX | ddizibox.net |

Başlık eşleştirme: [Cinemeta](https://v3-cinemeta.strem.io) (TMDB API anahtarı yok).