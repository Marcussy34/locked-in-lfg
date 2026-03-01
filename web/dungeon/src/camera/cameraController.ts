import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import gsap from 'gsap';
import { VIEWPOINTS, VIEWPOINT_ORDER, type Viewpoint } from './viewpoints';
import { sendToRN } from '../bridge';

let camera: ArcRotateCamera;
let currentIndex = 0;
let isTransitioning = false;

export function createCamera(scene: Scene): ArcRotateCamera {
  // ArcRotateCamera: alpha (horizontal), beta (vertical), radius, target
  camera = new ArcRotateCamera('mainCam', -Math.PI / 2, Math.PI / 3, 12, Vector3.Zero(), scene);

  // Attach controls — drag to orbit, scroll to zoom, right-drag to pan
  camera.attachControl(scene.getEngine().getRenderingCanvas()!, true);

  // Limits
  camera.lowerRadiusLimit = 3;
  camera.upperRadiusLimit = 30;
  camera.lowerBetaLimit = 0.1;
  camera.upperBetaLimit = Math.PI / 2 + 0.3; // allow slightly below horizon

  // Smooth feel
  camera.inertia = 0.85;
  camera.wheelPrecision = 30;
  camera.panningSensibility = 100;

  return camera;
}

export function transitionTo(viewpoint: Viewpoint) {
  if (isTransitioning) return;

  const def = VIEWPOINTS[viewpoint];
  if (!def) return;

  const idx = VIEWPOINT_ORDER.indexOf(viewpoint);
  if (idx !== -1) currentIndex = idx;

  isTransitioning = true;

  gsap.to(camera, {
    alpha: Math.atan2(def.position.x - def.target.x, def.position.z - def.target.z),
    beta: Math.acos((def.position.y - def.target.y) / Vector3.Distance(def.position, def.target)),
    radius: Vector3.Distance(def.position, def.target),
    duration: 1.2,
    ease: 'power2.inOut',
    onComplete: () => {
      isTransitioning = false;
    },
  });

  const targetObj = { x: camera.target.x, y: camera.target.y, z: camera.target.z };
  gsap.to(targetObj, {
    x: def.target.x,
    y: def.target.y,
    z: def.target.z,
    duration: 1.2,
    ease: 'power2.inOut',
    onUpdate: () => {
      camera.target.set(targetObj.x, targetObj.y, targetObj.z);
    },
  });
}

/** Smoothly zoom the camera to focus on a world position */
export function focusOn(target: Vector3, distance = 5) {
  if (isTransitioning) return;
  isTransitioning = true;

  // Calculate camera angles to look at the target from current direction
  const dir = camera.position.subtract(target).normalize();
  const alpha = Math.atan2(dir.x, dir.z);
  const beta = Math.acos(Math.max(-1, Math.min(1, dir.y)));

  gsap.to(camera, {
    alpha,
    beta,
    radius: distance,
    duration: 1.0,
    ease: 'power2.inOut',
    onComplete: () => { isTransitioning = false; },
  });

  const targetObj = { x: camera.target.x, y: camera.target.y, z: camera.target.z };
  gsap.to(targetObj, {
    x: target.x,
    y: target.y,
    z: target.z,
    duration: 1.0,
    ease: 'power2.inOut',
    onUpdate: () => {
      camera.target.set(targetObj.x, targetObj.y, targetObj.z);
    },
  });
}

export function getCamera(): ArcRotateCamera {
  return camera;
}

export function logCameraPosition() {
  const pos = camera.position;
  const t = camera.target;
  console.log(
    `[camera] alpha: ${camera.alpha.toFixed(3)} beta: ${camera.beta.toFixed(3)} radius: ${camera.radius.toFixed(2)}` +
    `\n  pos: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})` +
    `\n  target: (${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)})`
  );
}

let cameraLocked = false;

export function toggleCameraLock(): boolean {
  cameraLocked = !cameraLocked;
  const canvas = camera.getScene().getEngine().getRenderingCanvas()!;
  if (cameraLocked) {
    logCameraPosition();
    camera.detachControl();
  } else {
    camera.attachControl(canvas, true);
  }
  return cameraLocked;
}
