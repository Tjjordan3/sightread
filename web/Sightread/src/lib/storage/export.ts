import type { ChatMessage } from "../chat";
import { blobToBase64 } from "../imageEncoding";
import type {
  ConversationExport,
  StoredConversation,
  StoredMessage,
} from "./types";
import {
  getImage,
  getImagesForConversation,
  getMessages,
  titleFromFirstMessage,
} from "./conversationStore";

export async function buildExportPayload(
  conversation: StoredConversation,
): Promise<ConversationExport> {
  const messages = await getMessages(conversation.id);
  const images = await getImagesForConversation(conversation.id);
  const imageMap = new Map(images.map((img) => [img.id, img]));

  const exportedMessages = await Promise.all(
    messages.map(async (msg) => {
      if (!msg.imageId) return { ...msg };
      const image = imageMap.get(msg.imageId);
      if (!image) return { ...msg };
      return {
        ...msg,
        imageBase64: await blobToBase64(image.blob),
      };
    }),
  );

  return {
    version: 1,
    exportedAt: Date.now(),
    conversation,
    messages: exportedMessages,
  };
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportConversationJson(
  conversation: StoredConversation,
): Promise<void> {
  const payload = await buildExportPayload(conversation);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  downloadBlob(sanitizeFilename(conversation.title) + ".json", blob);
}

export async function exportConversationMarkdown(
  conversation: StoredConversation,
): Promise<void> {
  const payload = await buildExportPayload(conversation);
  const lines = [
    `# ${conversation.title}`,
    "",
    `_Exported ${new Date(payload.exportedAt).toLocaleString()}_`,
    "",
  ];

  for (const msg of payload.messages) {
    const speaker = msg.role === "user" ? "You" : "Sightread";
    lines.push(`## ${speaker}`, "", msg.text, "");
    if (msg.imageBase64) {
      lines.push(`![attachment](data:image/jpeg;base64,${msg.imageBase64})`, "");
    }
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  downloadBlob(sanitizeFilename(conversation.title) + ".md", blob);
}

export async function exportConversationPdf(
  conversation: StoredConversation,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const payload = await buildExportPayload(conversation);
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  const addLine = (text: string, fontSize = 11, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, pageWidth);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += fontSize + 4;
    }
  };

  addLine(conversation.title, 16, true);
  addLine(`Exported ${new Date(payload.exportedAt).toLocaleString()}`, 9);
  y += 8;

  for (const msg of payload.messages) {
    const speaker = msg.role === "user" ? "You" : "Sightread";
    addLine(speaker, 12, true);
    addLine(msg.text);
    if (msg.imageBase64) {
      try {
        const imgWidth = Math.min(pageWidth, 240);
        const imgHeight = 180;
        if (y + imgHeight > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.addImage(
          `data:image/jpeg;base64,${msg.imageBase64}`,
          "JPEG",
          margin,
          y,
          imgWidth,
          imgHeight,
        );
        y += imgHeight + 12;
      } catch {
        addLine("[Image attachment]");
      }
    }
    y += 6;
  }

  doc.save(`${sanitizeFilename(conversation.title)}.pdf`);
}

export async function storedMessagesToChatMessages(
  stored: StoredMessage[],
): Promise<ChatMessage[]> {
  const result: ChatMessage[] = [];
  for (const msg of stored) {
    let imagePreviewUrl: string | undefined;
    let attachedImageBytes: number | undefined;
    if (msg.imageId) {
      const image = await getImage(msg.imageId);
      if (image) {
        imagePreviewUrl = URL.createObjectURL(image.blob);
        attachedImageBytes = image.byteSize;
      }
    }
    result.push({
      id: msg.id,
      role: msg.role,
      text: msg.text,
      imagePreviewUrl,
      attachedImageBytes,
    });
  }
  return result;
}

export function revokeMessagePreviewUrls(messages: ChatMessage[]) {
  for (const msg of messages) {
    if (msg.imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(msg.imagePreviewUrl);
    }
  }
}

function sanitizeFilename(title: string): string {
  return title.replace(/[^\w\s-]/g, "").trim() || "sightread-chat";
}

export { titleFromFirstMessage };
