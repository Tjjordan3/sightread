import type { ChatMessage } from "../lib/chat";
import {
  createConversation,
  getConversation,
  getLastConversationId,
  getMessages,
  isIndexedDBAvailable,
  listConversations,
  saveImage,
  saveMessage,
  setLastConversationId,
  titleFromFirstMessage,
  updateConversation,
} from "../lib/storage";
import {
  revokeMessagePreviewUrls,
  storedMessagesToChatMessages,
} from "../lib/storage/export";
import type { StoredConversation } from "../lib/storage/types";
import { useCallback, useEffect, useState } from "react";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi — I'm your Sightread agent. Ask me anything, send a photo, or use voice to chat.",
};

export function useConversationSession() {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<StoredConversation | null>(null);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([
    WELCOME_MESSAGE,
  ]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");

  const refreshList = useCallback(async () => {
    if (!isIndexedDBAvailable()) return [];
    return listConversations();
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const conversation = await getConversation(id);
    if (!conversation) return null;
    const stored = await getMessages(id);
    const chatMessages =
      stored.length > 0
        ? await storedMessagesToChatMessages(stored)
        : [WELCOME_MESSAGE];
    setActiveConversation(conversation);
    setInitialMessages(chatMessages);
    await setLastConversationId(id);
    return conversation;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isIndexedDBAvailable()) {
        setStorageError("Chat history requires IndexedDB (unavailable in this browser).");
        setReady(true);
        return;
      }
      try {
        const list = await refreshList();
        if (cancelled) return;
        setConversations(list);
        const lastId = await getLastConversationId();
        if (lastId && list.some((c) => c.id === lastId)) {
          await loadConversation(lastId);
        } else if (list[0]) {
          await loadConversation(list[0].id);
        } else {
          const created = await createConversation();
          if (cancelled) return;
          setConversations([created]);
          setActiveConversation(created);
          setInitialMessages([WELCOME_MESSAGE]);
        }
      } catch (err) {
        if (!cancelled) {
          setStorageError(
            err instanceof Error ? err.message : "Could not load chat history.",
          );
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConversation, refreshList]);

  const switchConversation = useCallback(
    async (id: string) => {
      revokeMessagePreviewUrls(initialMessages);
      await loadConversation(id);
      const list = await refreshList();
      setConversations(list);
    },
    [initialMessages, loadConversation, refreshList],
  );

  const startNewConversation = useCallback(async () => {
    revokeMessagePreviewUrls(initialMessages);
    const created = await createConversation();
    setActiveConversation(created);
    setInitialMessages([WELCOME_MESSAGE]);
    const list = await refreshList();
    setConversations(list);
    return created;
  }, [initialMessages, refreshList]);

  const persistUserMessage = useCallback(
    async (message: ChatMessage, imageBlob?: Blob) => {
      if (!activeConversation || message.id === "welcome") return;
      let imageId: string | undefined;
      if (imageBlob) {
        imageId = crypto.randomUUID();
        await saveImage({
          id: imageId,
          conversationId: activeConversation.id,
          mimeType: "image/jpeg",
          blob: imageBlob,
          byteSize: imageBlob.size,
          createdAt: Date.now(),
        });
      }
      await saveMessage({
        id: message.id,
        conversationId: activeConversation.id,
        role: "user",
        text: message.text,
        createdAt: Date.now(),
        imageId,
      });
      const conv = await getConversation(activeConversation.id);
      if (conv && conv.title === "New chat" && message.text.trim()) {
        conv.title = titleFromFirstMessage(message.text);
        await updateConversation(conv);
        setActiveConversation(conv);
        setConversations(await refreshList());
      }
    },
    [activeConversation, refreshList],
  );

  const persistAssistantMessage = useCallback(
    async (message: ChatMessage) => {
      if (!activeConversation) return;
      await saveMessage({
        id: message.id,
        conversationId: activeConversation.id,
        role: "assistant",
        text: message.text,
        createdAt: Date.now(),
      });
      const list = await refreshList();
      setConversations(list);
      const updated = await getConversation(activeConversation.id);
      if (updated) setActiveConversation(updated);
    },
    [activeConversation, refreshList],
  );

  const reloadConversations = useCallback(async () => {
    const list = await refreshList();
    setConversations(list);
    return list;
  }, [refreshList]);

  return {
    conversations,
    activeConversation,
    initialMessages,
    ready,
    storageError,
    switchConversation,
    startNewConversation,
    persistUserMessage,
    persistAssistantMessage,
    reloadConversations,
  };
}
