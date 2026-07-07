/* ============================================================
   LOOMR — 3D Garment Motoru (Three.js r128, global THREE)
   Parametrik garment siluetleri (extrude) + prosedürel kumaş dokuları.
   Kullanım:
     const studio = new LoomrStudio(containerEl);
     studio.setGarment("shirt");
     studio.setFabric(fabricObj);     // loomr-data kumaş kaydı
     studio.setColor("#2C3A55");
     const png = studio.capture();    // föy görseli (dataURL)
   ============================================================ */
(function (global) {
  "use strict";

  const THREE = global.THREE;
  if (!THREE) {
    console.error("[LoomrStudio] THREE yüklenmedi.");
    return;
  }

  /* ============================================================
     Prosedürel kumaş dokusu (grayscale bump map)
     ============================================================ */
  const _texCache = {};
  function weaveTexture(type) {
    if (_texCache[type]) return _texCache[type];
    const S = 256;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const x = c.getContext("2d");
    x.fillStyle = "#808080";
    x.fillRect(0, 0, S, S);

    if (type === "twill") {
      // çapraz dokuma (denim/twill)
      x.fillStyle = "#8a8a8a";
      x.fillRect(0, 0, S, S);
      for (let i = -S; i < S * 2; i += 5) {
        const g = x.createLinearGradient(i, 0, i + 3, 3);
        x.strokeStyle = "rgba(60,60,60,.55)";
        x.lineWidth = 2.2;
        x.beginPath();
        x.moveTo(i, 0);
        x.lineTo(i + S, S);
        x.stroke();
        x.strokeStyle = "rgba(220,220,220,.35)";
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(i + 2.5, 0);
        x.lineTo(i + 2.5 + S, S);
        x.stroke();
      }
    } else if (type === "plain") {
      // düz dokuma (keten/karışım) — çözgü/atkı
      for (let yy = 0; yy < S; yy += 4) {
        for (let xx = 0; xx < S; xx += 4) {
          const on = ((xx / 4 + yy / 4) % 2) === 0;
          x.fillStyle = on ? "rgba(70,70,70,.5)" : "rgba(210,210,210,.4)";
          x.fillRect(xx, yy, 4, 4);
        }
      }
    } else if (type === "wool") {
      // yün — havlı/heather gürültü
      const img = x.getImageData(0, 0, S, S);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = 128 + (Math.random() - 0.5) * 150;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
        img.data[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      // yumuşak lif çizgileri
      for (let k = 0; k < 900; k++) {
        x.strokeStyle = `rgba(${Math.random() > .5 ? 60 : 210},${Math.random() > .5 ? 60 : 210},60,.06)`;
        x.beginPath();
        const px = Math.random() * S, py = Math.random() * S, a = Math.random() * Math.PI;
        x.moveTo(px, py);
        x.lineTo(px + Math.cos(a) * 6, py + Math.sin(a) * 6);
        x.stroke();
      }
    } else {
      // satin / viskon / tencel — çok ince yatay akış, neredeyse düz
      for (let yy = 0; yy < S; yy += 2) {
        x.fillStyle = `rgba(${yy % 4 === 0 ? 150 : 120},${yy % 4 === 0 ? 150 : 120},${yy % 4 === 0 ? 150 : 120},.25)`;
        x.fillRect(0, yy, S, 1);
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    _texCache[type] = tex;
    return tex;
  }

  /* radial kontak gölgesi dokusu */
  function shadowTexture() {
    const S = 256;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(S / 2, S / 2, 8, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(40,20,20,.34)");
    g.addColorStop(0.55, "rgba(40,20,20,.14)");
    g.addColorStop(1, "rgba(40,20,20,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }

  /* ============================================================
     Garment silüetleri (THREE.Shape) — ön görünüm, x-simetrik
     ============================================================ */
  function tops(kind) {
    // kind: "shirt" | "jacket"
    const jacket = kind === "jacket";
    const hem = jacket ? -3.5 : -2.9;
    const shoulder = jacket ? 1.75 : 1.55;
    const sleeveOut = jacket ? 2.95 : 2.75;
    const bodyHalf = jacket ? 1.8 : 1.6;
    const s = new THREE.Shape();
    s.moveTo(-0.5, 3.0);
    s.lineTo(-shoulder, 3.05);
    s.lineTo(-sleeveOut, 1.95);
    s.lineTo(-sleeveOut + 0.25, 1.2);
    s.lineTo(-bodyHalf, 1.55);
    s.lineTo(-bodyHalf - 0.05, hem);
    s.lineTo(bodyHalf + 0.05, hem);
    s.lineTo(bodyHalf, 1.55);
    s.lineTo(sleeveOut - 0.25, 1.2);
    s.lineTo(sleeveOut, 1.95);
    s.lineTo(shoulder, 3.05);
    s.lineTo(0.5, 3.0);
    s.quadraticCurveTo(0, 2.55, -0.5, 3.0);
    return { shape: s, hem, bodyHalf, jacket };
  }

  function bottoms(kind) {
    // kind: "pants" | "shorts"
    const short = kind === "shorts";
    const legHem = short ? -1.2 : -3.7;
    const waist = 1.5;
    const hip = 1.45;
    const s = new THREE.Shape();
    s.moveTo(-waist, 3.0);
    s.lineTo(waist, 3.0);
    s.lineTo(hip, 0.2);
    s.lineTo(short ? hip - 0.05 : 0.42, legHem);
    s.lineTo(0.28, legHem);
    s.lineTo(0.18, -0.1);
    s.lineTo(0, 0.15);
    s.lineTo(-0.18, -0.1);
    s.lineTo(-0.28, legHem);
    s.lineTo(short ? -(hip - 0.05) : -0.42, legHem);
    s.lineTo(-hip, 0.2);
    s.closePath();
    return { shape: s, legHem, waist };
  }

  /* ============================================================
     LoomrStudio
     ============================================================ */
  class LoomrStudio {
    constructor(container) {
      this.el = container;
      this.garmentKey = null;
      this.fabric = null;
      this.colorHex = "#8E2430";

      const w = container.clientWidth || 600;
      const h = container.clientHeight || 520;

      this.scene = new THREE.Scene();

      this.camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
      this.camera.position.set(0, 0.2, 14);

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true, // capture() için
      });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.renderer.setSize(w, h, false); // updateStyle=false → CSS boyutu yönetir
      this._lastW = w;
      this._lastH = h;
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      container.appendChild(this.renderer.domElement);

      // ışık — editorial stüdyo
      this.scene.add(new THREE.HemisphereLight(0xfff6ec, 0x9a8f86, 0.85));
      const key = new THREE.DirectionalLight(0xffffff, 0.95);
      key.position.set(4, 6, 8);
      this.scene.add(key);
      const rim = new THREE.DirectionalLight(0xffe8d0, 0.5);
      rim.position.set(-6, 2, -4);
      this.scene.add(rim);
      const fill = new THREE.DirectionalLight(0xffffff, 0.3);
      fill.position.set(0, -4, 6);
      this.scene.add(fill);

      // kontak gölgesi
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 7),
        new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -4.1;
      this.scene.add(shadow);
      this._shadow = shadow;

      // kontroller
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.enablePan = false;
      this.controls.minDistance = 8;
      this.controls.maxDistance = 20;
      this.controls.minPolarAngle = Math.PI * 0.15;
      this.controls.maxPolarAngle = Math.PI * 0.82;
      this.controls.target.set(0, -0.2, 0);
      this.controls.autoRotateSpeed = 2.2;

      this.group = new THREE.Group();
      this.scene.add(this.group);

      // malzeme
      this.mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(this.colorHex),
        roughness: 0.85,
        metalness: 0.0,
      });

      this._resize = this._resize.bind(this);
      window.addEventListener("resize", this._resize);
      if (window.ResizeObserver) {
        this._ro = new ResizeObserver(this._resize);
        this._ro.observe(container);
      }

      this._loop = this._loop.bind(this);
      this._running = true;
      this._loop();
    }

    /* ---- garment kur ---- */
    setGarment(key) {
      this.garmentKey = key;
      // eski meshleri temizle
      while (this.group.children.length) {
        const m = this.group.children.pop();
        m.geometry && m.geometry.dispose();
      }

      const isTop = key === "shirt" || key === "jacket";
      const def = isTop ? tops(key) : bottoms(key);

      const depth = isTop ? (def.jacket ? 1.35 : 1.05) : 1.15;
      const geo = new THREE.ExtrudeGeometry(def.shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.22,
        bevelSize: 0.18,
        bevelSegments: 3,
        steps: 1,
        curveSegments: 14,
      });
      geo.translate(0, 0, -depth / 2);

      const body = new THREE.Mesh(geo, this.mat);
      this.group.add(body);
      this._body = body;

      const frontZ = depth / 2 + 0.24;

      // ---- aksesuarlar ----
      if (isTop) {
        // yaka (V)
        const collarMat = this.mat;
        const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 0.18), collarMat);
        c1.position.set(-0.42, 2.72, frontZ - 0.15);
        c1.rotation.z = 0.5;
        const c2 = c1.clone();
        c2.position.x = 0.42;
        c2.rotation.z = -0.5;
        this.group.add(c1, c2);

        // düğmeler
        const hw = this._hardwareMat();
        const bTop = def.jacket ? 2.0 : 2.35;
        const bBot = def.hem + 0.4;
        const n = def.jacket ? 4 : 7;
        for (let i = 0; i < n; i++) {
          const y = bTop - (i * (bTop - bBot)) / (n - 1);
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16), hw);
          b.rotation.x = Math.PI / 2;
          b.position.set(0, y, frontZ + 0.02);
          this.group.add(b);
        }
        // göğüs cebi (sol)
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.06), this.mat);
        pocket.position.set(-0.85, 1.15, frontZ - 0.02);
        this.group.add(pocket);
        if (def.jacket) {
          const pocket2 = pocket.clone();
          pocket2.position.x = 0.85;
          this.group.add(pocket2);
        }
      } else {
        // bel bandı
        const wb = new THREE.Mesh(new THREE.BoxGeometry(def.waist * 2 + 0.1, 0.5, depth + 0.3), this.mat);
        wb.position.set(0, 3.0, 0);
        this.group.add(wb);
        // düğme + fermuar hattı
        const hw = this._hardwareMat();
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16), hw);
        btn.rotation.x = Math.PI / 2;
        btn.position.set(0, 3.0, frontZ);
        this.group.add(btn);
        // perçinler (denim)
        if (this.garmentKey && String(this.garmentKey).length) {
          for (const px of [-1.15, 1.15]) {
            const rv = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), hw);
            rv.rotation.x = Math.PI / 2;
            rv.position.set(px, 2.55, frontZ);
            this.group.add(rv);
          }
        }
      }

      this.group.position.y = isTop ? -0.1 : 0.35;
      this._applyFabricToMaterial();
      this.resetView();
      return this;
    }

    _hardwareMat() {
      const brass = this.fabric && this.fabric.family === "denim";
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(brass ? "#B08D57" : "#8a8378"),
        roughness: 0.35,
        metalness: 0.85,
      });
    }

    /* ---- kumaş ---- */
    setFabric(fabric) {
      this.fabric = fabric;
      this._applyFabricToMaterial();
      return this;
    }

    _applyFabricToMaterial() {
      const f = this.fabric;
      const type = (f && f.tex) || "plain";
      const tex = weaveTexture(type);
      // gramaja göre tekrar (ince kumaş = sık doku)
      const rep = f && f.gsm ? Math.max(2.5, Math.min(7, 900 / f.gsm)) : 4;
      tex.repeat.set(rep, rep);
      this.mat.bumpMap = tex;
      this.mat.bumpScale = type === "wool" ? 0.06 : type === "twill" ? 0.05 : type === "satin" ? 0.01 : 0.03;
      this.mat.roughness = f ? f.roughness : 0.85;
      this.mat.metalness = 0.0;
      this.mat.needsUpdate = true;
    }

    setColor(hex) {
      this.colorHex = hex;
      this.mat.color.set(hex);
      return this;
    }

    /* ---- görünüm ---- */
    resetView() {
      this.camera.position.set(0, 0.2, 14);
      this.controls.target.set(0, -0.2, 0);
      this.controls.update();
    }
    toggleTurntable(on) {
      this.controls.autoRotate = on !== undefined ? on : !this.controls.autoRotate;
      return this.controls.autoRotate;
    }
    frontView() { this.camera.position.set(0, 0.2, 14); this.controls.update(); }
    sideView() { this.camera.position.set(13, 0.2, 2.5); this.controls.update(); }
    backView() { this.camera.position.set(0, 0.2, -14); this.controls.update(); }

    /* ---- föy görseli ---- */
    capture() {
      this.renderer.render(this.scene, this.camera);
      try {
        return this.renderer.domElement.toDataURL("image/png");
      } catch (e) {
        return null;
      }
    }

    _resize() {
      // rAF ile ertele + boyut değişmediyse atla → ResizeObserver geri besleme döngüsünü kır
      if (this._resizeQueued) return;
      this._resizeQueued = true;
      requestAnimationFrame(() => {
        this._resizeQueued = false;
        const w = Math.round(this.el.clientWidth) || 600;
        const h = Math.round(this.el.clientHeight) || 520;
        if (w === this._lastW && h === this._lastH) return;
        this._lastW = w;
        this._lastH = h;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
      });
    }

    _loop() {
      if (!this._running) return;
      requestAnimationFrame(this._loop);
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
