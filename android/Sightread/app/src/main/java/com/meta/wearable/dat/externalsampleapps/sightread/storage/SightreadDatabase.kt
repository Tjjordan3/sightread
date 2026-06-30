package com.meta.wearable.dat.externalsampleapps.sightread.storage

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [ConversationEntity::class, MessageEntity::class, ImageEntity::class, MetaEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class SightreadDatabase : RoomDatabase() {
  abstract fun conversationDao(): ConversationDao
}
