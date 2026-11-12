// Monde de la fuite sans fin : une suite de salles posées bout à bout le long de l'axe x.
// Chaque salle (murs, sol, mobilier, lumières, porte d'entrée) est construite quelques salles à l'avance,
// puis détruite quand le joueur l'a quittée. La grille couvre toutes les salles chargées : collisions,
// ligne de vue et chemins des ennemis passent d'une salle à l'autre.
// Grille : 1 caractère par case de 2 m. # mur, W vitre, . sol, c meuble (abri), P porte fermée.
import * as THREE from 'three';
import { THEMES } from './levels.js';
import { roomLayout, ROOM_H, DOOR_ROW } from './core/endless.js';
import { furniture, FURNITURE_MAT } from './game/decor.js';

export const CELL = 2;
export const WALL_H = 3.2;
export const ROWS = ROOM_H + 2;        // mur extérieur, intérieur, mur extérieur
export const DOOR_Z = DOOR_ROW + 1;    // ligne des portes dans la grille
const LIGHTS = 6;                      // lumières actives à la fois : nombre fixe, aucune recompilation des matériaux
const DOOR_H = 2.3, OPEN_TIME = 0.22, SWING = 1.75;
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS8 = [...DIRS4, [1, 1], [1, -1], [-1, 1], [-1, -1]];

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
    g.fillStyle = '#15151a'; // montants de la fenêtre
    g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h); g.fillRect(0, 0, w, 6); g.fillRect(0, h - 10, w, 10);
    g.fillRect(w / 2 - 2, 0, 4, h);
  });
}

// ------------------------------------------------------------------ ressources partagées par toutes les salles
const BOX = new THREE.BoxGeometry(CELL, WALL_H, CELL);
const UNIT = new THREE.BoxGeometry(1, 1, 1);
const STRIP_MAT = new THREE.MeshBasicMaterial({ fog: false });
const FIXTURE_GEO = new THREE.BoxGeometry(0.9, 0.06, 0.25);
const PANEL_GEO = new THREE.BoxGeometry(0.12, DOOR_H, CELL - 0.1);
const LINTEL_GEO = new THREE.BoxGeometry(CELL, WALL_H - DOOR_H, CELL);
const HANDLE_GEO = new THREE.BoxGeometry(0.16, 0.06, 0.3);
const PANEL_MAT = new THREE.MeshStandardMaterial({ color: 0x2a1d16, roughness: 0.6 });
const LINTEL_MAT = new THREE.MeshStandardMaterial({ color: 0x1a1518, roughness: 0.9 });
const HANDLE_LOCKED = new THREE.MeshBasicMaterial({ color: 0xff2a3a });
const HANDLE_OPEN = new THREE.MeshBasicMaterial({ color: 0x39ff88 });
const fixtureMats = new Map();
const fixtureMat = color => {
  if (!fixtureMats.has(color)) fixtureMats.set(color, new THREE.MeshBasicMaterial({ color }));
  return fixtureMats.get(color);
};

const kits = new Map();
/** Matériaux et géométries d'un décor, créés une seule fois. */
function kit(key) {
  if (kits.has(key)) return kits.get(key);
  const t = THEMES[key];
  const k = {
    t,
    floor: new THREE.MeshStandardMaterial({ map: floorTexture(t.floor), roughness: 0.6, metalness: 0.05 }),
    ceil: new THREE.MeshStandardMaterial({ color: t.ceiling, roughness: 1 }),
    wall: new THREE.MeshStandardMaterial({ map: wallTexture(t.wall), roughness: 0.85 }),
    win: new THREE.MeshBasicMaterial({ map: windowTexture(t.window) }),
    coverGeo: new THREE.BoxGeometry(t.cover.w, t.cover.h, t.cover.w),
    furniture: furniture(key, t.cover.h),
  };
  kits.set(key, k);
  return k;
}

// ------------------------------------------------------------------ salle
class Room {
  constructor(world, n) {
    const lay = roomLayout(world.seed, n);
    this.n = n;
    this.theme = lay.theme;
    this.layout = lay;
    this.x0 = world.nextCol;         // colonne du mur d'entrée (et de la porte)
    this.x1 = this.x0 + lay.w;       // dernière colonne intérieure
    world.nextCol = this.x1 + 1;
    this.enemies = [];
    this.kills = 0;
    this.owned = [];                 // géométries et maillages propres à la salle, libérés à sa destruction
    this.lights = [];                // emplacements de lumière { x, z, color }

    for (let c = this.x0; c <= this.x1; c++) {
      const col = new Array(ROWS);
      for (let z = 0; z < ROWS; z++) {
        if (z === 0 || z === ROWS - 1) col[z] = c % 3 === 1 ? 'W' : '#';
        else col[z] = c === this.x0 ? '#' : lay.rows[z - 1][c - this.x0 - 1];
      }
      if (c === this.x0 && n > 0) col[DOOR_Z] = 'P';
      world.cols.set(c, col);
    }
    this.group = new THREE.Group();   // intérieur : caché tant que la porte d'entrée est fermée (voir run.js)
    this.gate = new THREE.Group();    // mur d'entrée et porte : toujours affichés, c'est le fond de la salle précédente
    world.group.add(this.group, this.gate);
    this._build(world);
  }

  /** Case intérieure (colonne, ligne de l'intérieur) vers position dans le monde. */
  spot(world, [x, z]) { return { x: world.center(this.x0 + 1 + x), z: world.center(z + 1) }; }

  _build(W) {
    const k = kit(this.theme), g = this.group, m = new THREE.Matrix4();
    const cols = this.x1 - this.x0 + 1, wm = cols * CELL, hm = ROWS * CELL, x0m = this.x0 * CELL;

    // sol et plafond : une répétition de texture par case
    const plane = new THREE.PlaneGeometry(wm, hm);
    const uv = plane.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * cols, uv.getY(i) * ROWS);
    this.owned.push(plane);
    const floor = new THREE.Mesh(plane, k.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x0m + wm / 2, 0, hm / 2);
    const ceil = new THREE.Mesh(plane, k.ceil);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(x0m + wm / 2, WALL_H, hm / 2);
    g.add(floor, ceil);

    // murs et vitres qui bordent une case ouverte, meubles, bandes néon le long des murs
    const wallCells = [], winCells = [], coverCells = [], strips = [];
    const opaque = c => c === '#' || c === 'W';
    for (let x = this.x0; x <= this.x1; x++) for (let z = 0; z < ROWS; z++) {
      const ch = W.cell(x, z);
      if (opaque(ch)) {
        if (DIRS8.some(([ox, oz]) => !opaque(W.cell(x + ox, z + oz)))) (ch === 'W' ? winCells : wallCells).push([x, z]);
        continue;
      }
      if (ch === 'P') continue;
      if (ch === 'c') coverCells.push([x, z]);
      for (const [ox, oz] of DIRS4) {
        if (W.cell(x + ox, z + oz) !== '#') continue;
        if (x + ox > this.x1 && z === DOOR_Z) continue; // emplacement de la porte de sortie, posée par la salle suivante
        const px = W.center(x) + ox * (CELL / 2 - 0.04), pz = W.center(z) + oz * (CELL / 2 - 0.04);
        const sx = ox ? 0.05 : CELL, sz = oz ? 0.05 : CELL;
        strips.push([px, pz, sx, sz, WALL_H - 0.14, 0.06, k.t.neon[0], 1]);
        strips.push([px, pz, sx, sz, 0.05, 0.04, k.t.neon[1], 0.6]);
      }
    }
    const instanced = (geo, mat, cells, y, parent = g) => {
      const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, cells.length));
      mesh.count = cells.length;
      cells.forEach(([x, z], i) => { m.makeTranslation(W.center(x), y, W.center(z)); mesh.setMatrixAt(i, m); });
      parent.add(mesh);
      this.owned.push(mesh);
      return mesh;
    };
    const inGate = ([x]) => x === this.x0, inside = c => !inGate(c);
    this.walls = instanced(BOX, k.wall, wallCells.filter(inside), WALL_H / 2);
    this.windows = instanced(BOX, k.win, winCells.filter(inside), WALL_H / 2);
    this.gateWalls = instanced(BOX, k.wall, wallCells.filter(inGate), WALL_H / 2, this.gate);
    this.gateWindows = instanced(BOX, k.win, winCells.filter(inGate), WALL_H / 2, this.gate);
    this.covers = instanced(k.coverGeo, k.wall, coverCells, k.t.cover.h / 2);
    this.covers.visible = false; // le meuble est dessiné à part ; ce bloc invisible arrête les balles

    const furn = new THREE.InstancedMesh(k.furniture, FURNITURE_MAT, Math.max(1, coverCells.length));
    furn.count = coverCells.length;
    coverCells.forEach(([x, z], i) => {
      // le grand axe suit la rangée quand plusieurs meubles se touchent
      const alongZ = (W.cell(x, z - 1) === 'c' || W.cell(x, z + 1) === 'c') && W.cell(x - 1, z) !== 'c' && W.cell(x + 1, z) !== 'c';
      m.makeRotationY(alongZ ? Math.PI / 2 : 0).setPosition(W.center(x), 0, W.center(z));
      furn.setMatrixAt(i, m);
    });
    g.add(furn);
    this.owned.push(furn);

    const stripMesh = new THREE.InstancedMesh(UNIT, STRIP_MAT, Math.max(1, strips.length));
    stripMesh.count = strips.length;
    const col = new THREE.Color(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    strips.forEach(([px, pz, sx, sz, y, sy, color, mul], i) => {
      m.compose(p.set(px, y, pz), q, s.set(sx, sy, sz));
      stripMesh.setMatrixAt(i, m);
      stripMesh.setColorAt(i, col.setHex(color).multiplyScalar(mul));
    });
    g.add(stripMesh);
    this.owned.push(stripMesh);

    this._placeLights(W, k);
    if (this.n > 0) this._buildDoor(W);
  }

  /** Un ou deux plafonniers, au plus près des repères répartis dans la longueur de la salle. */
  _placeLights(W, k) {
    const marks = this.x1 - this.x0 >= 11 ? [0.28, 0.72] : [0.5];
    marks.forEach((f, i) => {
      const tx = this.x0 + 1 + f * (this.x1 - this.x0 - 1);
      let best = null, bd = Infinity;
      for (let x = this.x0 + 1; x <= this.x1; x++) for (let z = 1; z < ROWS - 1; z++) {
        if (W.solid(x, z)) continue;
        const d = Math.hypot(x - tx, z - DOOR_Z);
        if (d < bd) { bd = d; best = [x, z]; }
      }
      if (!best) return;
      const color = k.t.lights[(this.n + i) % k.t.lights.length];
      const fix = new THREE.Mesh(FIXTURE_GEO, fixtureMat(color));
      fix.position.set(W.center(best[0]), WALL_H - 0.04, W.center(best[1]));
      this.group.add(fix);
      this.lights.push({ x: W.center(best[0]), z: W.center(best[1]), color });
    });
  }

  /** Porte d'entrée : battant qui pivote vers la salle, linteau au-dessus. */
  _buildDoor(W) {
    const x = W.center(this.x0), z = W.center(DOOR_Z);
    const hinge = new THREE.Group();
    hinge.position.set(x, 0, z - CELL / 2 + 0.05);
    const panel = new THREE.Mesh(PANEL_GEO, PANEL_MAT);
    panel.position.set(0, DOOR_H / 2, CELL / 2 - 0.05);
    const handle = new THREE.Mesh(HANDLE_GEO, HANDLE_LOCKED);
    handle.position.set(0, 1.05, CELL - 0.45);
    hinge.add(panel, handle);
    const lintel = new THREE.Mesh(LINTEL_GEO, LINTEL_MAT);
    lintel.position.set(x, DOOR_H + (WALL_H - DOOR_H) / 2, z);
    this.gate.add(hinge, lintel);
    this.door = { x, z, hinge, panel, handle, open: false, k: 0 };
  }

  dispose() {
    for (const o of this.owned) o.dispose(); // maillages instanciés et géométries propres ; le reste est partagé
    this.group.removeFromParent();
    this.gate.removeFromParent();
  }
}

// ------------------------------------------------------------------ monde
export class World {
  constructor(scene, seed) {
    this.seed = seed;
    this.cols = new Map();  // colonne -> cases de la colonne
    this.rooms = [];        // salles chargées, dans l'ordre
    this.nextCol = 0;
    this.next = 0;          // numéro de la prochaine salle à construire
    this.group = new THREE.Group();
    scene.add(this.group);
    this.pool = Array.from({ length: LIGHTS }, () => {
      const l = new THREE.PointLight(0xffffff, 0, 16, 1.3);
      this.group.add(l);
      return l;
    });
    this.lightRoom = -1;
  }

  // ---------- salles ----------
  /** Construit la salle suivante et la renvoie. */
  buildNext() {
    const room = new Room(this, this.next++);
    this.rooms.push(room);
    this.lightRoom = -1; // les lumières seront réattribuées
    return room;
  }

  room(n) { return this.rooms.find(r => r.n === n) || null; }

  /** Salle qui contient la position x (mur d'entrée compris), ou null. */
  roomAt(x) {
    const c = this.toCell(x);
    return this.rooms.find(r => c >= r.x0 && c <= r.x1) || null;
  }

  /** Détruit les salles d'avant la salle n (leurs colonnes deviennent du mur). */
  dropBefore(n) {
    while (this.rooms.length && this.rooms[0].n < n) {
      const r = this.rooms.shift();
      for (let c = r.x0; c <= r.x1; c++) this.cols.delete(c);
      for (const e of r.enemies) e.dispose();
      r.enemies = [];
      r.dispose();
    }
    this.lightRoom = -1;
  }

  /** Point de départ du joueur : juste derrière le mur d'entrée de la première salle. */
  start() { const r = this.rooms[0]; return { x: this.center(r.x0 + 1), z: this.center(DOOR_Z) }; }

  // ---------- portes ----------
  /** Porte d'entrée de la salle : 'locked' (poignée rouge), 'unlocked' (poignée verte), 'open', 'closed' (verrouillée derrière le joueur). */
  setDoor(room, state) {
    const d = room.door;
    if (!d) return;
    d.handle.material = state === 'unlocked' || state === 'open' ? HANDLE_OPEN : HANDLE_LOCKED;
    const open = state === 'open';
    if (open === d.open) return;
    d.open = open;
    this.cols.get(room.x0)[DOOR_Z] = open ? '.' : 'P';
  }

  // ---------- requêtes sur la grille ----------
  cell(cx, cz) {
    if (cz < 0 || cz >= ROWS) return '#';
    const col = this.cols.get(cx);
    return col ? col[cz] : '#';
  }
  isWall(cx, cz) { const c = this.cell(cx, cz); return c === '#' || c === 'W' || c === 'P'; }
  solid(cx, cz) { const c = this.cell(cx, cz); return c === '#' || c === 'W' || c === 'P' || c === 'c'; }
  toCell(v) { return Math.floor(v / CELL); }
  center(c) { return (c + 0.5) * CELL; }

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

  /** Ligne de vue (murs, vitres et portes fermées bloquent ; les meubles sont bas). */
  los(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const n = Math.ceil(Math.hypot(dx, dz) / 0.3);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this.isWall(this.toCell(ax + dx * t), this.toCell(az + dz * t))) return false;
    }
    return true;
  }

  /** Distances à pied depuis une position, sur toutes les salles chargées. */
  flowFrom(x, z) {
    const x0 = this.rooms.length ? this.rooms[0].x0 : 0, w = Math.max(1, this.nextCol - x0), h = ROWS;
    const data = new Int16Array(w * h).fill(-1);
    const flow = { x0, w, data };
    const sx = this.toCell(x), sz = this.toCell(z);
    if (this.solid(sx, sz) || sx < x0 || sx >= x0 + w) return flow;
    const queue = new Int32Array(w * h);
    let head = 0, tail = 0;
    const s = sz * w + (sx - x0);
    data[s] = 0; queue[tail++] = s;
    while (head < tail) {
      const i = queue[head++];
      const cx = (i % w) + x0, cz = (i / w) | 0;
      for (const [ox, oz] of DIRS4) {
        const nx = cx + ox, nz = cz + oz;
        if (nx < x0 || nx >= x0 + w || this.solid(nx, nz)) continue;
        const j = nz * w + (nx - x0);
        if (data[j] !== -1) continue;
        data[j] = data[i] + 1; queue[tail++] = j;
      }
    }
    return flow;
  }

  distAt(flow, x, z) {
    const cx = this.toCell(x) - flow.x0, cz = this.toCell(z);
    if (cx < 0 || cz < 0 || cx >= flow.w || cz >= ROWS) return -1;
    return flow.data[cz * flow.w + cx];
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
      const d = this.distAt(flow, this.center(nx), this.center(nz));
      if (d >= 0 && d < best) { best = d; bx = nx; bz = nz; found = true; }
    }
    return found ? { x: this.center(bx), z: this.center(bz) } : null;
  }

  /** Objets qui arrêtent les balles : murs, vitres, meubles et portes fermées des salles chargées. */
  solids() {
    const out = [];
    for (const r of this.rooms) {
      out.push(r.walls, r.windows, r.covers, r.gateWalls, r.gateWindows);
      if (r.door && !r.door.open) out.push(r.door.panel);
    }
    return out;
  }

  // ---------- animation ----------
  /** Portes qui pivotent, et lumières attribuées aux plafonniers les plus proches du joueur. */
  update(dt, px) {
    for (const r of this.rooms) {
      const d = r.door;
      if (!d) continue;
      const target = d.open ? 1 : 0;
      if (d.k === target) continue;
      d.k = target > d.k ? Math.min(1, d.k + dt / OPEN_TIME) : Math.max(0, d.k - dt / OPEN_TIME);
      d.hinge.rotation.y = SWING * (1 - (1 - d.k) ** 3); // part vite, finit en douceur
    }
    const here = this.roomAt(px);
    if (here && here.n !== this.lightRoom) {
      this.lightRoom = here.n;
      const spots = this.rooms.filter(r => Math.abs(r.n - here.n) <= 1).flatMap(r => r.lights)
        .sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px));
      this.pool.forEach((l, i) => {
        const s = spots[i];
        l.intensity = s ? 26 : 0;
        if (s) { l.color.setHex(s.color); l.position.set(s.x, WALL_H - 0.45, s.z); }
      });
    }
  }

  dispose() {
    this.dropBefore(Infinity);
    this.group.removeFromParent();
  }
}
