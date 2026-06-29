package com.meta.wearable.dat.externalsampleapps.sightread.chat

import android.content.Context
import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.meta.wearable.dat.externalsampleapps.sightread.ai.ImageEncoding
import com.meta.wearable.dat.externalsampleapps.sightread.ai.SettingsRepository
import com.meta.wearable.dat.externalsampleapps.sightread.speech.SpeechService
import com.meta.wearable.dat.externalsampleapps.sightread.storage.ConversationEntity
import com.meta.wearable.dat.externalsampleapps.sightread.storage.ConversationRepository
import com.meta.wearable.dat.externalsampleapps.sightread.storage.MessageEntity
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AgentChatUiState(
    val conversations: List<ConversationEntity> = emptyList(),
    val activeConversationId: String? = null,
    val messages: List<MessageEntity> = emptyList(),
    val draft: String = "",
    val attachFrame: Boolean = false,
    val isSending: Boolean = false,
    val error: String? = null,
    val showConversationList: Boolean = false,
)

data class VisionDiscussHandoff(
    val promptText: String,
    val imageBytes: ByteArray?,
)

@OptIn(ExperimentalCoroutinesApi::class)
class AgentChatViewModel(
    private val settings: SettingsRepository,
    private val repository: ConversationRepository,
    private val chatService: ChatService,
    private val speechService: SpeechService,
) : ViewModel() {
  private val _uiState = MutableStateFlow(AgentChatUiState())
  val uiState: StateFlow<AgentChatUiState> = _uiState.asStateFlow()

  private val activeId = MutableStateFlow<String?>(null)
  private var pendingHandoffImage: ByteArray? = null

  init {
    viewModelScope.launch {
      repository.observeConversations().collect { conversations ->
        _uiState.update { it.copy(conversations = conversations) }
      }
    }
    viewModelScope.launch {
      activeId
          .flatMapLatest { id ->
            if (id == null) flowOf(emptyList()) else repository.observeMessages(id)
          }
          .collect { messages ->
            _uiState.update { it.copy(messages = messages) }
          }
    }
    viewModelScope.launch {
      val conversation = repository.ensureActiveConversation()
      selectConversation(conversation.id)
    }
  }

  fun setDraft(value: String) = _uiState.update { it.copy(draft = value) }

  fun setAttachFrame(value: Boolean) = _uiState.update { it.copy(attachFrame = value) }

  fun toggleConversationList() =
      _uiState.update { it.copy(showConversationList = !it.showConversationList) }

  fun selectConversation(id: String) {
    activeId.value = id
    _uiState.update { it.copy(activeConversationId = id, showConversationList = false) }
    viewModelScope.launch { repository.setLastConversationId(id) }
  }

  fun createConversation() {
    viewModelScope.launch {
      val conversation = repository.createConversation()
      selectConversation(conversation.id)
    }
  }

  fun deleteConversation(id: String) {
    viewModelScope.launch {
      repository.deleteConversation(id)
      if (_uiState.value.activeConversationId == id) {
        val next = repository.ensureActiveConversation()
        selectConversation(next.id)
      }
    }
  }

  fun applyDiscussHandoff(handoff: VisionDiscussHandoff) {
    pendingHandoffImage = handoff.imageBytes
    _uiState.update {
      it.copy(
          draft = handoff.promptText,
          attachFrame = handoff.imageBytes != null,
      )
    }
  }

  fun send(currentFrame: Bitmap?) {
    val draft = _uiState.value.draft.trim()
    if (draft.isEmpty()) return
    val conversationId = _uiState.value.activeConversationId ?: return

    if (!settings.hasApiKeyForCurrentProvider()) {
      _uiState.update { it.copy(error = "Add API key in Settings.") }
      return
    }

    val imageBytes =
        pendingHandoffImage
            ?: if (_uiState.value.attachFrame) {
              currentFrame?.let { ImageEncoding.jpegBytes(it, maxWidth = 512, quality = 60) }
            } else {
              null
            }
    pendingHandoffImage = null

    viewModelScope.launch {
      _uiState.update { it.copy(draft = "", isSending = true, error = null) }
      try {
        repository.appendMessage(conversationId, "user", draft, imageBytes)
        val messages = repository.getMessages(conversationId)
        val reply =
            chatService.requestReply(
                messages,
                imageBytes?.let { bytes ->
                  android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                },
            )
        repository.appendMessage(conversationId, "assistant", reply)
        if (settings.speakChatReplies) speechService.speak(reply)
        _uiState.update { it.copy(isSending = false) }
      } catch (e: Exception) {
        _uiState.update { it.copy(error = e.message ?: "Chat failed", isSending = false) }
      }
    }
  }

  class Factory(private val context: Context) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
      val appContext = context.applicationContext
      val settings = SettingsRepository(appContext)
      val repository = ConversationRepository(appContext)
      val speechService = SpeechService(appContext)
      return AgentChatViewModel(
          settings,
          repository,
          ChatService(settings),
          speechService,
      ) as T
    }
  }
}
