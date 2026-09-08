import type { SceneState } from "./schema";

export interface SceneStoreSnapshot {
  scene: SceneState | null;
  updatedAtMs: number;
  error: string;
  extracting: boolean;
}

type Listener = (snapshot: SceneStoreSnapshot) => void;

let snapshot: SceneStoreSnapshot = {
  scene: null,
  updatedAtMs: 0,
  error: "",
  extracting: false,
};

const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener(snapshot);
}

export function getSceneSnapshot(): SceneStoreSnapshot {
  return snapshot;
}

export function getLatestScene(): SceneState | null {
  return snapshot.scene;
}

export function subscribeSceneStore(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

export function setSceneExtracting(extracting: boolean): void {
  snapshot = { ...snapshot, extracting };
  emit();
}

export function setSceneSuccess(scene: SceneState): void {
  snapshot = {
    scene,
    updatedAtMs: Date.now(),
    error: "",
    extracting: false,
  };
  emit();
}

export function setSceneError(error: string): void {
  snapshot = {
    ...snapshot,
    error,
    extracting: false,
  };
  emit();
}

export function clearSceneStore(): void {
  snapshot = {
    scene: null,
    updatedAtMs: 0,
    error: "",
    extracting: false,
  };
  emit();
}
