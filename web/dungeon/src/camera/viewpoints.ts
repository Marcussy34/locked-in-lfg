import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export type Viewpoint =
  | 'overview'
  | 'bookshelf'
  | 'fireplace'
  | 'alchemy'
  | 'noticeboard'
  | 'character';

export interface ViewpointDef {
  alpha: number;
  beta: number;
  radius: number;
  target: Vector3;
}

/**
 * 6 fixed camera viewpoints for the dungeon room.
 * Values come directly from Babylon's logged alpha/beta/radius
 * (use the Lock Camera + Log Position dev tools to capture new ones).
 */
export const VIEWPOINTS: Record<Viewpoint, ViewpointDef> = {
  overview: {
    alpha: 3.987,
    beta: 1.320,
    radius: 11.97,
    target: new Vector3(0, 1.5, 1),
  },
  // TODO: capture correct values using Lock Camera + Log Position
  bookshelf: {
    alpha: 3.987,
    beta: 1.320,
    radius: 11.97,
    target: new Vector3(0, 1.5, 1),
  },
  fireplace: {
    alpha: 3.987,
    beta: 1.320,
    radius: 11.97,
    target: new Vector3(0, 1.5, 1),
  },
  alchemy: {
    alpha: 3.987,
    beta: 1.320,
    radius: 11.97,
    target: new Vector3(0, 1.5, 1),
  },
  noticeboard: {
    alpha: 3.987,
    beta: 1.320,
    radius: 11.97,
    target: new Vector3(0, 1.5, 1),
  },
  character: {
    alpha: 3.987,
    beta: 1.320,
    radius: 11.97,
    target: new Vector3(0, 1.5, 1),
  },
};

/** Ordered array for arrow cycling. */
export const VIEWPOINT_ORDER: Viewpoint[] = [
  'overview',
  'bookshelf',
  'fireplace',
  'alchemy',
  'noticeboard',
  'character',
];
