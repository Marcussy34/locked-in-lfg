import { Scene } from '@babylonjs/core/scene';
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { sendToRN } from '../bridge';
import { focusOn } from '../camera/cameraController';

/**
 * Sets up tap detection on interactable meshes.
 * Single tap: flash + notify RN
 * Double tap: zoom camera to the object
 */
export function setupInteractables(scene: Scene) {
  let lastTapTime = 0;
  let lastTapId = '';

  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== PointerEventTypes.POINTERTAP) return;

    const pickResult = pointerInfo.pickInfo;
    if (!pickResult?.hit || !pickResult.pickedMesh) return;

    const mesh = pickResult.pickedMesh;

    // Walk up parent chain to find interactable
    let target: AbstractMesh | null = mesh;
    while (target) {
      if (target.metadata?.interactable) {
        const objectId = target.metadata.objectId as string;
        const now = performance.now();

        // Double-tap detection (within 400ms, same object)
        if (objectId === lastTapId && now - lastTapTime < 400) {
          console.log(`[interactable] double-tapped: ${objectId} → zooming`);
          // Get bounding center of the model
          const bounds = target.getBoundingInfo();
          const center = bounds.boundingBox.centerWorld;
          focusOn(center, 4);
          lastTapTime = 0;
          lastTapId = '';
          return;
        }

        lastTapTime = now;
        lastTapId = objectId;

        console.log(`[interactable] tapped: ${objectId} (mesh: ${target.name})`);
        sendToRN({ type: 'objectTapped', payload: { objectId } });
        flashMesh(target, scene);
        return;
      }
      target = target.parent as AbstractMesh | null;
    }
  });
}

/** Brief emissive flash on tapped object for visual feedback. */
function flashMesh(mesh: AbstractMesh, scene: Scene) {
  const mat = mesh.material;
  if (!(mat instanceof StandardMaterial)) return;

  const originalEmissive = mat.emissiveColor.clone();
  mat.emissiveColor = new Color3(0.4, 0.3, 0.15);

  setTimeout(() => {
    mat.emissiveColor = originalEmissive;
  }, 200);
}
