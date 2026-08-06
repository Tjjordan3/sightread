import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { createId } from "../uuid";
import { nextMessageCountAfterSave } from "./messageCount";
import type { StoredConversation, StoredImage, StoredMessage } from "./types";
import { STORAGE_LIMITS } from "./types";

interface SightreadDB extends DBSchema {
  conversations: {
    key: string;
    value: StoredConversation;
    indexes: { "by-updated": number };
  };
  messages: {
    key: string;
    value: StoredMessage;
    indexes: { "by-conversation": string };
  };
  images: {
    key: string;
    value: StoredImage;
    indexes: { "by-conversation": string };
  };
  meta: {
    key: string;
    value: string;
  };
}

const DB_NAME = "sightread";
const DB_VERSION = 1;
const LAST_CONVERSATION_KEY = "lastConversationId";

let dbPromise: Promise<IDBPDatabase<SightreadDB>> | null = null;

export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}

function getDb() {
  if (!isIndexedDBAvailable()) {
    throw new Error("IndexedDB is not available in this browser.");
  }
  if (!dbPromise) {
    dbPromise = openDB<SightreadDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const conversations = db.createObjectStore("conversations", {
          keyPath: "id",
        });
        conversations.createIndex("by-updated", "updatedAt");

        const messages = db.createObjectStore("messages", { keyPath: "id" });
        messages.createIndex("by-conversation", "conversationId");

        const images = db.createObjectStore("images", { keyPath: "id" });
        images.createIndex("by-conversation", "conversationId");

        db.createObjectStore("meta");
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function listConversations(): Promise<StoredConversation[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("conversations", "by-updated");
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getConversation(
  id: string,
): Promise<StoredConversation | undefined> {
  const db = await getDb();
  return db.get("conversations", id);
}

export async function createConversation(title = "New chat"): Promise<StoredConversation> {
  const db = await getDb();
  await enforceConversationLimit(db);
  const now = Date.now();
  const conversation: StoredConversation = {
    id: createId(),
    title,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
  await db.put("conversations", conversation);
  await setLastConversationId(conversation.id);
  return conversation;
}

export async function updateConversation(
  conversation: StoredConversation,
): Promise<void> {
  const db = await getDb();
  await db.put("conversations", conversation);
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDb();
  const messages = await db.getAllFromIndex("messages", "by-conversation", id);
  const images = await db.getAllFromIndex("images", "by-conversation", id);
  const lastId = await getLastConversationId();
  const tx = db.transaction(
    ["conversations", "messages", "images", "meta"],
    "readwrite",
  );
  await tx.objectStore("conversations").delete(id);
  for (const message of messages) {
    await tx.objectStore("messages").delete(message.id);
  }
  for (const image of images) {
    await tx.objectStore("images").delete(image.id);
  }
  if (lastId === id) {
    await tx.objectStore("meta").delete(LAST_CONVERSATION_KEY);
  }
  await tx.done;
}

export async function clearAllConversations(): Promise<void> {
  const db = await getDb();
  await db.clear("conversations");
  await db.clear("messages");
  await db.clear("images");
  await db.delete("meta", LAST_CONVERSATION_KEY);
}

export async function getMessages(conversationId: string): Promise<StoredMessage[]> {
  const db = await getDb();
  const messages = await db.getAllFromIndex(
    "messages",
    "by-conversation",
    conversationId,
  );
  return messages.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveMessage(message: StoredMessage): Promise<void> {
  const db = await getDb();
  const count = await db.countFromIndex(
    "messages",
    "by-conversation",
    message.conversationId,
  );
  let removed = 0;
  if (count >= STORAGE_LIMITS.maxMessagesPerConversation) {
    const existing = await db.getAllFromIndex(
      "messages",
      "by-conversation",
      message.conversationId,
    );
    const sorted = existing.sort((a, b) => a.createdAt - b.createdAt);
    const toRemove = sorted.slice(
      0,
      sorted.length - STORAGE_LIMITS.maxMessagesPerConversation + 1,
    );
    removed = toRemove.length;
    for (const old of toRemove) {
      await db.delete("messages", old.id);
      if (old.imageId) await db.delete("images", old.imageId);
    }
  }
  await db.put("messages", message);
  const conversation = await db.get("conversations", message.conversationId);
  if (conversation) {
    conversation.updatedAt = Date.now();
    conversation.messageCount = nextMessageCountAfterSave(count, removed);
    await db.put("conversations", conversation);
  }
}

export async function saveImage(image: StoredImage): Promise<void> {
  const db = await getDb();
  await enforceImageQuota(db, image.byteSize);
  await db.put("images", image);
}

export async function getImage(id: string): Promise<StoredImage | undefined> {
  const db = await getDb();
  return db.get("images", id);
}

export async function getImagesForConversation(
  conversationId: string,
): Promise<StoredImage[]> {
  const db = await getDb();
  return db.getAllFromIndex("images", "by-conversation", conversationId);
}

export async function setLastConversationId(id: string): Promise<void> {
  const db = await getDb();
  await db.put("meta", id, LAST_CONVERSATION_KEY);
}

export async function getLastConversationId(): Promise<string | null> {
  const db = await getDb();
  return (await db.get("meta", LAST_CONVERSATION_KEY)) ?? null;
}

async function enforceConversationLimit(db: IDBPDatabase<SightreadDB>) {
  const all = await db.getAll("conversations");
  if (all.length < STORAGE_LIMITS.maxConversations) return;
  const sorted = all.sort((a, b) => a.updatedAt - b.updatedAt);
  const excess = sorted.slice(0, all.length - STORAGE_LIMITS.maxConversations + 1);
  for (const conv of excess) {
    await deleteConversation(conv.id);
  }
}

async function enforceImageQuota(db: IDBPDatabase<SightreadDB>, incoming: number) {
  const images = await db.getAll("images");
  let total = images.reduce((sum, img) => sum + img.byteSize, 0) + incoming;
  if (total <= STORAGE_LIMITS.maxImageBytes) return;
  const sorted = images.sort((a, b) => a.createdAt - b.createdAt);
  for (const image of sorted) {
    if (total <= STORAGE_LIMITS.maxImageBytes) break;
    await db.delete("images", image.id);
    total -= image.byteSize;
    const messages = await db.getAllFromIndex(
      "messages",
      "by-conversation",
      image.conversationId,
    );
      for (const msg of messages) {
        if (msg.imageId === image.id) {
          const { imageId, ...rest } = msg;
          void imageId;
          await db.put("messages", rest);
        }
      }
  }
}

export function titleFromFirstMessage(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "New chat";
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}
