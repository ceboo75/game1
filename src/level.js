// Construction d'un étage à partir d'une carte texte (voir la légende dans levels.js).
import * as THREE from 'three';

export const CELL = 2;      // taille d'une case en mètres
export const WALL_H = 3.2;  // hauteur sous plafond
const GREEN = 0x39ff88, LOCK_RED = 0xff2a3a;

// ------------------------------------------------------------------ textures (dessinées par code)
function canvasTexture(w, h, draw, repeat = false) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const texCache = new Map();
function cached(key, make) {
  if (!texCache.has(key)) texCache.set(key, make());
  return texCache.get(key);
}

function floorTexture(f) {
  return canvasTexture(256, 256, (g, w, h) => {
    if (f.type === 'parquet') {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? f.a : f.b; g.fillRect(0, i * 32, w, 32);
        g.fillStyle = f.line; g.fillRect(0, i * 32, w, 2);
        const off = (i * 97) % 256;
        g.fillRect(off, i * 32, 2, 32); g.fillRect((off + 128) % 256, i * 32, 2, 32);
      }
      for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(Math.random() * w, Math.random() * h, 6, 1); }
    } else if (f.type === 'carpet') {
      g.fillStyle = f.a; g.fillRect(0, 0, w, h);
      g.strokeStyle = f.b; g.globalAlpha = 0.5; g.lineWidth = 3;
      for (let i = -1; i < 3; i++) for (let j = -1; j < 3; j++) {
        const cx = i * 128 + 64, cy = j * 128 + 64;
        g.beginPath(); g.moveTo(cx, cy - 40); g.lineTo(cx + 40, cy); g.lineTo(cx, cy + 40); g.lineTo(cx - 40, cy); g.closePath(); g.stroke();
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 1500; i++) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    } else {
      g.fillStyle = f.a; g.fillRect(0, 0, w, h);
      g.fillStyle = f.b; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128);
      for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.strokeStyle = f.line; g.lineWidth = 3;
      g.strokeRect(0, 0, w, h);
      g.beginPath(); g.moveTo(128, 0); g.lineTo(128, h); g.moveTo(0, 128); g.lineTo(w, 128); g.stroke();
    }
  }, true);
}

function wallTexture(c) {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = c.base; g.fillRect(0, 0, w, h);
    g.fillStyle = c.low; g.fillRect(0, h * 0.55, w, h * 0.45);
    g.fillStyle = c.plinth; g.fillRect(0, h - 18, w, 18);
    g.fillStyle = c.dado; g.fillRect(0, h * 0.55 - 4, w, 8);
    g.fillStyle = c.seam; g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h);
  });
}

function windowTexture(style) {
  return canvasTexture(128, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    if (style === 'garden') {
      grd.addColorStop(0, '#0b1a3a'); grd.addColorStop(0.7, '#1a2a4a'); grd.addColorStop(1, '#0a140f');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f2ecd0'; g.beginPath(); g.arc(90, 60, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#06100a';
      for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(i * 26 + 4, h * 0.82, 26 + (i % 3) * 8, 0, Math.PI * 2); g.fill(); }
      g.fillRect(0, h * 0.85, w, h);
    } else {
      grd.addColorStop(0, '#0a0c24'); grd.addColorStop(0.6, '#2a1440'); grd.addColorStop(1, '#4a1a40');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      for (let b = 0; b < 7; b++) {
        const bx = b * 20 - 6, bw = 16 + (b % 3) * 4, top = 70 + ((b * 53) % 110);
        g.fillStyle = '#07070f'; g.fillRect(bx, top, bw, h);
        for (let y = top + 6; y < h; y += 9) for (let x = bx + 3; x < bx + bw - 3; x += 5) {
          if (Math.random() < 0.35) { g.fillStyle = Math.random() < 0.7 ? '#ffd27a' : '#bfe8ff'; g.fillRect(x, y, 2, 3); }
        }
      }
    }
    g.fillStyle = '#15151a';                       // montants de la fenêtre
    g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h); g.fillRect(0, 0, w, 6); g.fillRect(0, h - 10, w, 10);
    g.fillRect(w / 2 - 2, 0, 4, h);
  });
}

function labelTexture(text, color) {
  return canvasTexture(256, 96, (g, w, h) => {
    g.fillStyle = 'rgba(5,8,6,0.85)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.font = 'bold 50px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 16; g.fillStyle = color;
    g.fillText(text, w / 2, h / 2 + 3);
  });
}

const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// ------------------------------------------------------------------ étage
export class Level {
  /**
   * @param rows   carte texte
   * @param theme  thème visuel (levels.js)
   * @param exitKind 'D' (escalier) ou 'X' (sortie) : sert au libellé
   */
  constructor(scene, rows, theme) {
    this.theme = theme;
    this.h = rows.length;
    this.w = Math.max(...rows.map(r => r.length));
    this.grid = rows.map(r => r.padEnd(this.w, '#').split(''));
    this.start = { x: 0, z: 0 };
    this.spawns = [];
    this.bossSpots = [];
    this.goalCells = [];
    this.goalType = null;
    for (let z = 0; z < this.h; z++) {
      for (let x = 0; x < this.w; x++) {
        const ch = this.grid[z][x];
        const p = { x: this.center(x), z: this.center(z), cx: x, cz: z };
        if (ch === 'S') { this.start = p; this.grid[z][x] = '.'; }
        else if (ch === 'e') { this.spawns.push(p); this.grid[z][x] = '.'; }
        else if (ch === 'B') { this.bossSpots.push(p); this.grid[z][x] = '.'; }
        else if (ch === 'D' || ch === 'X') { this.goalCells.push([x, z]); this.goalType = ch; }
      }
    }
    this.locked = false;
    this.group = new THREE.Group();
    scene.add(this.group);
    this._build();
  }

  // ---------- requêtes sur la grille ----------
  cell(cx, cz) {
    if (cx < 0 || cz < 0 || cx >= this.w || cz >= this.h) return '#';
    return this.grid[cz][cx];
  }
  isWall(cx, cz) { const c = this.cell(cx, cz); return c === '#' || c === 'W'; }
  solid(cx, cz) { const c = this.cell(cx, cz); return c === '#' || c === 'W' || c === 'c'; }
  toCell(v) { return Math.floor(v / CELL); }
  center(c) { return (c + 0.5) * CELL; }
  /** 'D' ou 'X' si la position est sur l'escalier / la sortie, sinon null */
  goalAt(x, z) {
    const c = this.cell(this.toCell(x), this.toCell(z));
    return c === 'D' || c === 'X' ? c : null;
  }

  collides(x, z, r) {
    const x0 = this.toCell(x - r), x1 = this.toCell(x + r);
    const z0 = this.toCell(z - r), z1 = this.toCell(z + r);
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) if (this.solid(cx, cz)) return true;
    return false;
  }

  move(pos, dx, dz, r) {
    if (!this.collides(pos.x + dx, pos.z, r)) pos.x += dx;
    if (!this.collides(pos.x, pos.z + dz, r)) pos.z += dz;
  }

  /** Ligne de vue (seuls les murs bloquent, les meubles sont bas). */
  los(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const n = Math.ceil(Math.hypot(dx, dz) / 0.3);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this.isWall(this.toCell(ax + dx * t), this.toCell(az + dz * t))) return false;
    }
    return true;
  }

  flowFrom(x, z) {
    const w = this.w, h = this.h;
    const dist = new Int16Array(w * h).fill(-1);
    const sx = this.toCell(x), sz = this.toCell(z);
    if (this.solid(sx, sz)) return dist;
    const queue = new Int32Array(w * h);
    let head = 0, tail = 0;
    dist[sz * w + sx] = 0; queue[tail++] = sz * w + sx;
    while (head < tail) {
      const i = queue[head++];
      const cx = i % w, cz = (i / w) | 0;
      for (const [ox, oz] of DIRS4) {
        const nx = cx + ox, nz = cz + oz;
        if (this.solid(nx, nz)) continue;
        const j = nz * w + nx;
        if (dist[j] !== -1) continue;
        dist[j] = dist[i] + 1; queue[tail++] = j;
      }
    }
    return dist;
  }

  distAt(flow, x, z) {
    const cx = this.toCell(x), cz = this.toCell(z);
    if (cx < 0 || cz < 0 || cx >= this.w || cz >= this.h) return -1;
    return flow[cz * this.w + cx];
  }

  nextStep(x, z, flow) {
    const cx = this.toCell(x), cz = this.toCell(z);
    const here = this.distAt(flow, x, z);
    if (here <= 0) return null;
    let best = here, bx = 0, bz = 0, found = false;
    for (const [ox, oz] of DIRS8) {
      const nx = cx + ox, nz = cz + oz;
      if (this.solid(nx, nz)) continue;
      if (ox && oz && (this.solid(cx + ox, cz) || this.solid(cx, cz + oz))) continue;
      const d = flow[nz * this.w + nx];
      if (d >= 0 && d < best) { best = d; bx = nx; bz = nz; found = true; }
    }
    return found ? { x: this.center(bx), z: this.center(bz) } : null;
  }

  /** Escalier / sortie verrouillé tant qu'un boss de l'étage est en vie. */
  setLocked(locked) {
    this.locked = locked;
    const c = locked ? LOCK_RED : this.goalColor;
    for (const m of this.goalMats) m.color.setHex(c);
    if (this.goalLight) this.goalLight.color.setHex(c);
  }

  update(dt) {
    this.pulse = (this.pulse || 0) + dt;
    if (this.beamMat) this.beamMat.opacity = 0.16 + Math.sin(this.pulse * 3) * 0.05;
  }

  // ---------- géométrie ----------
  _build() {
    const g = this.group, t = this.theme, W = this.w * CELL, H = this.h * CELL;

    const floorTex = cached('floor:' + t.floor.type + t.floor.a, () => floorTexture(t.floor)).clone();
    floorTex.needsUpdate = true;
    floorTex.repeat.set(this.w, this.h);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(W / 2, 0, H / 2);
    g.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ color: t.ceiling, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(W / 2, WALL_H, H / 2);
    g.add(ceil);

    // Murs et fenêtres : seulement ceux qui bordent une case ouverte.
    const wallCells = [], winCells = [], coverCells = [];
    const open = (x, z) => !this.isWall(x, z);
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      const ch = this.grid[z][x];
      if (ch === 'c') coverCells.push([x, z]);
      if (ch !== '#' && ch !== 'W') continue;
      if (!DIRS8.some(([ox, oz]) => open(x + ox, z + oz) && this.cell(x + ox, z + oz) !== '#' || false)) continue;
      (ch === 'W' ? winCells : wallCells).push([x, z]);
    }
    const m = new THREE.Matrix4();
    const box = new THREE.BoxGeometry(CELL, WALL_H, CELL);
    const walls = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ map: cached('wall:' + t.wall.base, () => wallTexture(t.wall)), roughness: 0.85 }), Math.max(1, wallCells.length));
    walls.count = wallCells.length;
    wallCells.forEach(([x, z], i) => { m.makeTranslation(this.center(x), WALL_H / 2, this.center(z)); walls.setMatrixAt(i, m); });
    g.add(walls);
    this.walls = walls;

    const wins = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ map: cached('win:' + t.window, () => windowTexture(t.window)) }), Math.max(1, winCells.length));
    wins.count = winCells.length;
    winCells.forEach(([x, z], i) => { m.makeTranslation(this.center(x), WALL_H / 2, this.center(z)); wins.setMatrixAt(i, m); });
    g.add(wins);
    this.windows = wins;

    const cv = t.cover;
    const covers = new THREE.InstancedMesh(
      new THREE.BoxGeometry(cv.w, cv.h, cv.w),
      new THREE.MeshStandardMaterial({ color: cv.color, roughness: 0.6, metalness: 0.15 }),
      Math.max(1, coverCells.length)
    );
    covers.count = coverCells.length;
    coverCells.forEach(([x, z], i) => { m.makeTranslation(this.center(x), cv.h / 2, this.center(z)); covers.setMatrixAt(i, m); });
    g.add(covers);
    this.covers = covers;

    // Bandes néon le long des murs (haut et bas).
    const strips = [];
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      if (this.isWall(x, z)) continue;
      for (const [ox, oz] of DIRS4) {
        if (this.cell(x + ox, z + oz) !== '#') continue;
        const px = this.center(x) + ox * (CELL / 2 - 0.04);
        const pz = this.center(z) + oz * (CELL / 2 - 0.04);
        const sx = ox ? 0.05 : CELL, sz = oz ? 0.05 : CELL;
        strips.push({ px, pz, sx, sz, y: WALL_H - 0.14, sy: 0.06, color: t.neon[0], k: 1 });
        strips.push({ px, pz, sx, sz, y: 0.05, sy: 0.04, color: t.neon[1], k: 0.6 });
      }
    }
    const stripMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ fog: false }), Math.max(1, strips.length));
    stripMesh.count = strips.length;
    const col = new THREE.Color(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    strips.forEach((st, i) => {
      m.compose(p.set(st.px, st.y, st.pz), q, s.set(st.sx, st.sy, st.sz));
      stripMesh.setMatrixAt(i, m);
      stripMesh.setColorAt(i, col.setHex(st.color).multiplyScalar(st.k));
    });
    g.add(stripMesh);

    this._placeLights();
    this._buildGoal();
  }

  /** Lumières réparties automatiquement : d'abord les grands espaces, puis les pièces isolées (9 max pour le mobile). */
  _placeLights() {
    const t = this.theme, cand = [];
    for (let z = 1; z < this.h - 1; z++) for (let x = 1; x < this.w - 1; x++) {
      if (this.solid(x, z)) continue;
      let openN = 0;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (!this.isWall(x + dx, z + dz)) openN++;
      cand.push({ x, z, openN });
    }
    cand.sort((a, b) => b.openN - a.openN || a.x - b.x || a.z - b.z);
    const chosen = [];
    for (const c of cand) {
      if (chosen.length >= 7) break;
      if (chosen.some(o => Math.hypot(o.x - c.x, o.z - c.z) < 5)) continue;
      chosen.push(c);
    }
    // couvre aussi les pièces isolées restées sans lumière
    for (const c of cand.slice().sort((a, b) => a.openN - b.openN)) {
      if (chosen.length >= 9) break;
      if (chosen.some(o => Math.hypot(o.x - c.x, o.z - c.z) < 4.6 || this.los(this.center(o.x), this.center(o.z), this.center(c.x), this.center(c.z)) && Math.hypot(o.x - c.x, o.z - c.z) < 7)) continue;
      chosen.push(c);
    }
    const fixtureGeo = new THREE.BoxGeometry(0.9, 0.06, 0.25);
    chosen.forEach((c, i) => {
      const color = t.lights[i % t.lights.length];
      const light = new THREE.PointLight(color, 26, 16, 1.3);
      light.position.set(this.center(c.x), WALL_H - 0.45, this.center(c.z));
      this.group.add(light);
      const fix = new THREE.Mesh(fixtureGeo, new THREE.MeshBasicMaterial({ color }));
      fix.position.set(this.center(c.x), WALL_H - 0.04, this.center(c.z));
      this.group.add(fix);
    });
    this.lightCount = chosen.length;
  }

  /** Escalier / sortie : dalle lumineuse, colonne de lumière et panneau toujours face au joueur. */
  _buildGoal() {
    if (!this.goalCells.length) return;
    const isExit = this.goalType === 'X';
    this.goalColor = isExit ? GREEN : 0x22e4ff;
    this.goalMats = [];
    const padMat = new THREE.MeshBasicMaterial({ color: this.goalColor, transparent: true, opacity: 0.35, depthWrite: false });
    this.beamMat = new THREE.MeshBasicMaterial({ color: this.goalColor, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.goalMats.push(padMat, this.beamMat);
    let ax = 0, az = 0;
    for (const [x, z] of this.goalCells) {
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(CELL * 0.92, CELL * 0.92), padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(this.center(x), 0.02, this.center(z));
      this.group.add(pad);
      ax += this.center(x); az += this.center(z);
    }
    ax /= this.goalCells.length; az /= this.goalCells.length;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, WALL_H, 16, 1, true), this.beamMat);
    beam.position.set(ax, WALL_H / 2, az);
    this.group.add(beam);
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(isExit ? 'SORTIE' : 'ESCALIER', isExit ? '#39ff88' : '#22e4ff'), fog: false }));
    sign.scale.set(1.9, 0.7, 1);
    sign.position.set(ax, 2.55, az);
    this.group.add(sign);
    this.goalLight = new THREE.PointLight(this.goalColor, 14, 9, 1.4);
    this.goalLight.position.set(ax, 1.2, az);
    this.group.add(this.goalLight);
    this.goalCenter = new THREE.Vector3(ax, 0, az);
  }

  dispose() {
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const mat of mats) {
        // les textures partagées (cache) sont conservées ; les autres sont libérées
        if (mat.map && ![...texCache.values()].includes(mat.map)) mat.map.dispose();
        mat.dispose();
      }
    });
    this.group.removeFromParent();
  }
}
