package com.meta.wearable.dat.externalsampleapps.sightread.storage

import android.content.Context
import androidx.room.Room
import java.util.UUID
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

class ConversationRepository(context: Context) {
  private val dao =
      Room.databaseBuilder(
              context.applicationContext,
              SightreadDatabase::class.java,
              "sightread.db",
          )
          .build()
          .conversationDao()

  fun observeConversations(): Flow<List<ConversationEntity>> = dao.observeConversations()

  fun observeMessages(conversationId: String): Flow<List<MessageEntity>> =
      dao.observeMessages(conversationId)

  suspend fun listConversations(): List<ConversationEntity> =
      dao.observeConversations().first()

  suspend fun getConversation(id: String): ConversationEntity? = dao.getConversation(id)

  suspend fun getMessages(conversationId: String): List<MessageEntity> =
      dao.getMessages(conversationId)

  suspend fun getImage(id: String): ImageEntity? = dao.getImage(id)

  suspend fun getLastConversationId(): String? =
      dao.getMeta(LAST_CONVERSATION_KEY)?.takeIf { it.isNotEmpty() }

  suspend fun createConversation(title: String = "New chat"): ConversationEntity {
    enforceConversationLimit()
    val now = System.currentTimeMillis()
    val conversation =
        ConversationEntity(
            id = newId(),
            title = title,
            createdAt = now,
            updatedAt = now,
            messageCount = 0,
        )
    dao.upsertConversation(conversation)
    setLastConversationId(conversation.id)
    return conversation
  }

  suspend fun ensureActiveConversation(): ConversationEntity {
    val lastId = getLastConversationId()
    if (lastId != null) {
      dao.getConversation(lastId)?.let { return it }
    }
    return createConversation()
  }

  suspend fun setLastConversationId(id: String) {
    dao.setMeta(MetaEntity(LAST_CONVERSATION_KEY, id))
  }

  suspend fun appendMessage(
      conversationId: String,
      role: String,
      text: String,
      imageBytes: ByteArray? = null,
  ): MessageEntity {
    enforceMessageLimit(conversationId)
    val imageId =
        if (imageBytes != null) {
          enforceImageQuota(imageBytes.size)
          val id = newId()
          dao.insertImage(
              ImageEntity(
                  id = id,
                  conversationId = conversationId,
                  mimeType = "image/jpeg",
                  data = imageBytes,
                  byteSize = imageBytes.size.toLong(),
                  createdAt = System.currentTimeMillis(),
              ),
          )
          id
        } else {
          null
        }
    val now = System.currentTimeMillis()
    val message =
        MessageEntity(
            id = newId(),
            conversationId = conversationId,
            role = role,
            text = text,
            createdAt = now,
            imageId = imageId,
        )
    dao.insertMessage(message)
    val conversation =
        dao.getConversation(conversationId)
            ?: error("Conversation $conversationId not found")
    val messageCount = dao.messageCount(conversationId)
    val updated =
        conversation.copy(
            updatedAt = now,
            messageCount = messageCount,
            title =
                if (conversation.messageCount == 0 && role == "user") {
                  text.take(48).ifBlank { "New chat" }
                } else {
                  conversation.title
                },
        )
    dao.upsertConversation(updated)
    return message
  }

  suspend fun deleteConversation(id: String) {
    val lastId = getLastConversationId()
    dao.deleteConversationCascade(id)
    if (lastId == id) {
      dao.setMeta(MetaEntity(LAST_CONVERSATION_KEY, ""))
    }
  }

  suspend fun clearAllConversations() {
    listConversations().forEach { dao.deleteConversationCascade(it.id) }
    dao.setMeta(MetaEntity(LAST_CONVERSATION_KEY, ""))
  }

  private suspend fun enforceConversationLimit() {
    val conversations = listConversations()
    if (conversations.size < StorageLimits.MAX_CONVERSATIONS) return
    conversations.lastOrNull()?.let { deleteConversation(it.id) }
  }

  private suspend fun enforceMessageLimit(conversationId: String) {
    val count = dao.messageCount(conversationId)
    if (count < StorageLimits.MAX_MESSAGES_PER_CONVERSATION) return
    val messages = dao.getMessages(conversationId)
    val dropCount = count - StorageLimits.MAX_MESSAGES_PER_CONVERSATION + 1
    messages.take(dropCount).forEach { message ->
      message.imageId?.let { dao.deleteImage(it) }
      dao.deleteMessage(message.id)
    }
  }

  private suspend fun enforceImageQuota(incomingBytes: Int) {
    var total = dao.totalImageBytes() + incomingBytes
    if (total <= StorageLimits.MAX_IMAGE_BYTES) return
    for (image in dao.allImagesOrdered()) {
      if (total <= StorageLimits.MAX_IMAGE_BYTES) break
      dao.deleteImage(image.id)
      total -= image.byteSize
    }
  }

  private fun newId(): String = UUID.randomUUID().toString()

  companion object {
    private const val LAST_CONVERSATION_KEY = "lastConversationId"
  }
}
