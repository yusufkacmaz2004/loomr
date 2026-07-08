/* ============================================================
   LOOMR — Frontend API istemcisi
   Backend (REST) açıksa onu kullanır; kapalıysa localStorage'a düşer.
   Böylece hem lokal sunucuda hem de statik yayında (GitHub Pages) çalışır.
   Ortak, Promise tabanlı arayüz: LoomrAPI.*
   ============================================================ */
(function (global) {
  "use strict";

  const D = global.LOOMR_DATA || {};

  // API tabanı: aynı origin (server.js hem siteyi hem API'yi servis eder).
  // İstersen <meta name="loomr-api" content="https://api.loomr.app"> ile ez.
  const meta = document.querySelector('meta[name="loomr-api"]');
  const API_BASE = (meta && meta.content) || `${location.origin}/api`;

  const LS = {
    designs: "loomr-designs",
    techpacks: "loomr-techpacks",
    collections: "loomr-koleksiyonlar",
    samples: "loomr-samples",
    messages: "loomr-messages",
  };

  let _online = null; // null=bilinmiyor, true/false

  /* ---------------- düşük seviye ---------------- */
  async function req(method, pathname, body) {
    const res = await fetch(API_BASE + pathname, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        msg = (await res.json()).error || msg;
      } catch (_) {}
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function online() {
    if (_online !== null) return _online;
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 1200);
      const res = await fetch(API_BASE + "/health", { signal: c.signal });
      clearTimeout(t);
      _online = res.ok;
    } catch (_) {
      _online = false;
    }
    if (!_online) console.info("[LOOMR] Backend kapalı — localStorage modunda çalışılıyor.");
    return _online;
  }

  /* ---------------- localStorage yardımcıları ---------------- */
  const lsGet = (k) => JSON.parse(localStorage.getItem(k) || "[]");
  const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const pad = (n) => String(n).padStart(4, "0");
  const nowISO = () => new Date().toISOString();

  function lsCreate(key, prefix, obj) {
    const arr = lsGet(key);
    const id = arr.length ? Math.max(...arr.map((x) => x.id || 0)) + 1 : 1;
    const rec = { id, ref: `${prefix}-${pad(id)}`, created_at: nowISO(), updated_at: nowISO(), ...obj };
    arr.push(rec);
    lsSet(key, arr);
    return rec;
  }
  function lsFind(key, idOrRef) {
    return lsGet(key).find((x) => String(x.id) === String(idOrRef) || x.ref === idOrRef) || null;
  }

  /* ---------------- referans veri (her zaman yerelden, hızlı) ---------------- */
  const reference = {
    fabrics: () => D.FABRICS || [],
    fabric: (id) => (D.fabric ? D.fabric(id) : null),
    families: () => D.FABRIC_FAMILIES || [],
    garments: () => D.GARMENTS || [],
    garment: (id) => (D.garment ? D.garment(id) : null),
    colors: () => D.COLORS || [],
    modelists: () => D.MODELISTS || [],
    suggestModelist: (garmentId) =>
      D.suggestModelist ? D.suggestModelist(D.garment(garmentId)) : null,
  };

  /* ---------------- designs ---------------- */
  const designs = {
    async list() {
      return (await online()) ? req("GET", "/designs") : lsGet(LS.designs).reverse();
    },
    async get(id) {
      return (await online()) ? req("GET", `/designs/${id}`) : lsFind(LS.designs, id);
    },
    async create(d) {
      if (await online()) return req("POST", "/designs", d);
      const g = reference.garment(d.garment_id);
      return lsCreate(LS.designs, "DSG", { name: d.name || (g && g.ad), ...d });
    },
    async remove(id) {
      if (await online()) return req("DELETE", `/designs/${id}`);
      const arr = lsGet(LS.designs).filter((x) => String(x.id) !== String(id) && x.ref !== id);
      lsSet(LS.designs, arr);
      return true;
    },
  };

  /* ---------------- techpacks ---------------- */
  const techpacks = {
    async list() {
      return (await online()) ? req("GET", "/techpacks") : lsGet(LS.techpacks).reverse();
    },
    async get(id) {
      return (await online()) ? req("GET", `/techpacks/${id}`) : lsFind(LS.techpacks, id);
    },
    async create(input) {
      if (await online()) return req("POST", "/techpacks", input);
      // yerel: design_id verildiyse tasarımdan garment/fabric bilgisini çöz (server db.js ile aynı davranış)
      let base = input;
      if (input.design_id) {
        const d = lsFind(LS.designs, input.design_id);
        if (d) base = { ...d, ...input, design_id: d.id };
      }
      // yerel: garment/fabric bilgisinden föy kur
      const g = reference.garment(base.garment_id);
      const f = reference.fabric(base.fabric_id);
      const rec = lsCreate(LS.techpacks, "TP", {
        design_id: base.design_id || null,
        garment_id: base.garment_id,
        fabric_id: base.fabric_id,
        color_id: base.color_id || null,
        color_hex: base.color_hex || null,
        name: base.name || (g ? `${g.ad} — Teknik Föy` : "Teknik Föy"),
        status: "taslak",
        measures: base.measures || (g ? g.measures : []),
        bom: base.bom || (g ? g.bom : []),
        care: base.care || localCare(g, f),
        thumb: base.thumb || null,
        garment: g ? { id: g.id, ad: g.ad, type: g.type, construction: g.construction } : null,
        fabric: f ? { id: f.id, ad: f.ad, komp: f.komp, family: f.family, gsm: f.gsm } : null,
        modelist: null,
      });
      return rec;
    },
    async handoff(id, modelistId) {
      if (await online())
        return req("POST", `/techpacks/${id}/handoff`, { modelist_id: modelistId });
      // yerel
      const arr = lsGet(LS.techpacks);
      const tp = arr.find((x) => String(x.id) === String(id) || x.ref === id);
      if (!tp) return null;
      const ml = modelistId
        ? reference.modelists().find((m) => m.id === modelistId)
        : reference.suggestModelist(tp.garment_id);
      tp.modelist = ml;
      tp.modelist_id = ml ? ml.id : null;
      tp.status = "modeliste_iletildi";
      tp.updated_at = nowISO();
      lsSet(LS.techpacks, arr);
      return { techpack: tp, modelist: ml };
    },
  };

  function localCare(g, f) {
    const care = ["Ters yüz yıkayın"];
    const fam = f && f.family;
    if (fam === "yun") care.push("30°C yünlü programı", "Kuru temizleme önerilir", "Ütü: orta ısı, nem ile");
    else if (fam === "denim") care.push("İlk yıkama ayrı", "30°C", "Ütü: yüksek ısı");
    else if (fam === "viskon" || fam === "tencel") care.push("30°C narin", "Ütü: orta ısı", "Kurutucu kullanmayın");
    else care.push("30°C", "Ütü: düşük ısı", "Ağartıcı kullanmayın");
    return care;
  }

  /* ---------------- collections ---------------- */
  const collections = {
    async list() {
      return (await online()) ? req("GET", "/collections") : lsGet(LS.collections).reverse();
    },
    async create(c) {
      if (await online()) return req("POST", "/collections", c);
      return lsCreate(LS.collections, "COL", c);
    },
  };

  /* ---------------- samples ---------------- */
  const samples = {
    async request(fabricId, colorId) {
      if (await online()) return req("POST", "/samples", { fabric_id: fabricId, color_id: colorId });
      return lsCreate(LS.samples, "SMP", { fabric_id: fabricId, color_id: colorId || null, status: "talep" });
    },
    async list() {
      return (await online()) ? req("GET", "/samples") : lsGet(LS.samples).reverse();
    },
  };

  /* ---------------- messages (iletişim / doğrudan gönderim) ---------------- */
  const messages = {
    async send(m) {
      if (await online()) return req("POST", "/messages", m);
      // backend yoksa yerelde kuyrukla (statik yayında)
      const rec = lsCreate(LS.messages, "MSG", { ...m, status: "kuyrukta", delivered: false });
      return rec;
    },
    async list() {
      return (await online()) ? req("GET", "/messages") : lsGet(LS.messages).reverse();
    },
  };

  global.LoomrAPI = { online, reference, designs, techpacks, collections, samples, messages, API_BASE };
})(window);
