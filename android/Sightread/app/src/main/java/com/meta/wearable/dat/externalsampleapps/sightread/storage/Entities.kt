package com.meta.wearable.dat.externalsampleapps.sightread.storage

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "conversations")
data class ConversationEntity(
    @PrimaryKey val id: String,
    val title: String,
    val createdAt: Long,
    val updatedAt: Long,
    val messageCount: Int,
)

@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey val id: String,
    val conversationId: String,
    val role: String,
    val text: String,
    val createdAt: Long,
    val imageId: String? = null,
)

@Entity(tableName = "images")
data class ImageEntity(
    @PrimaryKey val id: String,
    val conversationId: String,
    val mimeType: String,
    val data: ByteArray,
    val byteSize: Long,
    val createdAt: Long,
) {
  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (javaClass != other?.javaClass) return false
    other as ImageEntity
    return id == other.id
  }

  override fun hashCode(): Int = id.hashCode()
}
