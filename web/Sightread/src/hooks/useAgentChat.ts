import { useCallback, useEffect, useRef, useState } from "react";
import { createId } from "../lib/uuid";
import { createChatService, type ChatMessage } from "../lib/chat";
import { blobToBase64, captureFrameAsJpeg, fileToJpegBlob } from "../lib/imageEncoding";
import { hasApiKeyForProvider, type Settings } from "../lib/settings";
import { speakAsync, stopSpeaking } from "../lib/speech";

export interface PendingAttachment {
  previewUrl: string;
  blob: Blob;
}

export interface UseAgentChatOptions {
  settings: Settings;
  getCurrentFrame?: () => HTMLVideoElement | null;
  initialMessages?: ChatMessage[];
  onUserMessage?: (message: ChatMessage, imageBlob?: Blob) => void | Promise<void>;
  onAssistantMessage?: (message: ChatMessage) => void | Promise<void>;
  onReplySpoken?: () => void;
  onBeforeSpeak?: () => void;
  onAfterSpeak?: () => void;
}

export const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi — I'm your Sightread agent. Ask me anything, send a photo, or use voice to chat.",
};

function formatChatError(err: unknown, webSearchEnabled: boolean): string {
  const message = err instanceof Error ? err.message : "Chat failed.";
  const lower = message.toLowerCase();

  if (webSearchEnabled && message.includes("400")) {
    return "Web search doesn't work with image attachments — remove the image or disable web search in Settings.";
  }

  if (message.includes("401") || lower.includes("invalid api key")) {
    return "Your API key was rejected — check Settings.";
  }

  return message;
}

export function useAgentChat({
  settings,
  getCurrentFrame,
  initialMessages = [WELCOME_MESSAGE],
  onUserMessage,
  onAssistantMessage,
  onReplySpoken,
  onBeforeSpeak,
  onAfterSpeak,
}: UseAgentChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [attachLiveFrame, setAttachLiveFrame] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [voiceConversation, setVoiceConversation] = useState(false);
  const voiceConversationRef = useRef(false);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const clearAttachment = useCallback(() => {
    setPendingAttachment((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  const attachFromBlob = useCallback(
    (blob: Blob) => {
      clearAttachment();
      setPendingAttachment({
        previewUrl: URL.createObjectURL(blob),
        blob,
      });
      setAttachLiveFrame(false);
      setError("");
    },
    [clearAttachment],
  );

  const seedComposer = useCallback((text: string, blob?: Blob) => {
    setInput(text);
    if (blob) attachFromBlob(blob);
    setError("");
  }, [attachFromBlob]);

  const attachFile = useCallback(
    async (file: File) => {
      try {
        const blob = await fileToJpegBlob(file, { maxWidth: 768, quality: 0.75 });
        attachFromBlob(blob);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not attach image.");
      }
    },
    [attachFromBlob],
  );

  const sendMessage = useCallback(
    async (rawText?: string) => {
      const text = (rawText ?? input).trim();
      const hasAttachment = pendingAttachment != null || attachLiveFrame;
      if ((!text && !hasAttachment) || isSending) return;

      if (!hasApiKeyForProvider(settings)) {
        setError("Add API key in Settings.");
        return;
      }

      setError("");
      setIsSending(true);
      setInput("");

      let attachedImageBase64: string | undefined;
      let attachedImageBytes: number | undefined;
      let imagePreviewUrl: string | undefined;
      let imageBlobForStore: Blob | undefined;

      if (pendingAttachment) {
        attachedImageBase64 = await blobToBase64(pendingAttachment.blob);
        attachedImageBytes = pendingAttachment.blob.size;
        imagePreviewUrl = pendingAttachment.previewUrl;
        imageBlobForStore = pendingAttachment.blob;
      } else if (attachLiveFrame && getCurrentFrame) {
        const video = getCurrentFrame();
        if (video && video.readyState >= 2) {
          const blob = await captureFrameAsJpeg(video, {
            maxWidth: 512,
            quality: 0.6,
          });
          attachedImageBase64 = await blobToBase64(blob);
          attachedImageBytes = blob.size;
          imagePreviewUrl = URL.createObjectURL(blob);
          imageBlobForStore = blob;
        }
      }

      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        text: text || "What do you see in this image?",
        imagePreviewUrl,
        attachedImageBytes,
      };
      const nextMessages = [...messagesRef.current, userMessage];
      setMessages(nextMessages);
      setPendingAttachment(null);
      setAttachLiveFrame(false);

      try {
        await onUserMessage?.(userMessage, imageBlobForStore);
        const service = createChatService(settings);
        const reply = await service.chat(nextMessages, attachedImageBase64);
        const assistantMessage: ChatMessage = {
          id: createId(),
          role: "assistant",
          text: reply.text,
          citations: reply.citations,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        await onAssistantMessage?.(assistantMessage);

        if (settings.speakChatReplies || voiceConversationRef.current) {
          onBeforeSpeak?.();
          await speakAsync(reply.text);
          onAfterSpeak?.();
        }
        if (voiceConversationRef.current) {
          onReplySpoken?.();
        }
      } catch (err) {
        setError(formatChatError(err, settings.webSearchEnabled));
        if (voiceConversationRef.current) {
          voiceConversationRef.current = false;
          setVoiceConversation(false);
        }
      } finally {
        setIsSending(false);
      }
    },
    [
      attachLiveFrame,
      getCurrentFrame,
      input,
      isSending,
      onAfterSpeak,
      onAssistantMessage,
      onBeforeSpeak,
      onReplySpoken,
      onUserMessage,
      pendingAttachment,
      settings,
    ],
  );

  const startVoiceConversation = useCallback(() => {
    voiceConversationRef.current = true;
    setVoiceConversation(true);
    stopSpeaking();
  }, []);

  const stopVoiceConversation = useCallback(() => {
    voiceConversationRef.current = false;
    setVoiceConversation(false);
    stopSpeaking();
  }, []);

  const replaceMessages = useCallback((next: ChatMessage[]) => {
    setMessages(next);
    setInput("");
    clearAttachment();
    setAttachLiveFrame(false);
    setError("");
  }, [clearAttachment]);

  return {
    messages,
    input,
    setInput,
    pendingAttachment,
    attachLiveFrame,
    setAttachLiveFrame,
    isSending,
    error,
    setError,
    voiceConversation,
    attachFile,
    attachFromBlob,
    seedComposer,
    clearAttachment,
    sendMessage,
    startVoiceConversation,
    stopVoiceConversation,
    replaceMessages,
  };
}
