package com.meta.wearable.dat.externalsampleapps.sightread.storage

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
interface ConversationDao {
  @Query("SELECT * FROM conversations ORDER BY updatedAt DESC")
  fun observeConversations(): Flow<List<ConversationEntity>>

  @Query("SELECT * FROM conversations WHERE id = :id LIMIT 1")
  suspend fun getConversation(id: String): ConversationEntity?

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsertConversation(conversation: ConversationEntity)

  @Query("DELETE FROM conversations WHERE id = :id")
  suspend fun deleteConversation(id: String)

  @Query("SELECT COUNT(*) FROM conversations")
  suspend fun conversationCount(): Int

  @Query("SELECT * FROM messages WHERE conversationId = :conversationId ORDER BY createdAt ASC")
  fun observeMessages(conversationId: String): Flow<List<MessageEntity>>

  @Query("SELECT * FROM messages WHERE conversationId = :conversationId ORDER BY createdAt ASC")
  suspend fun getMessages(conversationId: String): List<MessageEntity>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertMessage(message: MessageEntity)

  @Query("SELECT COUNT(*) FROM messages WHERE conversationId = :conversationId")
  suspend fun messageCount(conversationId: String): Int

  @Query("DELETE FROM messages WHERE conversationId = :conversationId")
  suspend fun deleteMessages(conversationId: String)

  @Query("DELETE FROM messages WHERE id = :id")
  suspend fun deleteMessage(id: String)

  @Query("DELETE FROM conversations")
  suspend fun deleteAllConversations()

  @Query("DELETE FROM messages")
  suspend fun deleteAllMessages()

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertImage(image: ImageEntity)

  @Query("SELECT * FROM images WHERE id = :id LIMIT 1")
  suspend fun getImage(id: String): ImageEntity?

  @Query("SELECT COALESCE(SUM(byteSize), 0) FROM images")
  suspend fun totalImageBytes(): Long

  @Query("SELECT * FROM images ORDER BY createdAt ASC")
  suspend fun allImagesOrdered(): List<ImageEntity>

  @Query("DELETE FROM images WHERE conversationId = :conversationId")
  suspend fun deleteImages(conversationId: String)

  @Query("DELETE FROM images")
  suspend fun deleteAllImages()

  @Query("DELETE FROM images WHERE id = :id")
  suspend fun deleteImage(id: String)

  @Query("SELECT value FROM meta WHERE `key` = :key LIMIT 1")
  suspend fun getMeta(key: String): String?

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun setMeta(pair: MetaEntity)

  @Transaction
  suspend fun deleteConversationCascade(id: String) {
    deleteMessages(id)
    deleteImages(id)
    deleteConversation(id)
  }
}

@Entity(tableName = "meta")
data class MetaEntity(
    @androidx.room.PrimaryKey val key: String,
    val value: String,
)
