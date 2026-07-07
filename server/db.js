/* ============================================================
   LOOMR Backend — Veritabanı katmanı (node:sqlite, sıfır bağımlılık)
   Referans veri (kumaş/garment/renk/modelist) loomr-data.js'ten seed edilir;
   işlemsel veri (design/techpack/collection/sample/handoff) SQLite'ta tutulur.
   ============================================================ */
"use strict";

const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");

const { LOOMR_DATA } = require(path.join(__dirname, "..", "js", "loomr-data.js"));

const DATA_DIR = process.env.LOOMR_DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.LOOMR_DB || path.join(DATA_DIR, "loomr.db");
const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

/* ---------------- Şema ---------------- */
db.exec(`
CREATE TABLE IF NOT EXISTS designs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ref          TEXT UNIQUE,
  name         TEXT,
  garment_id   TEXT NOT NULL,
  fabric_id    TEXT NOT NULL,
  color_id     TEXT,
  color_hex    TEXT,
  notes        TEXT,
  thumb        TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS techpacks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ref           TEXT UNIQUE,
  design_id     INTEGER REFERENCES designs(id) ON DELETE SET NULL,
  garment_id    TEXT NOT NULL,
  fabric_id     TEXT NOT NULL,
  color_id      TEXT,
  color_hex     TEXT,
  name          TEXT,
  status        TEXT NOT NULL DEFAULT 'taslak',
  modelist_id   TEXT,
  measures_json TEXT,
  bom_json      TEXT,
  care_json     TEXT,
  notes         TEXT,
  thumb         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collections (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ref         TEXT UNIQUE,
  name        TEXT NOT NULL,
  season      TEXT,
  market      TEXT,
  segment     TEXT,
  meta_json   TEXT,
  items_json  TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS samples (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ref         TEXT UNIQUE,
  fabric_id   TEXT NOT NULL,
  color_id    TEXT,
  status      TEXT NOT NULL DEFAULT 'talep',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  action      TEXT NOT NULL,
  detail_json TEXT,
  created_at  TEXT NOT NULL
);
`);

/* ---------------- Yardımcılar ---------------- */
const now = () => new Date().toISOString();
const pad = (n) => String(n).padStart(4, "0");

function logEvent(entity, entityId, action, detail) {
  db.prepare(
    "INSERT INTO events (entity, entity_id, action, detail_json, created_at) VALUES (?,?,?,?,?)"
  ).run(entity, String(entityId ?? ""), action, detail ? JSON.stringify(detail) : null, now());
}

function setRef(table, prefix, id) {
  const ref = `${prefix}-${pad(id)}`;
  db.prepare(`UPDATE ${table} SET ref = ? WHERE id = ?`).run(ref, id);
  return ref;
}

/* ---------------- Referans veri (seed'siz, doğrudan bellekten) ---------------- */
const reference = {
  fabrics: () => LOOMR_DATA.FABRICS,
  fabric: (id) => LOOMR_DATA.fabric(id) || null,
  families: () => LOOMR_DATA.FABRIC_FAMILIES,
  garments: () => LOOMR_DATA.GARMENTS,
  garment: (id) => LOOMR_DATA.garment(id) || null,
  colors: () => LOOMR_DATA.COLORS,
  modelists: () => LOOMR_DATA.MODELISTS,
  suggestModelist: (garmentId) =>
    LOOMR_DATA.suggestModelist(LOOMR_DATA.garment(garmentId)),
};

/* ---------------- Designs ---------------- */
const designs = {
  list() {
    return db.prepare("SELECT * FROM designs ORDER BY id DESC").all();
  },
  get(id) {
    return db.prepare("SELECT * FROM designs WHERE id = ? OR ref = ?").get(id, id);
  },
  create(d) {
    const g = reference.garment(d.garment_id);
    if (!g) throw httpErr(400, "Geçersiz garment_id");
    if (!reference.fabric(d.fabric_id)) throw httpErr(400, "Geçersiz fabric_id");
    const t = now();
    const info = db
      .prepare(
        `INSERT INTO designs (name, garment_id, fabric_id, color_id, color_hex, notes, thumb, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?)`
      )
      .run(
        d.name || g.ad,
        d.garment_id,
        d.fabric_id,
        d.color_id || null,
        d.color_hex || null,
        d.notes || null,
        d.thumb || null,
        t,
        t
      );
    const id = Number(info.lastInsertRowid);
    const ref = setRef("designs", "DSG", id);
    logEvent("design", ref, "created", { garment: d.garment_id, fabric: d.fabric_id });
    return this.get(id);
  },
  update(id, patch) {
    const cur = this.get(id);
    if (!cur) return null;
    const fields = ["name", "fabric_id", "color_id", "color_hex", "notes", "thumb"];
    const sets = [];
    const vals = [];
    for (const f of fields) {
      if (patch[f] !== undefined) {
        sets.push(`${f} = ?`);
        vals.push(patch[f]);
      }
    }
    if (!sets.length) return cur;
    sets.push("updated_at = ?");
    vals.push(now(), cur.id);
    db.prepare(`UPDATE designs SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    return this.get(cur.id);
  },
  remove(id) {
    const cur = this.get(id);
    if (!cur) return false;
    db.prepare("DELETE FROM designs WHERE id = ?").run(cur.id);
    logEvent("design", cur.ref, "deleted", null);
    return true;
  },
};

/* ---------------- Tech-packs ---------------- */
const techpacks = {
  list() {
    return db.prepare("SELECT * FROM techpacks ORDER BY id DESC").all().map(hydrateTechpack);
  },
  get(id) {
    const r = db.prepare("SELECT * FROM techpacks WHERE id = ? OR ref = ?").get(id, id);
    return r ? hydrateTechpack(r) : null;
  },
  create(input) {
    // input: { design_id? , garment_id, fabric_id, color_id, color_hex, name?, notes?, thumb? }
    let base = input;
    if (input.design_id) {
      const d = designs.get(input.design_id);
      if (!d) throw httpErr(400, "design_id bulunamadı");
      base = { ...d, ...input, design_id: d.id };
    }
    const g = reference.garment(base.garment_id);
    if (!g) throw httpErr(400, "Geçersiz garment_id");
    const fabric = reference.fabric(base.fabric_id);
    if (!fabric) throw httpErr(400, "Geçersiz fabric_id");

    const measures = base.measures || g.measures;
    const bom = base.bom || g.bom;
    const care = base.care || defaultCare(g, fabric);
    const t = now();
    const info = db
      .prepare(
        `INSERT INTO techpacks
         (design_id, garment_id, fabric_id, color_id, color_hex, name, status, measures_json, bom_json, care_json, notes, thumb, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        base.design_id || null,
        base.garment_id,
        base.fabric_id,
        base.color_id || null,
        base.color_hex || null,
        base.name || `${g.ad} — Teknik Föy`,
        "taslak",
        JSON.stringify(measures),
        JSON.stringify(bom),
        JSON.stringify(care),
        base.notes || null,
        base.thumb || null,
        t,
        t
      );
    const id = Number(info.lastInsertRowid);
    const ref = setRef("techpacks", "TP", id);
    logEvent("techpack", ref, "created", { garment: base.garment_id, fabric: base.fabric_id });
    return this.get(id);
  },
  /* Modeliste devret */
  handoff(id, modelistId) {
    const tp = this.get(id);
    if (!tp) return null;
    const g = reference.garment(tp.garment_id);
    const ml = modelistId
      ? reference.modelists().find((m) => m.id === modelistId)
      : reference.suggestModelist(tp.garment_id);
    if (!ml) throw httpErr(400, "Modelist bulunamadı");
    db.prepare("UPDATE techpacks SET modelist_id = ?, status = ?, updated_at = ? WHERE id = ?").run(
      ml.id,
      "modeliste_iletildi",
      now(),
      tp.id
    );
    logEvent("techpack", tp.ref, "handoff", { modelist: ml.id, garment: g?.id });
    return { techpack: this.get(tp.id), modelist: ml };
  },
  setStatus(id, status) {
    const tp = this.get(id);
    if (!tp) return null;
    db.prepare("UPDATE techpacks SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), tp.id);
    logEvent("techpack", tp.ref, "status", { status });
    return this.get(tp.id);
  },
};

function hydrateTechpack(r) {
  const g = reference.garment(r.garment_id);
  const fabric = reference.fabric(r.fabric_id);
  const modelist = r.modelist_id
    ? reference.modelists().find((m) => m.id === r.modelist_id)
    : null;
  return {
    ...r,
    measures: safeParse(r.measures_json, []),
    bom: safeParse(r.bom_json, []),
    care: safeParse(r.care_json, []),
    garment: g ? { id: g.id, ad: g.ad, type: g.type, construction: g.construction } : null,
    fabric: fabric
      ? { id: fabric.id, ad: fabric.ad, komp: fabric.komp, family: fabric.family, gsm: fabric.gsm }
      : null,
    modelist,
  };
}

function defaultCare(g, fabric) {
  const care = ["Ters yüz yıkayın"];
  if (fabric.family === "yun") care.push("30°C yünlü programı", "Kuru temizleme önerilir", "Ütü: orta ısı, nem ile");
  else if (fabric.family === "denim") care.push("İlk yıkama ayrı", "30°C", "Ütü: yüksek ısı");
  else if (fabric.family === "viskon" || fabric.family === "tencel") care.push("30°C narin", "Ütü: orta ısı", "Kurutucu kullanmayın");
  else care.push("30°C", "Ütü: düşük ısı", "Ağartıcı kullanmayın");
  return care;
}

/* ---------------- Collections ---------------- */
const collections = {
  list() {
    return db.prepare("SELECT * FROM collections ORDER BY id DESC").all().map((r) => ({
      ...r,
      meta: safeParse(r.meta_json, {}),
      items: safeParse(r.items_json, []),
    }));
  },
  create(c) {
    if (!c.name) throw httpErr(400, "name gerekli");
    const t = now();
    const info = db
      .prepare(
        `INSERT INTO collections (name, season, market, segment, meta_json, items_json, created_at)
         VALUES (?,?,?,?,?,?,?)`
      )
      .run(
        c.name,
        c.season || null,
        c.market || null,
        c.segment || null,
        JSON.stringify(c.meta || {}),
        JSON.stringify(c.items || []),
        t
      );
    const id = Number(info.lastInsertRowid);
    const ref = setRef("collections", "COL", id);
    logEvent("collection", ref, "created", { name: c.name });
    return db.prepare("SELECT * FROM collections WHERE id = ?").get(id);
  },
};

/* ---------------- Samples ---------------- */
const samples = {
  list() {
    return db.prepare("SELECT * FROM samples ORDER BY id DESC").all();
  },
  create(s) {
    if (!reference.fabric(s.fabric_id)) throw httpErr(400, "Geçersiz fabric_id");
    const t = now();
    const info = db
      .prepare("INSERT INTO samples (fabric_id, color_id, status, created_at) VALUES (?,?,?,?)")
      .run(s.fabric_id, s.color_id || null, "talep", t);
    const id = Number(info.lastInsertRowid);
    const ref = setRef("samples", "SMP", id);
    logEvent("sample", ref, "requested", { fabric: s.fabric_id });
    return db.prepare("SELECT * FROM samples WHERE id = ?").get(id);
  },
};

/* ---------------- yardımcı ---------------- */
function safeParse(s, fallback) {
  try {
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}
function httpErr(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function stats() {
  const one = (sql) => db.prepare(sql).get().n;
  return {
    designs: one("SELECT COUNT(*) n FROM designs"),
    techpacks: one("SELECT COUNT(*) n FROM techpacks"),
    collections: one("SELECT COUNT(*) n FROM collections"),
    samples: one("SELECT COUNT(*) n FROM samples"),
  };
}

module.exports = {
  db,
  reference,
  designs,
  techpacks,
  collections,
  samples,
  stats,
  httpErr,
  DB_PATH,
};
