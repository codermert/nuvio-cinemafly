# Nuvio — CinemaFly nereye eklenir?

Nuvio’da **iki ayrı menü** var; karıştırınca `manifest’te id eksik` benzeri hatalar çıkar.

## Pluginler (scraper — DiziMom / DiziBOX)

Cihazında çalışan JS motorları. **Buraya** GitHub plugin deposunu ekle:

```text
https://raw.githubusercontent.com/codermert/nuvio-cinemafly/main/manifest.json
```

Yol: **Ayarlar → İçerik & Keşif → Pluginler → Depo ekle**

## Eklentiler / Addons (Stremio protokolü)

Uzak sunucudan stream döner. **Plugin manifest’ini buraya yazma** — `scrapers` alanı var, Stremio manifest’i değil.

CinemaFly Worker eklentisi:

```text
https://trcinema.salam.workers.dev/manifest.json
```

veya sadece kök:

```text
https://trcinema.salam.workers.dev
```

Yol: **Ayarlar → Eklentiler / Addons → Eklenti ekle**

---

Özet: **DiziMom için Pluginler**; **Worker listesi için Eklentiler**.

## “Playback isn’t available” (diziler)

1. **Eklenti** ekli mi? (`https://trcinema.salam.workers.dev/manifest.json` — **Eklentiler** menüsü, Plugins değil.)
2. Eklentiyi **kaldırıp yeniden ekle** veya **Yenile** — sürüm **1.0.51+** olmalı (Nuvio dizilerde `tv` tipi kullanıyor; eski sürüm boş stream döndürüyordu).
3. **Plugin** deposu **1.0.3+**, CinemaFly · DiziMom açık.
4. Kurulu **TMDB meta eklentisi** varsa bir süre **kapat** (bazı Nuvio sürümlerinde oynatmayı blokluyor).
5. Oynatınca **kaynak listesi** gelmeli; gelmiyorsa profil / cihazda eklenti senkronunu kontrol et.