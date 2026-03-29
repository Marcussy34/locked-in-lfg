import { create } from 'zustand';
import type { Viewpoint, RoomPhase, SceneState } from '@/types';

interface SceneStore extends SceneState {
  setViewpoint: (viewpoint: Viewpoint) => void;
  setRoomPhase: (phase: RoomPhase) => void;
  setTransitioning: (transitioning: boolean) => void;
}

export const useSceneStore = create<SceneStore>()((set) => ({
  currentViewpoint: 'overview',
  roomPhase: 'underground',
  isTransitioning: false,

  setViewpoint: (viewpoint) => set({ currentViewpoint: viewpoint }),
  setRoomPhase: (phase) => set({ roomPhase: phase }),
  setTransitioning: (transitioning) => set({ isTransitioning: transitioning }),
}));
