/* ============================================================
   LOOMR — Paylaşılan veri katmanı
   Kumaş kütüphanesi · Garment kataloğu · Renk paleti · Modelistler
   (Fabric Hub, Design Studio ve Collection Builder bu dosyayı kullanır)
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- Renk paleti ---------- */
  const COLORS = [
    { id: "ecru",     ad: "Ecru",      hex: "#E8DFC9", pantone: "13-1006 TCX" },
    { id: "kum",      ad: "Kum",       hex: "#D9CBB2", pantone: "14-1108 TCX" },
    { id: "camel",    ad: "Camel",     hex: "#A97B50", pantone: "17-1044 TCX" },
    { id: "burgundy", ad: "Burgundy",  hex: "#5F1E27", pantone: "19-1617 TPX" },
    { id: "indigo",   ad: "İndigo",    hex: "#2C3A55", pantone: "19-3923 TCX" },
    { id: "midwash",  ad: "Mid-Wash",  hex: "#5E7793", pantone: "18-3921 TCX" },
    { id: "zeytin",   ad: "Zeytin",    hex: "#6E7052", pantone: "18-0426 TCX" },
    { id: "haki",     ad: "Haki",      hex: "#8A855F", pantone: "16-0526 TCX" },
    { id: "antrasit", ad: "Antrasit",  hex: "#3A3A3D", pantone: "19-3906 TCX" },
    { id: "siyah",    ad: "Siyah",     hex: "#1C1A1A", pantone: "19-4007 TCX" },
    { id: "beyaz",    ad: "Optik Beyaz", hex: "#F1EEE6", pantone: "11-0601 TCX" },
    { id: "tas",      ad: "Taş Grisi", hex: "#B9B2A6", pantone: "15-6304 TCX" }
  ];

  /* ---------- Kumaş kütüphanesi (5 çekirdek aile) ----------
     family: denim | viskon | polyester | yun | tencel
     tex   : dokusal üretim tipi (3D) → twill | plain | knit | wool | satin | canvas
     roughness / sheen : 3D malzeme yanıtı
  */
  const FABRICS = [
    // ——— DENIM ———
    { id: "denim-13oz", family: "denim", ad: "Selvedge Denim 13oz", komp: "%100 Pamuk",
      gsm: 440, en: 80, renk: "#2C3A55", pantone: "19-3923 TCX", mensei: "Guimarães · Portekiz",
      sert: ["BCI"], moq: "500 m", termin: "25 gün", stok: "860 m", stokOk: true,
      tex: "twill", roughness: 0.92, sheen: 0.02,
      not: "Kırmızı kenarlı, kuru selvedge — solma karakteri yüksek." },
    { id: "denim-light", family: "denim", ad: "Light-Wash Stretch Denim", komp: "%99 Pamuk · %1 Elastan",
      gsm: 320, en: 150, renk: "#8FAECB", pantone: "646 C", mensei: "Çorlu · Türkiye",
      sert: ["BCI", "GRS"], moq: "600 m", termin: "18 gün", stok: "2.100 m", stokOk: true,
      tex: "twill", roughness: 0.86, sheen: 0.05,
      not: "Konfor esnekliği; taş yıkama ve tırnaklama uygun." },
    { id: "denim-black", family: "denim", ad: "Black Rinse Denim 11oz", komp: "%98 Pamuk · %2 Elastan",
      gsm: 360, en: 148, renk: "#26262A", pantone: "19-4007 TCX", mensei: "Denizli · Türkiye",
      sert: ["OEKO-TEX"], moq: "500 m", termin: "20 gün", stok: "1.400 m", stokOk: true,
      tex: "twill", roughness: 0.88, sheen: 0.03, not: "Sabit siyah; overdye opsiyonlu." },

    // ——— VİSKON ———
    { id: "viskon-dokuma", family: "viskon", ad: "Viskon Dokuma (Twill)", komp: "%100 Viskon (LENZING™ ECOVERO)",
      gsm: 130, en: 145, renk: "#D9CBB2", pantone: "14-1108 TCX", mensei: "İzmir · Türkiye",
      sert: ["OEKO-TEX", "ECOVERO"], moq: "300 m", termin: "14 gün", stok: "1.750 m", stokOk: true,
      tex: "satin", roughness: 0.42, sheen: 0.55,
      not: "Akıcı drape, hafif parlaklık — gömlek ve elbise ideal." },
    { id: "viskon-keten", family: "viskon", ad: "Viskon-Keten Karışım", komp: "%55 Viskon · %45 Keten",
      gsm: 210, en: 140, renk: "#C9B59A", pantone: "14-1116 TCX", mensei: "İzmir · Türkiye",
      sert: ["OEKO-TEX"], moq: "300 m", termin: "16 gün", stok: "980 m", stokOk: true,
      tex: "plain", roughness: 0.6, sheen: 0.2, not: "Kırışık dokulu, yazlık gövde." },

    // ——— POLYESTER ———
    { id: "poly-twill", family: "polyester", ad: "Geri Dönüştürülmüş Poli-Twill", komp: "%100 Geri Dön. Polyester",
      gsm: 240, en: 148, renk: "#6E7052", pantone: "18-0426 TCX", mensei: "Denizli · Türkiye",
      sert: ["GRS", "OEKO-TEX"], moq: "400 m", termin: "12 gün", stok: "3.900 m", stokOk: true,
      tex: "twill", roughness: 0.5, sheen: 0.35, not: "Dayanıklı, ütü tutmaz — dış giyim gövdesi." },
    { id: "poly-memory", family: "polyester", ad: "Memory Taffeta", komp: "%100 Polyester",
      gsm: 95, en: 150, renk: "#3A3A3D", pantone: "19-3906 TCX", mensei: "Bursa · Türkiye",
      sert: ["OEKO-TEX"], moq: "500 m", termin: "15 gün", stok: "2.600 m", stokOk: true,
      tex: "satin", roughness: 0.28, sheen: 0.7, not: "Kağıt tuşe, hafif parlak — teknik ceket astarı/gövde." },

    // ——— YÜN ———
    { id: "yun-flanel", family: "yun", ad: "Merino Yün Flanel", komp: "%100 Merino Yünü",
      gsm: 320, en: 150, renk: "#5F1E27", pantone: "19-1617 TPX", mensei: "Biella · İtalya",
      sert: ["RWS", "OEKO-TEX"], moq: "180 m", termin: "28 gün", stok: "240 m", stokOk: false,
      tex: "wool", roughness: 0.95, sheen: 0.02, not: "Yumuşak havlı; blazer ve palto gövdesi." },
    { id: "yun-kasmir", family: "yun", ad: "Yün-Kaşmir Palto", komp: "%90 Yün · %10 Kaşmir",
      gsm: 380, en: 150, renk: "#A97B50", pantone: "17-1044 TCX", mensei: "Biella · İtalya",
      sert: ["RWS"], moq: "150 m", termin: "30 gün", stok: "320 m", stokOk: true,
      tex: "wool", roughness: 0.9, sheen: 0.04, not: "Lüks tutuş, ağır drape." },

    // ——— TENCEL ———
    { id: "tencel-twill", family: "tencel", ad: "TENCEL™ Lyocell Twill", komp: "%100 TENCEL™ Lyocell",
      gsm: 175, en: 145, renk: "#B9B2A6", pantone: "15-6304 TCX", mensei: "İzmir · Türkiye",
      sert: ["FSC", "OEKO-TEX"], moq: "300 m", termin: "15 gün", stok: "1.900 m", stokOk: true,
      tex: "satin", roughness: 0.38, sheen: 0.5, not: "İpeksi tuşe, yüksek nem yönetimi — sürdürülebilir gövde." },
    { id: "tencel-denim", family: "tencel", ad: "TENCEL™ Denim Blend", komp: "%70 TENCEL™ · %30 Pamuk",
      gsm: 300, en: 150, renk: "#5E7793", pantone: "18-3921 TCX", mensei: "Çorlu · Türkiye",
      sert: ["FSC", "GRS"], moq: "500 m", termin: "20 gün", stok: "1.250 m", stokOk: true,
      tex: "twill", roughness: 0.7, sheen: 0.18, not: "Denim görünümü, akıcı tencel drape." }
  ];

  const FABRIC_FAMILIES = [
    { id: "denim",     ad: "Denim",     desc: "Twill örgü · dayanıklı · yıkama karakteri" },
    { id: "viskon",    ad: "Viskon",    desc: "Akıcı drape · yumuşak · hafif parlak" },
    { id: "polyester", ad: "Polyester", desc: "Teknik · dayanıklı · formunu korur" },
    { id: "yun",       ad: "Yün",       desc: "Sıcak · havlı · tailoring gövdesi" },
    { id: "tencel",    ad: "Tencel",    desc: "Sürdürülebilir · ipeksi · nefes alır" }
  ];

  /* ---------- Garment kataloğu (8) ----------
     type        : pantolon | short | ceket | gomlek
     construction: denim | dokuma
     mesh        : 3D üretici anahtarı (garment-3d.js)
     bom         : malzeme listesi
     measures    : ölçü tablosu satırları (bedene göre baz M)
  */
  const GARMENTS = [
    { id: "denim-pantolon", type: "pantolon", construction: "denim",
      ad: "Denim Pantolon", mesh: "pants", defFamily: "denim", defColor: "indigo",
      desc: "5 cep klasik denim; düz ya da konik paça.",
      bom: ["Ana kumaş", "İç cep bezi", "YKK metal fermuar", "Shank düğme", "Perçin ×6", "Dokuma etiket", "Deri jakron", "Overdye dikiş ipliği"],
      measures: [
        ["Bel (yarım)", "40 cm", "±0.5"], ["Kalça (yarım)", "52 cm", "±0.5"],
        ["Ağ (ön)", "27 cm", "±0.5"], ["Paça genişliği", "18 cm", "±0.3"],
        ["İç bacak", "78 cm", "±1.0"], ["Bel yüksekliği", "26 cm", "±0.5"]
      ] },
    { id: "dokuma-pantolon", type: "pantolon", construction: "dokuma",
      ad: "Dokuma Pantolon", mesh: "pants", defFamily: "tencel", defColor: "kum",
      desc: "Pileli ya da düz dokuma pantolon; tailoring hattı.",
      bom: ["Ana kumaş", "Cep torba bezi", "Gizli fermuar", "İç bel bandı", "Kanca-toka", "Askı bandı", "Dokuma etiket"],
      measures: [
        ["Bel (yarım)", "41 cm", "±0.5"], ["Kalça (yarım)", "54 cm", "±0.5"],
        ["Ağ (ön)", "28 cm", "±0.5"], ["Paça genişliği", "21 cm", "±0.3"],
        ["İç bacak", "80 cm", "±1.0"], ["Pile derinliği", "3 cm", "±0.2"]
      ] },
    { id: "denim-short", type: "short", construction: "denim",
      ad: "Denim Short", mesh: "shorts", defFamily: "denim", defColor: "midwash",
      desc: "Katlı ya da kesik paça denim short.",
      bom: ["Ana kumaş", "Cep bezi", "YKK fermuar", "Shank düğme", "Perçin ×4", "Dokuma etiket", "Deri jakron"],
      measures: [
        ["Bel (yarım)", "40 cm", "±0.5"], ["Kalça (yarım)", "52 cm", "±0.5"],
        ["Ağ (ön)", "26 cm", "±0.5"], ["Paça genişliği", "24 cm", "±0.3"],
        ["İç bacak", "18 cm", "±0.5"], ["Boy (yan)", "42 cm", "±0.5"]
      ] },
    { id: "dokuma-short", type: "short", construction: "dokuma",
      ad: "Dokuma Short", mesh: "shorts", defFamily: "polyester", defColor: "zeytin",
      desc: "Bermuda ya da chino kesim dokuma short.",
      bom: ["Ana kumaş", "Cep bezi", "Gizli fermuar", "İç bel bandı", "Kanca-toka", "Dokuma etiket"],
      measures: [
        ["Bel (yarım)", "41 cm", "±0.5"], ["Kalça (yarım)", "53 cm", "±0.5"],
        ["Ağ (ön)", "27 cm", "±0.5"], ["Paça genişliği", "26 cm", "±0.3"],
        ["İç bacak", "20 cm", "±0.5"], ["Boy (yan)", "46 cm", "±0.5"]
      ] },
    { id: "denim-ceket", type: "ceket", construction: "denim",
      ad: "Denim Ceket", mesh: "jacket", defFamily: "denim", defColor: "indigo",
      desc: "Trucker tipi; göğüs pat cepli, metal düğmeli.",
      bom: ["Ana kumaş", "Göğüs cep pat bezi", "Shank düğme ×6", "Perçin", "Dokuma etiket", "Deri jakron", "Overdye iplik", "Omuz vatka (ops.)"],
      measures: [
        ["Göğüs (yarım)", "56 cm", "±1.0"], ["Bel (yarım)", "52 cm", "±1.0"],
        ["Omuz", "46 cm", "±0.5"], ["Kol boyu", "63 cm", "±0.5"],
        ["Ön boy", "62 cm", "±0.5"], ["Yaka genişliği", "8 cm", "±0.3"]
      ] },
    { id: "dokuma-ceket", type: "ceket", construction: "dokuma",
      ad: "Dokuma Ceket", mesh: "jacket", defFamily: "yun", defColor: "burgundy",
      desc: "Blazer / overshirt hattı; yapılandırılmış ya da yumuşak omuz.",
      bom: ["Ana kumaş", "Astar", "Tela (yaka/pat)", "Düğme ×4", "Omuz vatka", "Kol kapağı", "Dokuma etiket", "Askı bandı"],
      measures: [
        ["Göğüs (yarım)", "57 cm", "±1.0"], ["Bel (yarım)", "53 cm", "±1.0"],
        ["Omuz", "45 cm", "±0.5"], ["Kol boyu", "64 cm", "±0.5"],
        ["Ön boy", "72 cm", "±0.5"], ["Yaka (revers) eni", "8.5 cm", "±0.3"]
      ] },
    { id: "denim-gomlek", type: "gomlek", construction: "denim",
      ad: "Denim Gömlek", mesh: "shirt", defFamily: "denim", defColor: "midwash",
      desc: "Western yoke, çıtçıt ya da düğmeli denim gömlek.",
      bom: ["Ana kumaş", "Yaka telası", "Çıtçıt / düğme", "Dokuma etiket", "Cep pat bezi", "Overdye iplik"],
      measures: [
        ["Göğüs (yarım)", "55 cm", "±1.0"], ["Bel (yarım)", "52 cm", "±1.0"],
        ["Omuz", "45 cm", "±0.5"], ["Kol boyu", "62 cm", "±0.5"],
        ["Ön boy", "74 cm", "±0.5"], ["Yaka çevresi", "40 cm", "±0.3"]
      ] },
    { id: "dokuma-gomlek", type: "gomlek", construction: "dokuma",
      ad: "Dokuma Gömlek", mesh: "shirt", defFamily: "viskon", defColor: "beyaz",
      desc: "Klasik ya da oversize dokuma gömlek; akıcı gövde.",
      bom: ["Ana kumaş", "Yaka & manşet telası", "Düğme ×9", "Dokuma etiket", "Cep bezi", "İnce dikiş ipliği"],
      measures: [
        ["Göğüs (yarım)", "56 cm", "±1.0"], ["Bel (yarım)", "54 cm", "±1.0"],
        ["Omuz", "46 cm", "±0.5"], ["Kol boyu", "61 cm", "±0.5"],
        ["Ön boy", "76 cm", "±0.5"], ["Yaka çevresi", "40 cm", "±0.3"]
      ] }
  ];

  /* ---------- Modelist dizini ---------- */
  const MODELISTS = [
    { id: "ml-01", ad: "Selin Aydın", sehir: "İstanbul", uzmanlik: ["gomlek", "pantolon"], denim: true,  puan: 4.9, termin: "3–5 gün", not: "Denim & örme uzmanı" },
    { id: "ml-02", ad: "Marco Ferri", sehir: "Milano",   uzmanlik: ["ceket"],             denim: false, puan: 4.8, termin: "5–8 gün", not: "Tailoring / blazer kalıbı" },
    { id: "ml-03", ad: "Deniz Koç",   sehir: "İstanbul", uzmanlik: ["short", "pantolon"], denim: true,  puan: 4.7, termin: "3–4 gün", not: "Hızlı numune döngüsü" },
    { id: "ml-04", ad: "Clara Voss",  sehir: "Berlin",   uzmanlik: ["gomlek", "ceket"],   denim: false, puan: 4.9, termin: "4–6 gün", not: "Dokuma & drape" }
  ];

  /* ---------- Fabrika / tedarikçi ağı ---------- */
  const FACTORIES = [
    { id: "fac-izmir", ad: "Ege Konfeksiyon", sehir: "İzmir · Türkiye", uzmanlik: ["Örme", "Dokuma gömlek", "Keten"], moq: "300 adet", kapasite: "40k / ay", sert: ["GOTS", "OEKO-TEX", "SEDEX"], puan: 4.8, termin: "18 gün" },
    { id: "fac-corlu", ad: "Marmara Denim", sehir: "Çorlu · Türkiye", uzmanlik: ["Denim", "Yıkama", "Pantolon"], moq: "500 adet", kapasite: "60k / ay", sert: ["BCI", "GRS", "OEKO-TEX"], puan: 4.7, termin: "22 gün" },
    { id: "fac-guim", ad: "Atlântico Mills", sehir: "Guimarães · Portekiz", uzmanlik: ["Selvedge denim", "Premium ceket"], moq: "400 adet", kapasite: "25k / ay", sert: ["GOTS", "GRS"], puan: 4.9, termin: "28 gün" },
    { id: "fac-biella", ad: "Biella Sartoria", sehir: "Biella · İtalya", uzmanlik: ["Tailoring", "Yün blazer", "Palto"], moq: "150 adet", kapasite: "12k / ay", sert: ["RWS", "OEKO-TEX"], puan: 4.9, termin: "30 gün" },
    { id: "fac-denizli", ad: "Denizli Tekstil", sehir: "Denizli · Türkiye", uzmanlik: ["Poplin", "Sürdürülebilir", "Baskı"], moq: "350 adet", kapasite: "55k / ay", sert: ["GOTS", "GRS", "FSC"], puan: 4.6, termin: "16 gün" },
    { id: "fac-porto", ad: "Norte Knit", sehir: "Porto · Portekiz", uzmanlik: ["Örme", "Sweat", "Jersey"], moq: "300 adet", kapasite: "30k / ay", sert: ["OEKO-TEX", "amfori BSCI"], puan: 4.7, termin: "20 gün" }
  ];

  /* En uygun modelisti seç (garment tipine ve denim'e göre) */
  function suggestModelist(garment) {
    if (!garment) return MODELISTS[0];
    const scored = MODELISTS.map(m => {
      let s = 0;
      if (m.uzmanlik.includes(garment.type)) s += 3;
      if (garment.construction === "denim" && m.denim) s += 2;
      if (garment.construction === "dokuma" && !m.denim) s += 1;
      s += m.puan;
      return { m, s };
    }).sort((a, b) => b.s - a.s);
    return scored[0].m;
  }

  const helpers = {
    fabric: (id) => FABRICS.find(f => f.id === id),
    fabricsByFamily: (fam) => FABRICS.filter(f => f.family === fam),
    garment: (id) => GARMENTS.find(g => g.id === id),
    color: (id) => COLORS.find(c => c.id === id),
    suggestModelist
  };

  global.LOOMR_DATA = { COLORS, FABRICS, FABRIC_FAMILIES, GARMENTS, MODELISTS, FACTORIES, ...helpers };
})(typeof window !== "undefined" ? window : this);
