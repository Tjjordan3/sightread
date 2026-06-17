import { clearAllConversations } from "../lib/storage";

export async function clearChatHistory(onDone: () => void) {
  if (
    !window.confirm(
      "Delete all saved conversations and images from this device?",
    )
  ) {
    return;
  }
  await clearAllConversations();
  onDone();
}
