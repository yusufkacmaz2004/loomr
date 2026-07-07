# 3D Garment Modelleri (GLB)

Meshy'de üretilen gerçek garment modelleri buraya konur. Stüdyo (`tasarim.html`)
bir garment için burada eşleşen dosyayı bulursa **prosedürel model yerine onu** kullanır;
bulamazsa prosedürel garmenti gösterir. Renk + kumaş dokusu her iki durumda da uygulanır.

## Dosya adları (birebir bunlar olmalı)
- denim-gomlek.glb · dokuma-gomlek.glb
- denim-pantolon.glb · dokuma-pantolon.glb
- denim-short.glb · dokuma-short.glb
- denim-ceket.glb · dokuma-ceket.glb

Promptlar: `Desktop\LOOMR-meshy\MESHY-PROMPTS.md`

> İpucu: Modeller nötr (kırık-beyaz/gri) üretilsin — renk stüdyoda uygulanıyor.
> Boyut/merkez otomatik ayarlanır (~6.6 birim boy, ortalanır).

## manifest.json (önemli)
Stüdyo yalnızca `manifest.json`'da listelenen garment id'lerin GLB'sini yükler
(gereksiz 404 olmaması için). Model ekleyince buraya id'yi ekle:

```json
["denim-gomlek", "denim-pantolon"]
```

> Bana "modeller hazır" dersen manifest'i ben güncellerim.
