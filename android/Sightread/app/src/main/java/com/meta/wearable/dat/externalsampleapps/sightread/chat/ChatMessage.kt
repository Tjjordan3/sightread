package com.meta.wearable.dat.externalsampleapps.sightread.chat

enum class ChatRole { USER, ASSISTANT }

data class ChatMessage(
    val role: ChatRole,
    val text: String,
    val timestampMs: Long = System.currentTimeMillis(),
    val attachedImageBytes: Int? = null,
)

