import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore } from '@/stores/sceneStore';

describe('sceneStore', () => {
  beforeEach(() => {
    // Reset to defaults
    useSceneStore.setState({
      currentViewpoint: 'overview',
      roomPhase: 'underground',
      isTransitioning: false,
    });
  });

  describe('initial state', () => {
    it('starts with overview viewpoint', () => {
      expect(useSceneStore.getState().currentViewpoint).toBe('overview');
    });

    it('starts with underground room phase', () => {
      expect(useSceneStore.getState().roomPhase).toBe('underground');
    });

    it('starts not transitioning', () => {
      expect(useSceneStore.getState().isTransitioning).toBe(false);
    });
  });

  describe('setViewpoint', () => {
    it('updates viewpoint to bookshelf', () => {
      useSceneStore.getState().setViewpoint('bookshelf');
      expect(useSceneStore.getState().currentViewpoint).toBe('bookshelf');
    });

    it('updates viewpoint to fireplace', () => {
      useSceneStore.getState().setViewpoint('fireplace');
      expect(useSceneStore.getState().currentViewpoint).toBe('fireplace');
    });

    it('updates viewpoint to alchemy', () => {
      useSceneStore.getState().setViewpoint('alchemy');
      expect(useSceneStore.getState().currentViewpoint).toBe('alchemy');
    });

    it('updates viewpoint to noticeboard', () => {
      useSceneStore.getState().setViewpoint('noticeboard');
      expect(useSceneStore.getState().currentViewpoint).toBe('noticeboard');
    });

    it('updates viewpoint to character', () => {
      useSceneStore.getState().setViewpoint('character');
      expect(useSceneStore.getState().currentViewpoint).toBe('character');
    });
  });

  describe('setRoomPhase', () => {
    it('updates room phase', () => {
      useSceneStore.getState().setRoomPhase('underground');
      expect(useSceneStore.getState().roomPhase).toBe('underground');
    });
  });

  describe('setTransitioning', () => {
    it('sets transitioning to true', () => {
      useSceneStore.getState().setTransitioning(true);
      expect(useSceneStore.getState().isTransitioning).toBe(true);
    });

    it('sets transitioning to false', () => {
      useSceneStore.getState().setTransitioning(true);
      useSceneStore.getState().setTransitioning(false);
      expect(useSceneStore.getState().isTransitioning).toBe(false);
    });
  });
});
