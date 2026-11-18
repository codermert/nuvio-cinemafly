# Nuvio — “Playback unavailable” (senin kurulum)

Bu hata = uygulama **hiçbir stream kaynağı görmüyor** (arama yapmadan vazgeçiyor).

## Senin durum

Sadece **Plugin deposu** eklemişsin (`nuvio-cinemafly`).  
**Eklenti (Worker)** listesinde `trcinema` **yok** → Nuvio çoğu profilde play’i kapalı tutar.

## Yapılacaklar (5 dk)

### 1) Worker’ı EKLEMİ YERİNE ekle — **Eklentiler / Addons**

Aşağıdakini kopyala (Plugins **değil**, Addons):

```text
https://trcinema.salam.workers.dev/manifest.json
```

- Telefon / TV: **Ayarlar → İçerik & Keşif → Eklentiler → Eklenti kur**
- Web: [nuvio.tv hesabın](https://nuvio.tv/account) → **Addons** sekmesi (Plugins değil) → aynı URL

Kontrol: listede **CinemaFly**, sürüm **1.0.51+**, anahtar **açık**.  
Sürüm boş veya isim sadece domain ise manifest yüklenmemiş → sil, URL’yi yeniden kur.

### 2) Pluginler (zaten var)

- Depo: `https://raw.githubusercontent.com/codermert/nuvio-cinemafly/main/manifest.json`
- **Plugin sağlayıcılarını global aç** ✓
- **CinemaFly · DiziMom** açık ✓
- **Test Provider** ile dene (Walking Dead / tt1520211)

### 3) Profil

Hangi profilde izliyorsan, **Eklentiler o profile** kurulu olsun.  
“Primary profile addons kullan” kapalıysa her profile ayrı eklenti gerekir.

### 4) Hâlâ olmazsa

- **TMDB** meta eklentisini geçici kapat.
- Nuvio’yu **Play Store sürümü** kullanıyorsan pluginler çalışmaz → **mutlaka** 1. adımdaki Worker eklentisi şart.
- Uygulamayı tamamen kapat-aç (sync için).

## İkisi ne işe yarar?

| | Plugin (DiziMom) | Eklenti (Worker) |
|---|---|---|
| Menü | Plugins | **Addons** |
| Play düğmesi | Scraper cihazda yüklüyse | **Her zaman** (manifest OK ise) |
| Dublaj TWD | DiziMom | DiziLife |

**Özet:** Sadece plugin yetmez; **Addons’a trcinema ekle**.