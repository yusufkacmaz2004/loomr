/* ============================================================
   LOOMR Backend — HTTP sunucusu (native http, sıfır bağımlılık)
   REST API: /api/*   ·   Statik site: repo kökünden
   Çalıştır:  node server/server.js     (varsayılan port 4317)
   ============================================================ */
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const store = require("./db");

const PORT = process.env.PORT || 4317;
const ROOT = path.join(__dirname, ".."); // statik site kökü

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/* ---------------- yardımcılar ---------------- */
function send(res, status, body, extraHeaders = {}) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extraHeaders,
  };
  if (body !== null && typeof body === "object") {
    headers["Content-Type"] = "application/json; charset=utf-8";
    body = JSON.stringify(body);
  } else if (typeof body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "text/plain; charset=utf-8";
  }
  res.writeHead(status, headers);
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    let aborted = false;
    req.on("data", (c) => {
      if (aborted) return;
      size += c.length;
      if (size > 8 * 1024 * 1024) {
        aborted = true;
        reject(store.httpErr(413, "Gövde çok büyük"));
        req.destroy();
        return;
      }
      data += c;
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(store.httpErr(400, "Geçersiz JSON"));
      }
    });
    req.on("error", reject);
  });
}

/* ---------------- API yönlendirme ---------------- */
async function handleApi(req, res, url) {
  const seg = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const method = req.method;
  const [r0, r1, r2] = seg;

  // ---- referans (salt-okunur) ----
  if (method === "GET") {
    if (r0 === "health")
      return send(res, 200, { ok: true, service: "loomr-api", db: path.basename(store.DB_PATH), stats: store.stats(), time: new Date().toISOString() });
    if (r0 === "fabrics") {
      if (!r1) return send(res, 200, store.reference.fabrics());
      const fab = store.reference.fabric(r1);
      return fab ? send(res, 200, fab) : notFound(res);
    }
    if (r0 === "families") return send(res, 200, store.reference.families());
    if (r0 === "colors") return send(res, 200, store.reference.colors());
    if (r0 === "garments") {
      if (!r1) return send(res, 200, store.reference.garments());
      const grm = store.reference.garment(r1);
      return grm ? send(res, 200, grm) : notFound(res);
    }
    if (r0 === "modelists") {
      if (r1 === "suggest") {
        const g = url.searchParams.get("garment");
        return send(res, 200, store.reference.suggestModelist(g) || null);
      }
      return send(res, 200, store.reference.modelists());
    }
  }

  // ---- designs ----
  if (r0 === "designs") {
    if (method === "GET" && !r1) return send(res, 200, store.designs.list());
    if (method === "GET" && r1) {
      const d = store.designs.get(r1);
      return d ? send(res, 200, d) : notFound(res);
    }
    if (method === "POST" && !r1) return send(res, 201, store.designs.create(await readBody(req)));
    if (method === "PATCH" && r1) {
      const d = store.designs.update(r1, await readBody(req));
      return send(res, d ? 200 : 404, d || { error: "bulunamadı" });
    }
    if (method === "DELETE" && r1)
      return send(res, store.designs.remove(r1) ? 204 : 404, null);
  }

  // ---- techpacks ----
  if (r0 === "techpacks") {
    if (method === "GET" && !r1) return send(res, 200, store.techpacks.list());
    if (method === "GET" && r1) {
      const tp = store.techpacks.get(r1);
      return tp ? send(res, 200, tp) : notFound(res);
    }
    if (method === "POST" && !r1) return send(res, 201, store.techpacks.create(await readBody(req)));
    if (method === "POST" && r2 === "handoff") {
      const body = await readBody(req);
      const out = store.techpacks.handoff(r1, body.modelist_id);
      return send(res, out ? 200 : 404, out || { error: "bulunamadı" });
    }
    if (method === "PATCH" && r1) {
      const body = await readBody(req);
      const tp = store.techpacks.setStatus(r1, body.status);
      return send(res, tp ? 200 : 404, tp || { error: "bulunamadı" });
    }
  }

  // ---- collections ----
  if (r0 === "collections") {
    if (method === "GET") return send(res, 200, store.collections.list());
    if (method === "POST") return send(res, 201, store.collections.create(await readBody(req)));
  }

  // ---- samples ----
  if (r0 === "samples") {
    if (method === "GET") return send(res, 200, store.samples.list());
    if (method === "POST") return send(res, 201, store.samples.create(await readBody(req)));
  }

  // ---- messages (iletişim / doğrudan gönderim) ----
  if (r0 === "messages") {
    if (method === "GET") return send(res, 200, store.messages.list());
    if (method === "POST") {
      const row = store.messages.create(await readBody(req));
      const out = await store.messages.deliver(row);
      return send(res, 201, { ...row, delivered: out.delivered });
    }
  }

  return send(res, 404, { error: "Bilinmeyen uç nokta", path: url.pathname });
}

function notFound(res) {
  send(res, 404, { error: "bulunamadı" });
  return undefined;
}

/* ---------------- Statik dosya servisi ---------------- */
function serveStatic(req, res, url) {
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch {
    return send(res, 400, "Geçersiz yol");
  }
  if (rel === "/") rel = "/index.html";
  const filePath = path.join(ROOT, path.normalize(rel));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) return send(res, 403, "Yasak");
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      // SPA değil; sadece bilinmeyen yol
      return send(res, 404, "Bulunamadı");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ---------------- Sunucu ---------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") return send(res, 204, null);

  if (url.pathname.startsWith("/api")) {
    try {
      await handleApi(req, res, url);
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error("[api]", e);
      if (res.headersSent) return;
      send(res, status, { error: e.message || "Sunucu hatası" });
    }
    return;
  }

  serveStatic(req, res, url);
});

process.on("uncaughtException", (e) => {
  console.error("[uncaughtException]", e);
});
process.on("unhandledRejection", (e) => {
  console.error("[unhandledRejection]", e);
});

server.listen(PORT, () => {
  console.log(`\n  LOOMR backend hazır`);
  console.log(`  ├─ Site : http://localhost:${PORT}/`);
  console.log(`  ├─ API  : http://localhost:${PORT}/api/health`);
  console.log(`  └─ DB   : ${store.DB_PATH}\n`);
});
