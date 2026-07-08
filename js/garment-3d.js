/* ============================================================
   LOOMR — 3D Garment Motoru (Three.js r128, global THREE)
   Hacimli parametrik garmentlar (lathe gövde + konik kol/paça tüpleri),
   kumaş kıvrımları, env-map'li malzeme, sönümlü (ağırlıklı) yavaş hareket.
   API (değişmedi):
     const studio = new LoomrStudio(el);
     studio.setGarment("shirt"|"jacket"|"pants"|"shorts");
     studio.setFabric(fabricObj); studio.setColor("#2C3A55");
     studio.capture();
   ============================================================ */
(function (global) {
  "use strict";

  const THREE = global.THREE;
  if (!THREE) { console.error("[LoomrStudio] THREE yüklenmedi."); return; }

  /* ============================================================
     Kumaş dokusu — bump (mikro-doku) + hafif renk varyasyonu
     ============================================================ */
  const _texCache = {};
  function weaveTexture(type) {
    if (_texCache[type]) return _texCache[type];
    const S = 512;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const x = c.getContext("2d");
    x.fillStyle = "#808080"; x.fillRect(0, 0, S, S);

    if (type === "twill") {
      x.fillStyle = "#8c8c8c"; x.fillRect(0, 0, S, S);
      for (let i = -S; i < S * 2; i += 6) {
        x.strokeStyle = "rgba(48,48,48,.6)"; x.lineWidth = 3;
        x.beginPath(); x.moveTo(i, 0); x.lineTo(i + S, S); x.stroke();
        x.strokeStyle = "rgba(230,230,230,.4)"; x.lineWidth = 1.2;
        x.beginPath(); x.moveTo(i + 3, 0); x.lineTo(i + 3 + S, S); x.stroke();
      }
    } else if (type === "plain") {
      for (let yy = 0; yy < S; yy += 6) for (let xx = 0; xx < S; xx += 6) {
        const on = ((xx / 6 + yy / 6) % 2) === 0;
        x.fillStyle = on ? "rgba(64,64,64,.5)" : "rgba(214,214,214,.42)";
        x.fillRect(xx, yy, 6, 6);
      }
    } else if (type === "wool") {
      const img = x.getImageData(0, 0, S, S);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = 128 + (Math.random() - 0.5) * 130;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = n; img.data[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      for (let k = 0; k < 2600; k++) {
        const b = Math.random() > .5;
        x.strokeStyle = `rgba(${b ? 70 : 205},${b ? 70 : 205},${b ? 60 : 200},.05)`;
        const px = Math.random() * S, py = Math.random() * S, a = Math.random() * Math.PI;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 9, py + Math.sin(a) * 9); x.stroke();
      }
    } else { // satin (viskon/tencel/poly)
      for (let yy = 0; yy < S; yy += 3) {
        const v = yy % 6 === 0 ? 150 : 118;
        x.fillStyle = `rgba(${v},${v},${v},.22)`; x.fillRect(0, yy, S, 1.5);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    _texCache[type] = tex;
    return tex;
  }

  function shadowTexture() {
    const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(24,11,11,.52)"); g.addColorStop(.42, "rgba(24,11,11,.2)");
    g.addColorStop(1, "rgba(24,11,11,0)");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }

  // Yumuşak stüdyo ortamı (env map için equirect gradyan)
  function envEquirect() {
    const w = 512, h = 256, c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#fdfaf5"); g.addColorStop(.45, "#efe7db");
    g.addColorStop(.55, "#e7dccf"); g.addColorStop(1, "#cbbeae");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // stüdyo softbox'ları (gerçekçi yansıma için parlak ışık lekeleri)
    for (const [cx, cy, r, a] of [[150, 60, 140, .85], [380, 80, 110, .6], [270, 40, 80, .5]]) {
      const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = rg; x.fillRect(0, 0, w, h);
    }
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    return t;
  }

  // Editoryal stüdyo fonu (sahne arka planı) — sıcak krem → derin krem sweep + ince ink vinyet
  function studioBackdrop() {
    const w = 64, h = 512, c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#F7F2EA");   // üst: yumuşak krem ışık
    g.addColorStop(0.42, "#F4EFE7"); // editoryal krem (--ed-cream)
    g.addColorStop(0.82, "#E9E0D2"); // derin krem taban
    g.addColorStop(1, "#DED3C2");   // en alt: hafif gölge
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // stüdyo spot parıltısı (üst-merkez sweep — lüks fotoğraf hissi)
    const sp = x.createRadialGradient(w / 2, h * 0.30, h * 0.02, w / 2, h * 0.34, h * 0.5);
    sp.addColorStop(0, "rgba(255,252,246,0.55)");
    sp.addColorStop(1, "rgba(255,252,246,0)");
    x.fillStyle = sp; x.fillRect(0, 0, w, h);
    // ince ink vinyet (alt köşeler)
    const vg = x.createRadialGradient(w / 2, h * 0.34, h * 0.12, w / 2, h * 0.5, h * 0.72);
    vg.addColorStop(0, "rgba(22,17,15,0)");
    vg.addColorStop(1, "rgba(22,17,15,0.14)");
    x.fillStyle = vg; x.fillRect(0, 0, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace || t.colorSpace;
    return t;
  }

  /* ============================================================
     Geometri yardımcıları
     ============================================================ */
  // Konik uzuv (kol/paça) — üst yarıçap topR, alt botR, boy L
  function limb(topR, botR, L, flat) {
    const g = new THREE.CylinderGeometry(topR, botR, L, 28, 10, false);
    if (flat) g.scale(1, 1, flat); // ön-arka hafif yassı
    return g;
  }

  // Lathe gövde: profile [[r,y]...], açık ön için phiLength<2π
  function torso(profile, phiStart, phiLength, flatZ) {
    const pts = profile.map(p => new THREE.Vector2(p[0], p[1]));
    const g = new THREE.LatheGeometry(pts, 64, phiStart, phiLength);
    if (flatZ) g.scale(1, 1, flatZ);
    return g;
  }

  // Kumaş kıvrımları: dikey drape + hafif düzensizlik (yerinde deforme)
  function drape(geo, foldAmp, folds, noise) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
      const ang = Math.atan2(vz, vx);
      const r = Math.hypot(vx, vz) || 1e-5;
      const fold = 1 + foldAmp * Math.sin(folds * ang + vy * 0.6);
      const n = 1 + noise * (Math.sin(vy * 5.3 + ang * 3.1) * 0.5);
      const nr = r * fold * n;
      pos.setX(i, (vx / r) * nr);
      pos.setZ(i, (vz / r) * nr);
    }
    geo.computeVertexNormals();
    return geo;
  }

  /* ============================================================
     LoomrStudio
     ============================================================ */
  class LoomrStudio {
    constructor(container) {
      this.el = container;
      this.colorHex = "#8E2430";
      this.fabric = null;
      this._models = new Set(); // GLB'si olan garment id'leri (manifest'ten)
      const w = container.clientWidth || 600, h = container.clientHeight || 520;

      this.scene = new THREE.Scene();
      // Editoryal krem stüdyo fonu (near-white yerine tema uyumlu backdrop)
      this.scene.background = studioBackdrop();
      this.camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
      this.camera.position.set(0, 0.2, 14);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.renderer.setSize(w, h, false);
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.06;
      this._lastW = w; this._lastH = h;
      container.appendChild(this.renderer.domElement);

      // env map (yumuşak yansıma → kumaşa can verir)
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromEquirectangular(envEquirect()).texture;

      // ışık
      this.scene.add(new THREE.HemisphereLight(0xfff6ec, 0x9a8f86, 0.55));
      const key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(5, 7, 8); this.scene.add(key);
      const rim = new THREE.DirectionalLight(0xffe6cc, 0.62); rim.position.set(-6, 3, -5); this.scene.add(rim);
      const fill = new THREE.DirectionalLight(0xffffff, 0.22); fill.position.set(0, -4, 6); this.scene.add(fill);

      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 8),
        new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = -4.15; this.scene.add(shadow);

      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.045;   // ağırlık hissi (inertia)
      this.controls.rotateSpeed = 0.55;       // yavaş döndürme
      this.controls.enablePan = false;
      this.controls.minDistance = 8; this.controls.maxDistance = 20;
      this.controls.minPolarAngle = Math.PI * 0.12; this.controls.maxPolarAngle = Math.PI * 0.86;
      this.controls.target.set(0, -0.2, 0);
      this.controls.autoRotateSpeed = 1.4;

      this.gender = "erkek";                // parametrik kesim (erkek | kadin)
      this.drape = 0.2;                     // kumaş karakteri (0 sert/yapılı .. 1 akıcı/dökümlü)
      this._isDesign = false;               // gerçek 3D tasarım (GLB) modu — baked materyal korunur
      this.group = new THREE.Group();
      this.pivot = new THREE.Group();       // salınım için
      this.pivot.add(this.group);
      this.scene.add(this.pivot);

      this.mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(this.colorHex),
        roughness: 0.82, metalness: 0.0, side: THREE.DoubleSide, envMapIntensity: 0.55,
      });

      this._resize = this._resize.bind(this);
      window.addEventListener("resize", this._resize);
      if (window.ResizeObserver) { this._ro = new ResizeObserver(this._resize); this._ro.observe(container); }

      this._t0 = performance.now();
      this._loop = this._loop.bind(this);
      this._running = true; this._loop();
    }

    _hardwareMat() {
      const brass = this.fabric && this.fabric.family === "denim";
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(brass ? "#B08D57" : "#8a8378"),
        roughness: 0.3, metalness: 0.9, envMapIntensity: 1.0,
      });
    }

    // Hangi garment'ların gerçek GLB modeli var (manifest'ten)
    setAvailableModels(arr) { this._models = new Set(arr || []); return this; }

    // GLB varsa gerçek modeli, yoksa prosedürel garmenti kur
    setGarment(meshKey, garmentId, gender) {
      this._isDesign = false;               // garment seçimi → düzenlenebilir moda dön
      this.garmentKey = meshKey;
      this._garmentId = garmentId || null;
      if (gender) this.gender = gender;
      if (garmentId && this._models.has(garmentId) && THREE.GLTFLoader) {
        this._loadGLB(garmentId, () => this._buildProcedural(meshKey));
      } else {
        this._buildProcedural(meshKey);
      }
      return this;
    }

    setGender(gender) {
      this.gender = gender;
      if (this.garmentKey) this.setGarment(this.garmentKey, this._garmentId, gender);
      return this;
    }

    setDrape(v) {
      if (typeof v === "number" && Math.abs((this.drape != null ? this.drape : 0.2) - v) < 0.001) return this;
      this.drape = v;
      if (this.garmentKey && !this._isGLB) this._buildProcedural(this.garmentKey);
      return this;
    }

    // Gerçek 3D tasarım yükle (Meshy/GLB) — baked doku korunur; cb(parts) yüklenince çağrılır
    setModel(url, cb) {
      this._isDesign = true;
      this._isGLB = true;
      this.garmentKey = null;
      this._designCb = cb || null;
      const loader = new THREE.GLTFLoader();
      fetch(url)
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject()))
        .then(buf => loader.parse(buf, "", g => this._mountGLB(g), () => {}))
        .catch(() => {});
      return this;
    }

    // İsimli parçaya (Blender modeli) renk uygula — baked dokuyu renkle çarpar
    setPartColor(index, hex) {
      const p = this._designParts && this._designParts[index];
      if (p && p.material && p.material.color) { p.material.color.set(hex); p.material.needsUpdate = true; }
      return this;
    }

    _loadGLB(id, fallback) {
      const url = `models/${id}.glb`;
      const loader = new THREE.GLTFLoader();
      fetch(url)
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject()))
        .then(buf => loader.parse(buf, "", g => this._mountGLB(g), () => fallback()))
        .catch(() => fallback());
    }

    _mountGLB(gltf) {
      while (this.group.children.length) { const m = this.group.children.pop(); m.geometry && m.geometry.dispose(); }
      const obj = gltf.scene;
      this._glbMats = [];
      this._designParts = [];
      obj.traverse(m => {
        if (m.isMesh && m.material) {
          m.material = m.material.clone();
          m.material.side = THREE.DoubleSide;
          m.material.envMapIntensity = this._isDesign ? 0.9 : 0.5;
          this._glbMats.push(m.material);
          if (this._isDesign) this._designParts.push({ name: m.name || `Parça ${this._designParts.length + 1}`, material: m.material });
        }
      });
      const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
      obj.scale.setScalar(6.6 / (size.y || 1));
      const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
      obj.position.sub(c);
      this.group.position.set(0, 0, 0);
      this.group.add(obj);
      this._isGLB = true;
      // tasarım (baked) modunda renk/kumaş uygulama — modelin kendi dokusu kalır
      if (!this._isDesign) { this._applyFabricToMaterial(); this.setColor(this.colorHex); }
      this.resetView();
      if (this._isDesign && this._designCb) this._designCb(this._designParts.map(p => p.name));
    }

    _buildProcedural(key) {
      this.garmentKey = key;
      this._isGLB = false; this._glbMats = null;
      while (this.group.children.length) {
        const m = this.group.children.pop();
        m.geometry && m.geometry.dispose();
      }
      const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat || this.mat); this.group.add(m); return m; };
      const hw = this._hardwareMat();

      // cinsiyete göre parametrik kesim çarpanları (kadın: dar omuz + belirgin bel)
      const fem = this.gender === "kadin";
      // gövde profili x çarpanları (alttan üste: hem, alt-bel, bel, göğüs, omuz, boyun)
      const facTop = fem ? [1.0, 0.9, 0.88, 0.98, 0.9, 1.0] : [1.0, 1.02, 1.0, 1.04, 1.06, 1.0];
      const px = (arr, facs) => arr.map((p, i) => [p[0] * (facs[i] != null ? facs[i] : 1), p[1]]);
      // kumaş karakteri: dr 0=sert/yapılı .. 1=akıcı/dökümlü
      const dr = (typeof this.drape === "number") ? this.drape : 0.2;
      const foldAmp = 0.55 + dr * 1.9;   // kıvrım şiddeti
      const hemLong = dr * 0.4;          // akıcı kumaş daha uzun düşer
      const boxy = (0.35 - dr) * 0.16;   // sert kumaş daha kutu (geniş etek)

      if (key === "shirt" || key === "jacket") {
        const jacket = key === "jacket";
        const flatZ = jacket ? 0.72 : 0.66;
        // gövde profili (alttan üste): hem, waist, chest, shoulder, neck
        const prof = px(jacket
          ? [[1.55, -2.4], [1.5, -1.2], [1.42, 0.1], [1.55, 1.0], [1.5, 1.7], [0.62, 1.95]]
          : [[1.35, -2.2], [1.2, -1.0], [1.32, 0.2], [1.38, 1.1], [1.28, 1.7], [0.55, 1.9]], facTop);
        // kumaş karakteri: etek ucu sert kumaşta geniş/kısa, akıcıda dar/uzun
        prof[0] = [prof[0][0] * (1 + boxy), prof[0][1] - hemLong];
        // ceket: açık ön (boşluk kameraya/öne bakar)
        const body = torso(prof, jacket ? Math.PI * 0.63 : 0, jacket ? Math.PI * 1.74 : Math.PI * 2, flatZ);
        drape(body, (jacket ? 0.02 : 0.03) * foldAmp, 9, 0.012 * foldAmp);
        add(body);
        const shoulderY = 1.55, shoulderX = (jacket ? 1.5 : 1.32) * (fem ? 0.9 : 1.06), fz = flatZ * 1.28;

        // kollar
        for (const s of [-1, 1]) {
          const sl = limb(jacket ? 0.5 : 0.44, jacket ? 0.4 : 0.32, 2.5, 0.85);
          drape(sl, 0.03 * foldAmp, 7, 0.01 * foldAmp);
          const m = add(sl);
          m.position.set(s * (shoulderX - 0.1), shoulderY - 0.75, 0);
          m.rotation.z = s * 0.98; m.rotation.x = 0.12;
        }
        // yaka — neckline halkası (tam halka, konum sorunsuz)
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 14, 44), this.mat);
        collar.position.set(0, 1.9, 0); collar.rotation.x = Math.PI / 2 - 0.16;
        this.group.add(collar);

        // düğmeler (ön merkez, +Z = kameraya bakan yüz)
        const n = jacket ? 4 : 7, top = jacket ? 1.2 : 1.55, bot = jacket ? -2.0 : -1.9;
        for (let i = 0; i < n; i++) {
          const y = top - (i * (top - bot)) / (n - 1);
          const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), hw);
          btn.rotation.x = Math.PI / 2;
          btn.position.set(0, y, fz + 0.03);
          this.group.add(btn);
        }
        this.group.position.y = -0.15;
      } else {
        // pantolon / short
        const short = key === "shorts";
        const legL = (short ? 1.8 : 3.3) + hemLong * 1.2;
        const flatZ = 0.8, fz = flatZ * 1.3;
        // kalça bloğu (bel → ağ) — cinsiyete göre kalça/bel oranı
        const facHip = fem ? [1.0, 1.05, 1.08, 0.9] : [1.0, 1.0, 1.0, 1.02];
        const hip = new THREE.Mesh(
          torso(px([[0.85, -0.55], [1.2, -0.05], [1.3, 0.45], [1.22, 1.05]], facHip), 0, Math.PI * 2, flatZ), this.mat);
        hip.position.y = 1.15; drape(hip.geometry, 0.02 * foldAmp, 8, 0.008 * foldAmp); this.group.add(hip);
        // bel bandı (ince) — kadın: daha dar
        const wbf = fem ? 0.9 : 1.0;
        const wb = new THREE.Mesh(
          torso([[1.24 * wbf, -0.14], [1.3 * wbf, 0.0], [1.24 * wbf, 0.16]], 0, Math.PI * 2, flatZ), this.mat);
        wb.position.y = 2.12; this.group.add(wb);
        // bacaklar (ağdan aşağı, hafif konik) — kadın: biraz daha dar ve yakın
        for (const s of [-1, 1]) {
          const lg = limb(0.56 * (fem ? 0.94 : 1), (short ? 0.54 : 0.44) * (fem ? 0.94 : 1), legL, 0.9);
          drape(lg, 0.03 * foldAmp, 8, 0.012 * foldAmp);
          const m = add(lg);
          m.position.set(s * (fem ? 0.46 : 0.5), 0.62 - legL / 2, 0);
          m.rotation.z = s * 0.04;
        }
        // düğme + perçinler (ön yüz)
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16), hw);
        btn.rotation.x = Math.PI / 2; btn.position.set(0, 2.15, fz); this.group.add(btn);
        for (const px of [-1.0, 1.0]) {
          const rv = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), hw);
          rv.rotation.x = Math.PI / 2; rv.position.set(px, 1.6, fz - 0.08); this.group.add(rv);
        }
        this.group.position.y = 0.35;
      }

      this._applyFabricToMaterial();
      this.resetView();
      return this;
    }

    setFabric(fabric) { this.fabric = fabric; if (this._isDesign) return this; this._applyFabricToMaterial(); return this; }

    _applyFabricToMaterial() {
      const f = this.fabric, type = (f && f.tex) || "plain";
      const tex = weaveTexture(type);
      const rep = f && f.gsm ? Math.max(3, Math.min(9, 1100 / f.gsm)) : 5;
      tex.repeat.set(rep, rep * 1.4);
      this.mat.bumpMap = tex;
      this.mat.bumpScale = type === "wool" ? 0.08 : type === "twill" ? 0.06 : type === "satin" ? 0.015 : 0.04;
      this.mat.roughness = f ? f.roughness : 0.82;
      this.mat.envMapIntensity = f ? 0.18 + (f.sheen || 0) * 0.6 : 0.3;
      this.mat.needsUpdate = true;
      if (this._isGLB && this._glbMats) {
        this._glbMats.forEach(m => {
          m.bumpMap = tex; m.bumpScale = this.mat.bumpScale;
          if (m.roughness !== undefined) m.roughness = this.mat.roughness;
          m.needsUpdate = true;
        });
      }
    }

    setColor(hex) {
      this.colorHex = hex;
      if (this._isDesign) return this;      // tasarım baked rengini koru
      this.mat.color.set(hex);
      if (this._isGLB && this._glbMats) this._glbMats.forEach(m => { m.color && m.color.set(hex); });
      return this;
    }

    resetView() { this.camera.position.set(0, 0.2, 14); this.controls.target.set(0, -0.2, 0); this.controls.update(); }
    toggleTurntable(on) { this.controls.autoRotate = on !== undefined ? on : !this.controls.autoRotate; return this.controls.autoRotate; }
    frontView() { this.camera.position.set(0, 0.2, 14); this.controls.update(); }
    sideView() { this.camera.position.set(13, 0.2, 2.5); this.controls.update(); }
    backView() { this.camera.position.set(0, 0.2, -14); this.controls.update(); }

    capture() {
      this.renderer.render(this.scene, this.camera);
      try { return this.renderer.domElement.toDataURL("image/png"); } catch (e) { return null; }
    }

    _resize() {
      if (this._rq) return; this._rq = true;
      requestAnimationFrame(() => {
        this._rq = false;
        const w = Math.round(this.el.clientWidth) || 600, h = Math.round(this.el.clientHeight) || 520;
        if (w === this._lastW && h === this._lastH) return;
        this._lastW = w; this._lastH = h;
        this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
      });
    }

    _loop() {
      if (!this._running) return;
      requestAnimationFrame(this._loop);
      // hafif kumaş salınımı (yavaş, canlı)
      const t = (performance.now() - this._t0) / 1000;
      this.pivot.rotation.z = Math.sin(t * 0.7) * 0.015;
      this.pivot.rotation.x = Math.sin(t * 0.5 + 1) * 0.008;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }

    dispose() {
      this._running = false;
      window.removeEventListener("resize", this._resize);
      this._ro && this._ro.disconnect();
      this.renderer.dispose();
      this.el.contains(this.renderer.domElement) && this.el.removeChild(this.renderer.domElement);
    }
  }

  global.LoomrStudio = LoomrStudio;
})(window);
