export type VisionDiscussMode = "new" | "continue";

export interface VisionDiscussHandoff {
  blob: Blob;
  description: string;
  mode: VisionDiscussMode;
}
