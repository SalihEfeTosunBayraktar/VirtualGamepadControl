# VirtualGamepadControl

> 🎮 iPhone ve Android cihazları Wi-Fi üzerinden PC'ye **Xbox gamepad** olarak bağlayın — uygulama indirme gerekmez!

![Windows](https://img.shields.io/badge/Windows-10%2F11-blue?logo=windows)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)
![License](https://img.shields.io/badge/License-MIT-purple)
![Players](https://img.shields.io/badge/Çok%20Oyunculu-4%20eş%20zamanlı-orange)

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
2. Terminaldeki **QR kodu** telefonunuzla tarayın
3. Tarayıcıda **sertifika uyarısı** çıkarsa:  
   → **"Gelişmiş" › "…'e devam et"** seçin  
   *(self-signed SSL, iOS jiroskop için zorunlu)*
4. Adınızı girin, **Bağlan!**
5. İlk dokunuşta **tam ekran + yatay kilit** otomatik devreye girer

---

## 🎮 Kontrolör Modları

| Mod | Açıklama |
|-----|----------|
| **Xbox** *(varsayılan)* | Tam Xbox düzeni — A/B/X/Y, 2 joystick, D-Pad, LB/RB, analog LT/RT |
| **Yarış** | Jiroskop direksiyon (telefonu eğ) + gaz/fren/el freni pedal tuşları |

### 🏎️ Yarış Modu Detayları

- **Direksiyon:** Telefonu sola/sağa eğ → sol analog stick X ekseni
  - Exponential low-pass filtresi ile düzgün, sarsıntısız harekat
  - ±4° ölü bölge — statikte drift yok
  - 30° = tam kilit — doğal direksiyon hissi
- **Pedallar:** GAZ / FREN / EL FRENİ dokunma tuşları
- **⚙️ Pedal Tuş Ayarı:** Sağ üstteki dişli ikonuna bas → hangi fiziksel tuşa (RT, LT, A, B, X, Y, RB, LB…) eşleneceğini seç → ayar kalıcı kaydedilir

---

## 🕹️ Girdi Özellikleri

- ✅ **Multi-touch joystick** — çok parmak eş zamanlı
- ✅ **Analog LT/RT tetikleyiciler** — basınca duyarlı
- ✅ **D-Pad** — 4 yön dijital
- ✅ **Jiroskop / ivmeölçer** — iOS 13+ dahil (izin ister)
- ✅ **Titreşim geri bildirimi** — oyun haptic → telefon
- ✅ **Tam ekran + yatay kilit** — ilk dokunuşta otomatik
- ✅ **XInput Y ekseni** — standart konvansiyonla uyumlu

---

## 📡 Bağlantı & Güvenilirlik

- ✅ **Otomatik yeniden bağlanma** — exponential backoff (maks 10 deneme)
- ✅ **WebSocket heartbeat** — ölü bağlantılar 15–20 saniyede tespit edilip temizlenir
- ✅ **4 eş zamanlı oyuncu** — her cihaz ayrı ViGEm slot
- ✅ **HTTPS** — iOS jiroskop API için zorunlu

---

## 📺 PC Dashboard

Sunucu çalışırken PC tarayıcısında açın:

```
https://localhost:3443/tester.html
```

Dashboard şunları gösterir:
- 🟢 **Bağlı cihazlar** (ad, cihaz modeli, slot — örn. *Salih — Samsung S23 → P1*)
- ✅ **ViGEmBus sürücü durumu**
- 📊 **Gerçek zamanlı gamepad görselleştirici** — buton/axis/trigger
- 📋 **Olay günlüğü**

---

## 🛠️ Manuel Kurulum

```bash
# 1. ViGEmBus sürücüsünü kurun
#    → https://github.com/nefarius/ViGEmBus/releases

# 2. Bağımlılıkları kurun
cd server
npm install

# 3. Sunucuyu başlatın
node index.js
```

---

## 📁 Proje Yapısı

```
VirtualGamepadControl/
├── setup.bat              ← İlk kurulum (yönetici olarak çalıştır)
├── start.bat              ← Hızlı başlatma
├── server/
│   ├── index.js           ← HTTPS + WebSocket sunucusu + heartbeat
│   ├── gamepad.js         ← ViGEmBus sanal kontrolör (XInput mapping)
│   ├── cert.js            ← Otomatik self-signed SSL sertifikası
│   ├── qr.js              ← QR kod + yerel IP algılama
│   └── package.json
└── client/                ← Mobil tarayıcı dosyaları (statik)
    ├── index.html         ← Karşılama + oyuncu adı / mod seçimi
    ├── gamepad.html       ← Gamepad UI (Xbox + Yarış modları)
    ├── tester.html        ← PC dashboard
    ├── css/
    │   ├── main.css       ← Genel stiller
    │   └── gamepad.css    ← Kontrolör UI stilleri
    └── js/
        ├── controls.js    ← Joystick / Button / DPad / Trigger sınıfları
        ├── connection.js  ← WebSocket istemcisi + otomatik yeniden bağlanma
        ├── sensors.js     ← Jiroskop / ivmeölçer API
        └── vibration.js   ← Haptic feedback
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
