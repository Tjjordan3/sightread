export class VisionAIError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "VisionAIError";
    this.statusCode = statusCode;
  }
}

export interface VisionAIService {
  analyze(jpegBase64: string, prompt: string): Promise<string>;
}
