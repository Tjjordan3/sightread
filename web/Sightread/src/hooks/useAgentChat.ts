import { useCallback, useRef, useState } from "react";
import { createChatService, type ChatMessage } from "../lib/chat";
import { blobToBase64, captureFrameAsJpeg, fileToJpegBlob } from "../lib/imageEncoding";
import {
  getApiKey,
  hasApiKeyForProvider,
  type Settings,
} from "../lib/settings";
import { speakAsync, stopSpeaking } from "../lib/speech";

export interface PendingAttachment {
  previewUrl: string;
  blob: Blob;
}

export interface UseAgentChatOptions {
  settings: Settings;
  getCurrentFrame?: () => HTMLVideoElement | null;
  initialMessage?: ChatMessage;
  onReplySpoken?: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi — I'm your Sightread agent. Ask me anything, send a photo, or use voice to chat.",
};

export function useAgentChat({
  settings,
  getCurrentFrame,
  initialMessage = WELCOME_MESSAGE,
  onReplySpoken,
}: UseAgentChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [attachLiveFrame, setAttachLiveFrame] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [voiceConversation, setVoiceConversation] = useState(false);
  const voiceConversationRef = useRef(false);

  const clearAttachment = useCallback(() => {
    setPendingAttachment((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  const attachFile = useCallback(
    async (file: File) => {
      try {
        const blob = await fileToJpegBlob(file, { maxWidth: 768, quality: 0.75 });
        clearAttachment();
        setPendingAttachment({
          previewUrl: URL.createObjectURL(blob),
          blob,
        });
        setAttachLiveFrame(false);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not attach image.");
      }
    },
    [clearAttachment],
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

      if (pendingAttachment) {
        attachedImageBase64 = await blobToBase64(pendingAttachment.blob);
        attachedImageBytes = pendingAttachment.blob.size;
        imagePreviewUrl = pendingAttachment.previewUrl;
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
        }
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: text || "What do you see in this image?",
        imagePreviewUrl,
        attachedImageBytes,
      };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setPendingAttachment(null);
      setAttachLiveFrame(false);

      try {
        const service = createChatService(settings.provider, getApiKey(settings));
        const reply = await service.chat(nextMessages, attachedImageBase64);
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: reply,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (settings.speakChatReplies || voiceConversationRef.current) {
          await speakAsync(reply);
          onReplySpoken?.();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chat failed.");
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
      messages,
      onReplySpoken,
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
    clearAttachment,
    sendMessage,
    startVoiceConversation,
    stopVoiceConversation,
  };
}
