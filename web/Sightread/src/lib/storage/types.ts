export const STORAGE_LIMITS = {
  maxConversations: 50,
  maxMessagesPerConversation: 200,
  maxImageBytes: 100 * 1024 * 1024,
} as const;

export interface StoredConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  imageId?: string;
}

export interface StoredImage {
  id: string;
  conversationId: string;
  mimeType: "image/jpeg";
  blob: Blob;
  byteSize: number;
  createdAt: number;
}

export interface ConversationExport {
  version: 1;
  exportedAt: number;
  conversation: StoredConversation;
  messages: Array<
    StoredMessage & {
      imageBase64?: string;
    }
  >;
}
