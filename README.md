# LOOMR

**Moda Markalarının İşletim Sistemi** — bir moda markasının tüm yaşam döngüsünü tek platformda
birleştiren çalışma ortamı: tasarım → geliştirme → tedarik → üretim → lansman.

Stüdyo: **Emre Korkmaz Tekstil Design Studio** · İstanbul · London · Milano · Berlin · Since 2025

🔗 Canlı: https://yusufkacmaz2004.github.io/loomr/

---

## Sayfalar

| Sayfa | Açıklama |
|-------|----------|
| `index.html` | Landing — marka hero'su, 18 modül ekosistemi, showroom |
| `app.html` | Workspace — KPI'lar, üretim takibi, koleksiyon tablosu, **kayıtlı tasarımların** |
| `tasarim.html` | **3D Tasarım Stüdyosu** — garment seç, kumaş & renk uygula, teknik föy, modeliste gönder |
| `kumas.html` | Fabric Hub — 5 kumaş ailesi, Denim Fabric Book, numune talebi |
| `koleksiyon-olustur.html` | Collection Builder — 5 adımlı koleksiyon sihirbazı |
| `lookbook.html` | Dijital Showroom — kampanya galerisi (filtre + lightbox) |
| `sunum.html` | Tanıtım sunumu |

## Mimari

- **Frontend:** statik HTML/CSS/JS, sıfır build. Tasarım sistemi `css/styles.css` (bordo `#8E2430` +
  altın `#C2A05E`, Fraunces + Inter).
- **3D:** Three.js (r128, yerel) — `js/garment-3d.js` parametrik hacimli garmentlar + prosedürel kumaş dokuları.
- **Paylaşılan veri:** `js/loomr-data.js` — kumaş / garment / renk / modelist (hem tarayıcı hem Node).
- **API istemcisi:** `js/loomr-api.js` — backend açıksa REST, kapalıysa `localStorage` (statik yayında da çalışır).
- **Backend:** `server/` — native `http` + gömülü `node:sqlite`, **sıfır bağımlılık**. Bkz. `server/README.md`.

## Çalıştırma

Sadece frontend (statik):
```bash
# herhangi bir statik sunucu, örn:
npx serve .
```

Frontend + backend (tam sistem):
```bash
node server/server.js      # → http://localhost:4317  (site + /api)
```

Node 22.5+ gerekir (backend için). Frontend için gerek yok.

## Yapı

```
loomr/
├─ index.html app.html tasarim.html kumas.html koleksiyon-olustur.html lookbook.html sunum.html
├─ css/        styles.css · pages.css · app.css · design.css
├─ js/         loomr-data.js · loomr-api.js · garment-3d.js · main.js · lib/(three, OrbitControls, GLTFLoader)
├─ img/        marka görselleri + kampanya çekimleri
└─ server/     server.js · db.js · package.json · README.md
```
