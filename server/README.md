# LOOMR Backend

Native `http` + gömülü `node:sqlite` ile yazılmış, **sıfır bağımlılık** REST API.
`npm install` gerekmez. Node **22.5+** yeterli (öneri: 24+).

## Çalıştırma

```bash
node server/server.js
# veya
cd server && npm start
```

- Site: `http://localhost:4317/`
- API : `http://localhost:4317/api/health`
- DB  : `server/data/loomr.db` (ilk çalıştırmada otomatik oluşur)

Portu değiştir: `PORT=8080 node server/server.js`

## Uç noktalar

| Metot | Yol | Açıklama |
|------|------|----------|
| GET | `/api/health` | servis + istatistik |
| GET | `/api/fabrics` · `/api/fabrics/:id` | kumaş kütüphanesi |
| GET | `/api/families` | 5 kumaş ailesi |
| GET | `/api/colors` | renk paleti |
| GET | `/api/garments` · `/api/garments/:id` | garment kataloğu |
| GET | `/api/modelists` · `/api/modelists/suggest?garment=denim-gomlek` | modelist dizini |
| GET/POST | `/api/designs` | tasarım kaydet / listele |
| GET/PATCH/DELETE | `/api/designs/:id` | tekil tasarım |
| GET/POST | `/api/techpacks` | teknik föy |
| POST | `/api/techpacks/:id/handoff` | modeliste devret |
| PATCH | `/api/techpacks/:id` | durum güncelle |
| GET/POST | `/api/collections` | koleksiyonlar |
| GET/POST | `/api/samples` | numune talepleri |

## Veri modeli

Referans veri (kumaş / garment / renk / modelist) tek kaynaktan gelir: `js/loomr-data.js`
— hem tarayıcı hem Node tarafından kullanılır. İşlemsel veri SQLite'ta tutulur.

## Yayına alırken

- Statik frontend + bu API aynı origin'de servis edilebilir (`server.js` her ikisini de sunar).
- Domain alındığında: reverse proxy (Nginx/Caddy) arkasına al, `PORT` ve `LOOMR_DB` ortam
  değişkenlerini ayarla, `data/` dizinini kalıcı diske bağla.
