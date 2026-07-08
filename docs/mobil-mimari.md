# LOOMR Mobil — Uygulama Mimarisi (App Store + Google Play)

> Bu doküman, LOOMR'ın iOS (App Store) ve Android (Google Play) için tek kod
> tabanından çıkacak mobil uygulamasının mimarisini tanımlar. Mevcut repo
> (`main` + `design-studio-3d` branch'i) baştan sona incelenerek yazılmıştır;
> mobil mimari, web'de hâlihazırda kurulmuş olan veri katmanı ve REST API'nin
> **üzerine** inşa edilir, onları kopyalamaz.

---

## 1. Mevcut durumun okuması

| Katman | `main` | `design-studio-3d` |
|---|---|---|
| Frontend | Statik TR tanıtım sitesi + demo Workspace, Fabric Hub (10 kumaş), Lookbook (33 görsel), 5 adımlı Collection Builder (localStorage) | + 3D Tasarım Stüdyosu (`tasarim.html`, Three.js + GLB/prosedürel garment), `uretim/sourcing/kalite/vizyon` sayfaları |
| Veri | Sayfa içi sabit diziler | **`js/loomr-data.js`** — renk, kumaş (5 aile), garment kataloğu (BOM + ölçü tablosu), modelist ve fabrika dizini; tarayıcı **ve** Node tarafından paylaşılıyor |
| API istemcisi | — | **`js/loomr-api.js`** — backend açıksa REST, kapalıysa localStorage fallback (offline-first davranışın ilk hali) |
| Backend | — | **`server/`** — sıfır bağımlılık native `http` + `node:sqlite`; `/api/fabrics · families · colors · garments · modelists · designs · techpacks (+handoff) · collections · samples` |
| 3D | — | `models/*.glb` (Meshy) + `manifest.json`; model yoksa prosedürel mesh |

**Mobil için anlamı:** Referans veri modeli, REST sözleşmesi ve "backend yoksa
lokalde çalış" ilkesi zaten tanımlı. Mobil uygulama bu üç şeyi aynen devralmalı.

---

## 2. Ürün kapsamı — mobil MVP

18 modülün tamamı mobile taşınmaz. Mobil, **"cepte LOOMR"** olarak markanın
sahada/atölyede/kumaşçıda en çok ihtiyaç duyduğu akışlara odaklanır:

### Faz 1 — MVP (store'lara ilk çıkış)
1. **Workspace / Genel Bakış** — KPI kartları, numune onayları, üretim durumu (app.html'deki panelin canlı hali).
2. **Fabric Hub** — kumaş kütüphanesi, aile/sertifika filtreleri, kumaş detayı, **Numune Talep Et** (`POST /api/samples`).
3. **Collection Builder** — 5 adımlı sihirbaz (kimlik → pazar → segment → kumaş/renk → özet), `POST /api/collections`.
4. **Dijital Showroom / Lookbook** — galeri + tam ekran görüntüleyici, koleksiyon paylaşımı (native share sheet).
5. **Production Live (salt-okunur)** — kalıp→sevkiyat adım çubuğu, ürün bazında durum.
6. **Push bildirim** — "numune onay bekliyor", "KK geçti", "sevkiyat çıktı".

### Faz 2
- **3D Tasarım Stüdyosu** (garment seç → kumaş/renk uygula → tech pack → modeliste devret). Web'deki Three.js sahnesi mobilde `expo-gl` üzerinde koşar; GLB + `manifest.json` aynen kullanılır.
- Tech pack görüntüleme/PDF paylaşma, tedarikçi ağı dizini, kamera ile numune/QC fotoğrafı yükleme.

### Faz 3
- Mesajlaşma (İletişim modülü), Marketplace, Akademi, Analitik panosu, çoklu marka (workspace switcher).

**Bilinçli kapsam dışı (MVP):** ödeme/abonelik (IAP zorunluluğu doğurur — §9),
video görüşme, AI koleksiyon üretici (backend'de olgunlaşınca API'den tüketilir).

---

## 3. Teknoloji seçimi

**Öneri: React Native + Expo (EAS Build/Submit ile iki store'a tek pipeline).**

Gerekçe — bu repoya özgü:
1. **`js/loomr-data.js` doğrudan yeniden kullanılır.** Dosya zaten UMD tarzı sarılmış, tarayıcı + Node'da çalışıyor; RN üçüncü runtime olur. Flutter seçilirse bu tek-kaynak veri katmanı Dart'a elle kopyalanır ve iki kaynak sapmaya başlar.
2. **3D stüdyo taşınabilir.** Three.js sahne/malzeme/prosedürel-mesh kodu `expo-gl` + `expo-three` ile büyük oranda aynen çalışır. Flutter'da Three.js eşleniği yok; stüdyonun sıfırdan yazılması gerekir — oysa stüdyo LOOMR'ın ana farklılaştırıcısı.
3. **Ekip JS yazıyor.** Repo %100 vanilla JS; tek dil, tek zihinsel model.
4. **EAS Submit** iki store'a gönderimi tek komuta indirir; OTA update (expo-updates) ile JS düzeltmeleri store incelemesi beklemeden dağıtılır.

Alternatif değerlendirildi: **Flutter** (ekipte deneyim mevcut) — performans ve
tutarlılık iyi, ancak (1) ve (2) maddeleri nedeniyle bu projede toplam maliyeti
daha yüksek. Karar değişirse bu dokümanın §4–§10 bölümleri stack'ten bağımsızdır.

Sabitlenecek sürümler (başlangıç): Expo SDK 53+, React Native 0.79+, TypeScript
strict, React Navigation 7 (veya expo-router), TanStack Query 5, Zustand,
expo-sqlite, expo-notifications, expo-gl/expo-three (Faz 2).

---

## 4. Üst düzey mimari

```mermaid
flowchart LR
  subgraph Mobil["Mobil (iOS + Android — tek kod tabanı)"]
    UI["Ekranlar<br/>(React Navigation)"] --> Q["TanStack Query<br/>(sunucu durumu + cache)"]
    UI --> Z["Zustand<br/>(UI/sihirbaz durumu)"]
    Q --> AC["API istemcisi<br/>(loomr-api port'u)"]
    AC -->|çevrimiçi| REST
    AC -->|çevrimdışı| SQ["expo-sqlite<br/>(yerel kuyruk + cache)"]
    SQ -. senkron .-> AC
    REF["@loomr/data<br/>(loomr-data.js paylaşımlı paket)"] --> UI
  end
  subgraph Backend["Backend (server/ — mevcut)"]
    REST["REST API<br/>/api/*"] --> DB[("SQLite<br/>→ ileride Postgres")]
    REST --> AUTH["Auth (JWT)<br/>YENİ"]
    REST --> MEDIA["Medya yükleme<br/>YENİ"]
    REST --> PUSH["Push köprüsü<br/>(Expo Push / FCM+APNs) YENİ"]
  end
  Web["Web sitesi<br/>(mevcut sayfalar)"] --> REST
```

İlkeler:
- **Tek API, iki istemci.** Web ve mobil aynı `/api/*` sözleşmesini tüketir; mobil için ayrı backend yazılmaz.
- **Offline-first.** `loomr-api.js`'in "backend kapalıysa localStorage" davranışı mobilde kural haline gelir: her yazma önce yerel SQLite'a, sonra senkron kuyruğuyla sunucuya. Atölyede/kumaşçıda internet garantisi yoktur.
- **Referans veri paketi.** `loomr-data.js` monorepo'da `@loomr/data` paketi olur; web, server ve mobil aynı paketi import eder. Böylece kumaş/garment kataloğu üç yerde tek kaynaktan gelir. Uzun vadede referans veri de API'den beslenir, paket yalnızca tip + fallback taşır.

---

## 5. Repo yapısı (monorepo'ya evrim)

Mevcut düz yapı korunur, mobil ve paylaşılan katman eklenir:

```
loomr/
├── *.html · css/ · js/ · img/ · models/     # mevcut web (dokunulmaz)
├── server/                                   # mevcut backend (genişler: auth, media, push)
├── packages/
│   └── data/                                 # @loomr/data — loomr-data.js'in paketlenmiş hali (+ TS tipleri)
├── mobile/                                   # Expo uygulaması
│   ├── app/                                  # expo-router ekran ağacı
│   │   ├── (tabs)/
│   │   │   ├── index.tsx                     # Workspace / Genel Bakış
│   │   │   ├── kumas/                        # Fabric Hub (liste + [id] detay)
│   │   │   ├── koleksiyon/                   # Collection Builder sihirbazı
│   │   │   ├── showroom/                     # Lookbook galerisi
│   │   │   └── uretim/                       # Production Live
│   │   ├── studio/                           # Faz 2 — 3D stüdyo (lazy)
│   │   └── (auth)/                           # giriş / marka seçimi
│   ├── src/
│   │   ├── api/                              # istemci (loomr-api port'u) + endpoint hook'ları
│   │   ├── db/                               # expo-sqlite şema + senkron kuyruğu
│   │   ├── store/                            # Zustand dilimleri (sihirbaz, oturum, ayarlar)
│   │   ├── components/                       # tasarım sistemi bileşenleri
│   │   ├── theme/                            # §6'daki token'lar
│   │   └── i18n/                             # TR (varsayılan) + EN
│   ├── app.json / eas.json
│   └── package.json
└── docs/
    └── mobil-mimari.md                       # bu doküman
```

Kimlikler: bundle id / application id **`com.loomr.app`** (iOS + Android aynı),
scheme `loomr://` (deep link: `loomr://kumas/denim-13oz`, `loomr://koleksiyon/:id`).

---

## 6. Tasarım sistemi (web ile birebir)

`css/styles.css`'teki token'lar mobil temaya taşınır — uygulama, sitenin
editoryal dilini korumalı:

| Token | Değer | Mobil kullanım |
|---|---|---|
| `ink` | `#150B0B` | ana metin |
| `paper` / `paper-2` | `#F6F1EA` / `#EFE8DE` | zemin / kart |
| `clay` (bordo) | `#8E2430` | birincil aksiyon, aktif tab |
| `gold` | `#C2A05E` | vurgu, rozetler |
| `stone` | `#8B807A` | ikincil metin |
| Serif | Fraunces | başlıklar (expo-font) |
| Sans | Inter | gövde, UI |

Durum rozetleri web'dekiyle aynı sözlükte kalır: `Onaylandı / Numune V2 /
Dikimde / KK Geçti / Kumaş Gecikmesi` → `ok · wait · wip · risk` renk eşlemesi.

---

## 7. Uygulama katmanları

### 7.1 Navigasyon
Alt tab çubuğu (5): **Genel Bakış · Fabric Hub · Koleksiyon (+) · Showroom · Üretim**.
Orta tab yükseltilmiş "+" — Collection Builder sihirbazını modal stack olarak açar
(webdeki 5 adım birebir). Stüdyo (Faz 2) Genel Bakış'tan tam ekran push.

### 7.2 Durum yönetimi
- **Sunucu durumu:** TanStack Query — anahtarlar API yollarını aynalar (`['fabrics']`, `['collections', id]`). `staleTime` referans veri için yüksek (24 saat), işlemsel veri için düşük (30 sn).
- **UI durumu:** Zustand — sihirbaz adımları (webdeki `state = {sezon, pazar, musteri, segment, adet, kumas[], renk[]}` şekli aynen korunur), oturum, tema/dil.
- **Kalıcılık:** expo-sqlite. Tablolar sunucudakiyle aynı adlandırma: `designs`, `techpacks`, `collections`, `samples` + `sync_queue(op, entity, payload, created_at, retries)`.

### 7.3 Offline senkron kuralı
1. Yazma → yerel tabloya `pending` bayrağıyla kaydet + kuyruğa ekle → UI anında güncellenir (optimistic).
2. Bağlantı gelince kuyruk FIFO boşaltılır; `201/200` → bayrak temizlenir, sunucu `id`'si yerel kayda işlenir.
3. Çakışma stratejisi MVP'de **last-write-wins** (tek kullanıcılı marka senaryosu); çoklu kullanıcıda `updated_at` karşılaştırması + kullanıcıya seçim.

### 7.4 Görseller
23 MB'lık `img/` mobile gömülmez. Kampanya/lookbook görselleri CDN'den
(`expo-image` + disk cache, blurhash placeholder). Backend'e `GET /api/lookbook`
eklenene kadar geçici manifest: `img/manifest.json`.

### 7.5 3D Stüdyo (Faz 2)
- `expo-gl` + `expo-three`; GLB'ler `models/manifest.json`'a göre lazy indirilir, `FileSystem.cacheDirectory`'de tutulur.
- Web'deki malzeme parametreleri (`tex/roughness/sheen` — `loomr-data.js`'te hazır) aynen uygulanır; model yoksa webdeki prosedürel üretici port edilir.
- Düşük cihazlarda fallback: 3D yerine renkli kumaş swatch + garment teknik çizimi (statik).

---

## 8. Backend'e eklenecekler (mobil ön koşulları)

Mevcut sıfır-bağımlılık felsefesi korunarak `server/`'a eklenir:

| Alan | Uç nokta | Not |
|---|---|---|
| Auth | `POST /api/auth/register · login · refresh` | JWT (access 15 dk + refresh 30 gün); mobilde `expo-secure-store` |
| Kullanıcı/marka | `GET/PATCH /api/me`, `GET /api/brands` | çoklu workspace'in temeli |
| Cihaz | `POST /api/devices` (Expo push token) | bildirim hedefleme |
| Bildirim | server → Expo Push API | numune onayı, üretim adımı değişimi tetikler |
| Medya | `POST /api/uploads` (multipart) | QC fotoğrafı, moodboard; disk → ileride S3 uyumlu depo |
| Lookbook | `GET /api/lookbook` | görsel manifest + CDN URL'leri |
| Sürümleme | tüm yeni uçlar `/api/v1/*` | mobil istemciler eski sürümde takılı kalabilir — kırıcı değişiklik yeni sürümde |

Ölçek yolu: `node:sqlite` MVP'de kalır (tek makine, WAL modu). Eş zamanlı yazma
arttığında `better-sqlite3`→Postgres geçişi; `store/db.js` zaten depo desenine
yakın olduğundan değişim tek dosyada izole edilir. Reverse proxy (Caddy) + HTTPS
zorunlu — **store'lar cleartext HTTP'ye izin vermez** (iOS ATS, Android
`usesCleartextTraffic=false`).

---

## 9. Store gereksinimleri ve uyum

### Ortak
- **Gizlilik politikası URL'si** (her iki store da zorunlu tutar) — `loomr.app/gizlilik` olarak yayınlanmalı.
- **KVKK/GDPR:** hesap silme akışı uygulama İÇİNDEN erişilebilir olmalı (Apple 5.1.1(v) + Play hesap silme politikası) → `DELETE /api/me` gerekli.
- Toplanan veri: e-posta, marka adı, tasarım/koleksiyon içerikleri, cihaz push token. Analitik MVP'de yok → beyanlar sade kalır.
- **Ödeme yok (MVP):** dijital içerik satışı olmadığından IAP/Play Billing zorunluluğu doğmaz. Marketplace (Faz 3) dijital ürün satarsa Apple IAP %15–30 kesintisi devreye girer — fiyatlamada şimdiden hesaba katılmalı.

### App Store (iOS)
- Apple Developer Program (99 $/yıl, kurumsal hesap önerilir — "LOOMR" tüzel adıyla).
- App Privacy "nutrition label" beyanı; ekran görüntüleri 6.7" + 6.5" + iPad (uygulama iPad'i destekleyecekse — **öneri: MVP'de iPhone-only**, `TARGETED_DEVICE_FAMILY=1`).
- Review notu: demo hesap (`review@loomr.app`) + backend'in canlı olduğu URL.
- Minimum iOS 16.

### Google Play (Android)
- Play Console (25 $ tek seferlik). **Yeni geliştirici hesaplarında 12+ test kullanıcısıyla 14 gün kapalı test zorunluluğu var** — takvime eklenmeli (Yusuf + Kadirhan + çevre = testçi havuzu şimdiden toplanmalı).
- AAB formatı, Play App Signing, Data Safety formu, `targetSdkVersion` güncel (35).
- Minimum Android 8.0 (API 26).

---

## 10. CI/CD ve sürüm stratejisi

```mermaid
flowchart LR
  PR["PR → main"] --> CI["GitHub Actions:<br/>lint + tsc + jest"]
  CI --> DevB["EAS Build (development)<br/>her PR — dahili"]
  Main["main merge"] --> Preview["EAS Build (preview)<br/>TestFlight + Play Internal"]
  Tag["v1.x tag"] --> Prod["EAS Build (production)<br/>EAS Submit → App Store + Play"]
  Fix["JS-only düzeltme"] --> OTA["expo-updates OTA<br/>(store incelemesi yok)"]
```

- `eas.json` kanalları: `development` / `preview` / `production`; sırlar (API URL, Sentry DSN) EAS Secrets'ta.
- Sürümleme: `runtimeVersion` policy `appVersion`; native modül ekleyen her değişiklik store sürümü gerektirir, salt-JS değişiklikler OTA gider.
- İzleme: Sentry (crash + JS hata), backend'de mevcut `/api/health` uptime kontrolü.
- Test: Jest + React Native Testing Library (sihirbaz doğrulama mantığı — webdeki `valid(n)` kuralları birebir test edilir), Maestro ile temel akışların E2E'si (giriş → numune talebi → koleksiyon oluştur).

---

## 11. Yol haritası (öneri)

| Faz | İçerik | Süre (2 kişi, yarı zamanlı) |
|---|---|---|
| 0 | Monorepo + `@loomr/data` paketi, Expo iskeleti, tema, auth uçları | 2 hafta |
| 1 | MVP modülleri (§2 Faz 1) + offline senkron + push | 6–8 hafta |
| 1.5 | Kapalı test (Play 14 gün zorunluluğu + TestFlight) — geri bildirim turu | 3 hafta |
| 2 | 3D Stüdyo, tech pack, kamera yükleme | 6 hafta |
| 3 | Mesajlaşma, marketplace, analitik | ayrı planlanır |

**İlk somut adımlar:**
1. `packages/data` — `loomr-data.js`'i paket haline getir, server ve web'i ona bağla (davranış değişmez).
2. Backend'e `auth + devices + uploads` uçları (`/api/v1`).
3. `mobile/` Expo iskeleti + tema + Fabric Hub listesi (ilk dikey dilim: liste → detay → numune talebi, offline dahil).
4. `com.loomr.app` kimliğiyle EAS projesi + iki store'da geliştirici hesapları.
