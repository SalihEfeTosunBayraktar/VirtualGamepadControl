# VirtualGamepadControl

> 🎮 iPhone ve Android cihazları Wi-Fi üzerinden PC'ye **Xbox gamepad** olarak bağlayın — uygulama indirme gerekmez!

![Windows](https://img.shields.io/badge/Windows-10%2B-blue?logo=windows)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)
![License](https://img.shields.io/badge/License-MIT-purple)

---

## 🚀 Hızlı Başlangıç

### İlk kurulum (bir kez yapılır)

1. `setup.bat` dosyasına **sağ tıklayın → "Yönetici olarak çalıştır"**
2. Script otomatik olarak:
   - Node.js kurulu değilse indirir ve kurar
   - ViGEmBus sanal gamepad sürücüsünü kontrol eder / kurar
   - `npm install` ile bağımlılıkları yükler
   - Sunucuyu başlatır

### Sonraki kullanımlar

```
start.bat       (çift tıklayın)
```

---

## 📱 Mobil Bağlantı

1. PC ve telefonunuz **aynı Wi-Fi ağına** bağlı olsun
2. Terminaldeki QR kodu telefonunuzla tarayın
3. Tarayıcıda **sertifika uyarısı** çıkarsa:  
   → **"Gelişmiş" › "…'e devam et"** seçin  
   *(self-signed SSL, iOS jiroskop için gerekli)*
4. Adınızı girin ve kontrolör tipini seçin
5. **Bağlan!**

---

## 🎮 Kontrolör Tipleri

| Tip | Açıklama |
|-----|----------|
| **Xbox** *(varsayılan)* | A/B/X/Y + 2 Joystick + D-Pad + LB/RB/LT/RT |
| **FPS** | Büyük sol joystick + hızlı aksiyon tuşları |
| **Yarış** | Jiroskop direksiyon + gaz/fren pedal tuşları |

---

## 📺 PC Dashboard

Sunucu çalışırken PC tarayıcısında açın:

```
https://localhost:3443/tester.html
```

Dashboard şunları gösterir:
- 🟢 **Hangi cihaz hangi slot'a bağlı** (örn. *Salih — Samsung S23 → P1*)
- ✅ **ViGEmBus sürücü durumu**
- 📊 **Gamepad API görselleştirici** — buton/axis gerçek zamanlı
- 📋 **Olay günlüğü**

---

## ⚙️ Özellikler

- ✅ Multi-touch joystick (çok parmak desteği)
- ✅ Analog LT/RT tetikleyiciler
- ✅ Jiroskop / ivmeölçer (iOS 13+ dahil)
- ✅ Titreşim geri bildirimi (oyun → telefon)
- ✅ 4 eş zamanlı oyuncu
- ✅ Otomatik yeniden bağlanma
- ✅ HTTPS (iOS jiroskop desteği için)

---

## 🛠️ Manuel Kurulum (setup.bat alternatifi)

```bash
# ViGEmBus sürücüsünü kurun
# → https://github.com/nefarius/ViGEmBus/releases

# Bağımlılıkları kurun
cd server
npm install

# Sunucuyu başlatın
node index.js
```

---

## 📁 Proje Yapısı

```
VirtualGamepadControl/
├── setup.bat          ← İlk kurulum (yönetici olarak çalıştır)
├── start.bat          ← Hızlı başlatma
├── server/
│   ├── index.js       ← HTTPS + WebSocket sunucusu
│   ├── gamepad.js     ← ViGEmBus sanal kontrolör yönetimi
│   ├── cert.js        ← Otomatik SSL sertifikası
│   ├── qr.js          ← QR kod + IP algılama
│   └── package.json
└── client/            ← Mobil tarayıcı dosyaları (statik)
    ├── index.html     ← Karşılama sayfası
    ├── gamepad.html   ← Gamepad UI
    └── tester.html    ← PC dashboard
```

---

## ⚠️ Gereksinimler

| Gereksinim | Versiyon | Not |
|-----------|---------|-----|
| Windows | 10 / 11 | Zorunlu (ViGEmBus Windows-only) |
| Node.js | 18+ | setup.bat otomatik kurar |
| ViGEmBus | 1.17+ | setup.bat otomatik kurar |
| Tarayıcı (Mobil) | Chrome 85+ / Safari 14+ | İndirme gerektirmez |

---

## 📄 Lisans

MIT — Özgürce kullanın, paylaşın, geliştirin.
