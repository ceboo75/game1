// Animation de l'arme du joueur : culasse, pompe, rechargement en plusieurs temps, douilles éjectées.
// Ne reçoit aucun événement : il observe l'état de l'arme (munitions, rechargement) d'une image à l'autre.
// La pose d'ensemble (visée, balancement, recul) reste réglée par combat.js sur le support de l'arme.
import * as THREE from 'three';
import { game } from './state.js';
import { gunScene } from './view.js';

const clamp01 = v => Math.min(1, Math.max(0, v));
/** Passe en douceur de 0 à 1 quand p va de a à b. */
const smooth = (p, a, b) => { const t = clamp01((p - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- douilles
const SHELL_LIFE = 0.55;
const caseGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.024, 6);
const shotGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.05, 8);
const caseMat = new THREE.MeshStandardMaterial({ color: 0xc9a23a, roughness: 0.4, metalness: 0.3 });
const shotMat = new THREE.MeshStandardMaterial({ color: 0xa01818, roughness: 0.6 });
const shells = Array.from({ length: 10 }, () => {
  const mesh = new THREE.Mesh(caseGeo, caseMat);
  mesh.visible = false;
  gunScene.add(mesh);
  return { mesh, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0 };
});
let nextShell = 0;

function eject(gun, shotgun) {
  if (!gun.parent || !gun.parent.visible) return; // arme masquée en visée complète
  const s = shells[nextShell++ % shells.length];
  s.mesh.geometry = shotgun ? shotGeo : caseGeo;
  s.mesh.material = shotgun ? shotMat : caseMat;
  gun.updateWorldMatrix(true, false);
  gun.localToWorld(s.mesh.position.copy(gun.userData.eject));
  s.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  s.vel.set(0.9 + Math.random() * 0.5, 0.9 + Math.random() * 0.4, 0.15 + Math.random() * 0.3);
  s.spin.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
  s.life = SHELL_LIFE;
  s.mesh.visible = true;
}

function updateShells(dt) {
  for (const s of shells) {
    if (s.life <= 0) continue;
    s.life -= dt;
    if (s.life <= 0) { s.mesh.visible = false; continue; }
    s.vel.y -= 6 * dt;
    s.mesh.position.addScaledVector(s.vel, dt);
    s.mesh.rotation.x += s.spin.x * dt;
    s.mesh.rotation.y += s.spin.y * dt;
    s.mesh.rotation.z += s.spin.z * dt;
  }
}

// ---------------------------------------------------------------- état observé
const st = {
  gun: null, ammo: 0, reloading: false,
  t: 0,
  bolt: 0,          // recul de la culasse, 1 juste après un tir
  pump: -1,         // avancement du coup de pompe (0..1), -1 au repos
  pumpEject: false, // ce coup de pompe éjecte une cartouche
  insert: 0,        // à-coup à chaque cartouche insérée
  tilt: 0,          // arme inclinée pour recharger
  magOut: false, magIn: false,
};

/** À appeler à chaque image de jeu, après la mise à jour du combat. */
export function updateViewmodel(dt) {
  updateShells(dt);
  const ws = game.ws, w = game.weapon, gun = game.gun;
  if (!ws || !gun) return;
  if (st.gun !== gun) {
    Object.assign(st, { gun, ammo: ws.ammo, reloading: ws.reloading, bolt: 0, pump: -1, pumpEject: false, insert: 0, tilt: 0 });
  }
  const P = gun.userData.parts;
  const shotgun = gun.userData.kind === 'shotgun';

  // ce qui s'est passé depuis l'image précédente
  if (ws.ammo < st.ammo) {                       // un tir
    st.bolt = 1;
    if (shotgun) { st.pump = 0; st.pumpEject = true; } else eject(gun, false);
  } else if (ws.ammo > st.ammo && w.shellReload) st.insert = 1; // une cartouche insérée
  if (ws.reloading && !st.reloading) st.magOut = st.magIn = false;
  if (!ws.reloading && st.reloading) {           // fin du rechargement : on réarme
    if (shotgun) { st.pump = 0; st.pumpEject = false; } else st.bolt = 1;
  }
  st.ammo = ws.ammo;
  st.reloading = ws.reloading;

  st.t += dt;
  st.bolt *= Math.exp(-28 * dt);
  st.insert *= Math.exp(-9 * dt);

  // culasse ; celle du pistolet reste en arrière chargeur vide
  if (P.bolt) {
    const locked = gun.userData.kind === 'pistol' && ws.ammo === 0 ? 1 : 0;
    P.bolt.position.z = P.bolt.userData.rest.z + P.boltTravel * Math.max(st.bolt, locked);
  }

  // pompe : un aller-retour, la cartouche tirée sort au moment où elle arrive en arrière
  if (P.pump) {
    let k = 0;
    if (st.pump >= 0) {
      st.pump += dt / 0.32;
      if (st.pump >= 1) st.pump = -1;
      else {
        k = Math.sin(Math.PI * st.pump);
        if (st.pumpEject && st.pump > 0.4) { st.pumpEject = false; eject(gun, true); }
      }
    }
    P.pump.position.z = P.pump.userData.rest.z + P.pumpTravel * k;
  }

  // rechargement : l'arme s'incline, le chargeur tombe, un neuf remonte et se verrouille, puis l'arme revient
  let tilt = 0, drop = 0, magVisible = true, bump = 0, clipK = -1;
  if (ws.reloading && w.shellReload) tilt = 0.7;
  else if (ws.reloading) {
    const p = clamp01(1 - ws.reloadT / w.reload);
    tilt = smooth(p, 0, 0.15) * (1 - smooth(p, 0.82, 1));
    if (p < 0.42) drop = smooth(p, 0.15, 0.42);
    else if (p < 0.55) { drop = 1; magVisible = false; }
    else drop = 1 - smooth(p, 0.55, 0.8);
    bump = Math.max(0, 1 - Math.abs(p - 0.8) / 0.05);
    if (p > 0.3 && p < 0.8) clipK = smooth(p, 0.3, 0.75);
    if (p > 0.18 && !st.magOut) { st.magOut = true; game.sfx.click(1300, 0.25); }
    if (p > 0.78 && !st.magIn) { st.magIn = true; game.sfx.click(1600, 0.35); }
  }
  st.tilt += (tilt - st.tilt) * Math.min(1, dt * 12);

  if (P.mag) {
    // le chargeur glisse le long de son propre axe (incliné quand il est logé dans la poignée)
    const rest = P.mag.userData.rest, a = P.mag.rotation.x;
    P.mag.visible = magVisible;
    P.mag.position.set(rest.x, rest.y - 0.3 * drop * Math.cos(a), rest.z - 0.3 * drop * Math.sin(a));
  }
  if (P.clip) {
    // lame-chargeur : descend dans le boîtier par le dessus
    P.clip.visible = clipK >= 0;
    if (clipK >= 0) P.clip.position.y = P.clip.userData.rest.y + 0.06 * (1 - clipK) - 0.05 * clipK;
  }

  gun.position.set(0, Math.sin(st.t * 1.8) * 0.0015 + bump * 0.008 + st.insert * 0.012, 0);
  gun.rotation.set(0.1 * st.tilt, 0.2 * st.tilt, -0.6 * st.tilt);
}
