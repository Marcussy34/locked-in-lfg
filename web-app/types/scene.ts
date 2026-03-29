export type Viewpoint =
  | 'overview'
  | 'bookshelf'
  | 'fireplace'
  | 'alchemy'
  | 'noticeboard'
  | 'character';

export type RoomPhase = 'underground';

export interface SceneState {
  currentViewpoint: Viewpoint;
  roomPhase: RoomPhase;
  isTransitioning: boolean;
}
