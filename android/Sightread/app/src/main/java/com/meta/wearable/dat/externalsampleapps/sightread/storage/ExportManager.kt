package com.meta.wearable.dat.externalsampleapps.sightread.storage

import org.json.JSONArray
import org.json.JSONObject

object ExportManager {
  fun toJson(
      conversation: ConversationEntity,
      messages: List<MessageEntity>,
      images: Map<String, ImageEntity>,
  ): String {
    val root =
        JSONObject()
            .put("version", 1)
            .put("exportedAt", System.currentTimeMillis())
            .put(
                "conversation",
                JSONObject()
                    .put("id", conversation.id)
                    .put("title", conversation.title)
                    .put("createdAt", conversation.createdAt)
                    .put("updatedAt", conversation.updatedAt)
                    .put("messageCount", conversation.messageCount),
            )
    val messagesArray = JSONArray()
    messages.forEach { message ->
      val item =
          JSONObject()
              .put("id", message.id)
              .put("role", message.role)
              .put("text", message.text)
              .put("createdAt", message.createdAt)
      message.imageId?.let { imageId ->
        images[imageId]?.let { image ->
          item.put(
              "imageBase64",
              android.util.Base64.encodeToString(image.data, android.util.Base64.NO_WRAP),
          )
        }
      }
      messagesArray.put(item)
    }
    root.put("messages", messagesArray)
    return root.toString(2)
  }

  fun toMarkdown(conversation: ConversationEntity, messages: List<MessageEntity>): String {
    val builder = StringBuilder()
    builder.append("# ").append(conversation.title).append("\n\n")
    messages.forEach { message ->
      val label = if (message.role == "user") "You" else "Sightread"
      builder.append("**").append(label).append(":** ").append(message.text).append("\n\n")
    }
    return builder.toString().trim()
  }
}
