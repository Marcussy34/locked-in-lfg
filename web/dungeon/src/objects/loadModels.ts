import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/loaders/glTF';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { makeMovable } from './makeMovable';
import { setFlamePosition } from '../effects/flameParticles';
import { setEmberPosition } from '../effects/embers';

const TILE_PATH = '/assets/models/dungeon_tiles/';
const TILE_MODEL = 'base_basic_pbr.glb';
const GRID_SIZE = 5;
const FLOOR_DEPTH = 6; // extra row to reach the back wall
const WALL_HEIGHT = 5;
const TILE_SCALE = 1;

export async function createDungeonGeometry(scene: Scene) {
  const result = await SceneLoader.ImportMeshAsync('', TILE_PATH, TILE_MODEL, scene);
  const root = result.meshes[0];

  const wrapper = new TransformNode('tileWrapper', scene);
  root.parent = wrapper;
  wrapper.rotation.x = -Math.PI / 2;
  wrapper.scaling = new Vector3(TILE_SCALE, TILE_SCALE, TILE_SCALE);

  wrapper.computeWorldMatrix(true);
  for (const mesh of result.meshes) {
    mesh.computeWorldMatrix(true);
  }

  const childMeshes = result.meshes.filter(m => m.getTotalVertices() > 0);
  let min = new Vector3(Infinity, Infinity, Infinity);
  let max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of childMeshes) {
    const bounds = mesh.getBoundingInfo().boundingBox;
    min = Vector3.Minimize(min, bounds.minimumWorld);
    max = Vector3.Maximize(max, bounds.maximumWorld);
  }

  const sizeX = max.x - min.x;
  const sizeZ = max.z - min.z;
  console.log(`Tile size: ${sizeX.toFixed(2)} x ${sizeZ.toFixed(2)}`);

  const tileWidth = sizeX;
  const tileDepth = sizeZ;

  wrapper.setEnabled(false);

  const offsetX = ((GRID_SIZE - 1) * tileWidth) / 2;
  const offsetZ = ((GRID_SIZE - 1) * tileDepth) / 2;

  // --- Floor (extra depth to reach back wall) ---
  const floorOffsetZ = ((FLOOR_DEPTH - 1) * tileDepth) / 2;
  for (let row = 0; row < FLOOR_DEPTH; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const clone = wrapper.clone(`floor_${row}_${col}`, null)!;
      clone.position = new Vector3(col * tileWidth - offsetX, 0, row * tileDepth - floorOffsetZ);
      clone.rotation = new Vector3(-Math.PI / 2, 0, 0);
      clone.setEnabled(true);
    }
  }

  // --- Right wall ---
  for (let row = 0; row < WALL_HEIGHT; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const clone = wrapper.clone(`rightWall_${row}_${col}`, null)!;
      clone.position = new Vector3(offsetX + tileWidth / 2, row * tileDepth, col * tileDepth - offsetZ);
      clone.rotation = new Vector3(0, -Math.PI / 2, 0);
      clone.setEnabled(true);
    }
  }

  // --- Left wall ---
  for (let row = 0; row < WALL_HEIGHT; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const clone = wrapper.clone(`leftWall_${row}_${col}`, null)!;
      clone.position = new Vector3(-offsetX - tileWidth / 2, row * tileDepth, col * tileDepth - offsetZ);
      clone.rotation = new Vector3(0, Math.PI / 2, 0);
      clone.setEnabled(true);
    }
  }

  // --- Back wall ---
  for (let row = 0; row < WALL_HEIGHT; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const clone = wrapper.clone(`backWall_${row}_${col}`, null)!;
      clone.position = new Vector3(col * tileWidth - offsetX, row * tileDepth, offsetZ + tileDepth / 2);
      clone.rotation = new Vector3(0, 0, 0);
      clone.setEnabled(true);
    }
  }

  // --- Bookshelf (against left wall) ---
  const bookshelfResult = await SceneLoader.ImportMeshAsync(
    '', '/assets/models/bookshelf/', 'base_basic_pbr.glb', scene,
  );
  const bookshelf = bookshelfResult.meshes[0];
  bookshelf.position = new Vector3(-4, 0, 0);
  bookshelf.scaling = new Vector3(1, 1, 1);
  bookshelf.metadata = { interactable: true, objectId: 'bookshelf' };
  for (const mesh of bookshelfResult.meshes) {
    if (mesh !== bookshelf) {
      mesh.metadata = { interactable: true, objectId: 'bookshelf' };
    }
  }
  makeMovable(bookshelf, 'bookshelf', scene);

  // ========================
  //  Placeholder Props
  // ========================

  createFireplace(scene);
  createAlchemyTable(scene);
  createChest(scene);
  createNoticeBoard(scene);
  createBookshelfDecorations(scene, bookshelf.position);
}

// ---------------------------------------------------------------------------
// Helper: create a material with a given color
// ---------------------------------------------------------------------------
function mat(name: string, color: Color3, scene: Scene, alpha = 1): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = color;
  if (alpha < 1) { m.alpha = alpha; }
  return m;
}

// ---------------------------------------------------------------------------
// 1. Fireplace
// ---------------------------------------------------------------------------
function createFireplace(scene: Scene) {
  const parent = new TransformNode('fireplace_root', scene);

  // Stone base
  const base = MeshBuilder.CreateBox('fp_base', { width: 2.5, height: 1.5, depth: 1.5 }, scene);
  base.position = new Vector3(0, 0.75, 0);
  base.material = mat('fp_baseMat', new Color3(0.35, 0.3, 0.28), scene);
  base.parent = parent;

  // Chimney
  const chimney = MeshBuilder.CreateBox('fp_chimney', { width: 1.8, height: 3, depth: 1 }, scene);
  chimney.position = new Vector3(0, 3, 0);
  chimney.material = mat('fp_chimneyMat', new Color3(0.3, 0.25, 0.22), scene);
  chimney.parent = parent;

  // Dark opening (recessed)
  const opening = MeshBuilder.CreateBox('fp_opening', { width: 1.6, height: 1, depth: 0.8 }, scene);
  opening.position = new Vector3(0, 0.6, -0.4);
  opening.material = mat('fp_openingMat', new Color3(0.05, 0.03, 0.02), scene);
  opening.parent = parent;

  parent.position = new Vector3(0, 0, 4);

  // Tag the parent mesh (base) as interactable
  const rootMesh = base as Mesh;
  rootMesh.metadata = { interactable: true, objectId: 'fireplace' };
  chimney.metadata = { interactable: true, objectId: 'fireplace' };
  opening.metadata = { interactable: true, objectId: 'fireplace' };

  makeMovable(rootMesh, 'fireplace', scene);

  // Reposition flame & embers inside the hearth
  const flamePos = new Vector3(0, 1.1, 3.6);
  setFlamePosition(flamePos);
  setEmberPosition(new Vector3(0, 1.5, 3.5));
}

// ---------------------------------------------------------------------------
// 2. Alchemy Table
// ---------------------------------------------------------------------------
function createAlchemyTable(scene: Scene) {
  const parent = new TransformNode('alchemy_root', scene);
  const woodColor = new Color3(0.45, 0.3, 0.15);
  const metalColor = new Color3(0.5, 0.5, 0.55);
  const glassColor = new Color3(0.6, 0.8, 0.9);

  // Table top
  const top = MeshBuilder.CreateBox('alch_top', { width: 2, height: 0.1, depth: 1 }, scene);
  top.position = new Vector3(0, 1, 0);
  top.material = mat('alch_topMat', woodColor, scene);
  top.parent = parent;

  // 4 legs
  const legPositions = [
    new Vector3(-0.85, 0.5, -0.4),
    new Vector3(0.85, 0.5, -0.4),
    new Vector3(-0.85, 0.5, 0.4),
    new Vector3(0.85, 0.5, 0.4),
  ];
  legPositions.forEach((pos, i) => {
    const leg = MeshBuilder.CreateBox(`alch_leg${i}`, { width: 0.1, height: 1, depth: 0.1 }, scene);
    leg.position = pos;
    leg.material = mat(`alch_legMat${i}`, woodColor, scene);
    leg.parent = parent;
  });

  // Conical flask (inverted cone — narrow top, wide bottom)
  const flask = MeshBuilder.CreateCylinder('alch_flask', {
    diameterTop: 0.1, diameterBottom: 0.35, height: 0.5, tessellation: 12,
  }, scene);
  flask.position = new Vector3(-0.4, 1.3, 0);
  flask.material = mat('alch_flaskMat', glassColor, scene, 0.5);
  flask.parent = parent;

  // Bunsen burner (cylinder + emissive sphere)
  const burner = MeshBuilder.CreateCylinder('alch_burner', {
    diameter: 0.15, height: 0.4, tessellation: 8,
  }, scene);
  burner.position = new Vector3(0.4, 1.25, 0);
  burner.material = mat('alch_burnerMat', metalColor, scene);
  burner.parent = parent;

  const flame = MeshBuilder.CreateSphere('alch_flame', { diameter: 0.12 }, scene);
  flame.position = new Vector3(0.4, 1.5, 0);
  const flameMat = mat('alch_flameMat', new Color3(0.2, 0.4, 1), scene);
  flameMat.emissiveColor = new Color3(0.2, 0.4, 1);
  flame.material = flameMat;
  flame.parent = parent;

  // Glass tube connecting flask to burner
  const tube = MeshBuilder.CreateCylinder('alch_tube', {
    diameter: 0.04, height: 0.8, tessellation: 6,
  }, scene);
  tube.position = new Vector3(0, 1.35, 0);
  tube.rotation.z = Math.PI / 2;
  tube.material = mat('alch_tubeMat', glassColor, scene, 0.4);
  tube.parent = parent;

  parent.position = new Vector3(4, 0, 1);

  // Tag all children as interactable
  const meta = { interactable: true, objectId: 'alchemy' };
  top.metadata = meta;
  flask.metadata = meta;
  burner.metadata = meta;
  flame.metadata = meta;
  tube.metadata = meta;

  makeMovable(top, 'alchemy', scene);
}

// ---------------------------------------------------------------------------
// 3. Chest (visual only, no objectId)
// ---------------------------------------------------------------------------
function createChest(scene: Scene) {
  const parent = new TransformNode('chest_root', scene);
  const woodColor = new Color3(0.5, 0.35, 0.15);
  const metalBand = new Color3(0.3, 0.3, 0.32);

  // Body
  const body = MeshBuilder.CreateBox('chest_body', { width: 1.2, height: 0.8, depth: 0.8 }, scene);
  body.position = new Vector3(0, 0.4, 0);
  body.material = mat('chest_bodyMat', woodColor, scene);
  body.parent = parent;

  // Lid (angled slightly open)
  const lid = MeshBuilder.CreateBox('chest_lid', { width: 1.2, height: 0.15, depth: 0.8 }, scene);
  lid.position = new Vector3(0, 0.88, -0.1);
  lid.rotation.x = -0.2;
  lid.material = mat('chest_lidMat', woodColor.scale(0.85), scene);
  lid.parent = parent;

  // Metal bands
  for (let i = 0; i < 3; i++) {
    const band = MeshBuilder.CreateBox(`chest_band${i}`, { width: 1.22, height: 0.05, depth: 0.82 }, scene);
    band.position = new Vector3(0, 0.15 + i * 0.3, 0);
    band.material = mat(`chest_bandMat${i}`, metalBand, scene);
    band.parent = parent;
  }

  // Lock
  const lock = MeshBuilder.CreateBox('chest_lock', { width: 0.12, height: 0.12, depth: 0.1 }, scene);
  lock.position = new Vector3(0, 0.5, -0.45);
  lock.material = mat('chest_lockMat', new Color3(0.6, 0.55, 0.2), scene);
  lock.parent = parent;

  parent.position = new Vector3(3, 0, -2);

  makeMovable(body, 'chest', scene);
}

// ---------------------------------------------------------------------------
// 4. Notice Board
// ---------------------------------------------------------------------------
function createNoticeBoard(scene: Scene) {
  const parent = new TransformNode('noticeboard_root', scene);
  const boardColor = new Color3(0.4, 0.3, 0.18);
  const frameColor = new Color3(0.3, 0.2, 0.1);
  const paperColor = new Color3(0.9, 0.85, 0.7);

  // Frame (slightly larger)
  const frame = MeshBuilder.CreateBox('nb_frame', { width: 1.6, height: 2.1, depth: 0.2 }, scene);
  frame.position = new Vector3(0, 1.2, 0);
  frame.material = mat('nb_frameMat', frameColor, scene);
  frame.parent = parent;

  // Board
  const board = MeshBuilder.CreateBox('nb_board', { width: 1.5, height: 2, depth: 0.15 }, scene);
  board.position = new Vector3(0, 1.2, -0.02);
  board.material = mat('nb_boardMat', boardColor, scene);
  board.parent = parent;

  // 3 paper notes at angles
  const noteOffsets = [
    { x: -0.3, y: 1.5, rz: 0.1 },
    { x: 0.2, y: 1.2, rz: -0.08 },
    { x: -0.1, y: 0.85, rz: 0.15 },
  ];
  noteOffsets.forEach((n, i) => {
    const note = MeshBuilder.CreateBox(`nb_note${i}`, { width: 0.4, height: 0.5, depth: 0.02 }, scene);
    note.position = new Vector3(n.x, n.y, -0.12);
    note.rotation.z = n.rz;
    note.material = mat(`nb_noteMat${i}`, paperColor, scene);
    note.parent = parent;
  });

  parent.position = new Vector3(-2, 0, 3);

  // Tag as interactable
  const meta = { interactable: true, objectId: 'noticeboard' };
  frame.metadata = meta;
  board.metadata = meta;

  makeMovable(frame, 'noticeboard', scene);
}

// ---------------------------------------------------------------------------
// 5. Bookshelf Decorations (non-interactable)
// ---------------------------------------------------------------------------
function createBookshelfDecorations(scene: Scene, bookshelfPos: Vector3) {
  const parent = new TransformNode('bookdeco_root', scene);
  const parchment = new Color3(0.85, 0.78, 0.6);

  // 3 scroll cylinders (lying sideways near bookshelf)
  const scrollOffsets = [
    new Vector3(0.5, 1.8, 0.3),
    new Vector3(-0.3, 2.5, -0.2),
    new Vector3(0.1, 0.6, 0.4),
  ];
  scrollOffsets.forEach((offset, i) => {
    const scroll = MeshBuilder.CreateCylinder(`deco_scroll${i}`, {
      diameter: 0.08, height: 0.4, tessellation: 8,
    }, scene);
    scroll.position = bookshelfPos.add(offset);
    scroll.rotation.z = Math.PI / 2;
    scroll.rotation.y = 0.3 * i;
    scroll.material = mat(`deco_scrollMat${i}`, parchment, scene);
    scroll.parent = parent;
  });

  // 2 potion bottles (colored semi-transparent cones)
  const potionColors = [
    new Color3(0.2, 0.8, 0.3),  // green
    new Color3(0.6, 0.15, 0.7), // purple
  ];
  const potionOffsets = [
    new Vector3(0.7, 1.2, 0),
    new Vector3(-0.5, 1.2, 0.1),
  ];
  potionOffsets.forEach((offset, i) => {
    const bottle = MeshBuilder.CreateCylinder(`deco_potion${i}`, {
      diameterTop: 0.06, diameterBottom: 0.15, height: 0.3, tessellation: 8,
    }, scene);
    bottle.position = bookshelfPos.add(offset);
    bottle.material = mat(`deco_potionMat${i}`, potionColors[i], scene, 0.6);
    bottle.parent = parent;
  });
}
