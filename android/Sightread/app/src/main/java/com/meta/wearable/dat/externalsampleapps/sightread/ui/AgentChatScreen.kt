package com.meta.wearable.dat.externalsampleapps.sightread.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meta.wearable.dat.externalsampleapps.sightread.ai.SettingsRepository
import com.meta.wearable.dat.externalsampleapps.sightread.chat.AgentChatViewModel
import com.meta.wearable.dat.externalsampleapps.sightread.chat.VisionDiscussHandoff
import com.meta.wearable.dat.externalsampleapps.sightread.speech.SpeechRecognizerService
import com.meta.wearable.dat.externalsampleapps.sightread.storage.ConversationEntity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConversationListSheet(
    conversations: List<ConversationEntity>,
    activeId: String?,
    onSelect: (String) -> Unit,
    onCreate: () -> Unit,
    onDelete: (String) -> Unit,
    onDismiss: () -> Unit,
) {
  ModalBottomSheet(onDismissRequest = onDismiss) {
    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
      Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically,
      ) {
        Text("Conversations", style = MaterialTheme.typography.titleMedium)
        IconButton(onClick = onCreate) {
          Icon(Icons.Default.Add, contentDescription = "New conversation")
        }
      }
      conversations.forEach { conversation ->
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
          Button(
              onClick = { onSelect(conversation.id) },
              modifier = Modifier.weight(1f),
              enabled = conversation.id != activeId,
          ) {
            Text(conversation.title)
          }
          IconButton(onClick = { onDelete(conversation.id) }) {
            Icon(Icons.Default.Delete, contentDescription = "Delete conversation")
          }
        }
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgentChatScreen(
    getCurrentFrame: () -> android.graphics.Bitmap?,
    discussHandoff: VisionDiscussHandoff? = null,
    onDiscussHandoffConsumed: () -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: AgentChatViewModel = viewModel(factory = AgentChatViewModel.Factory(LocalContext.current)),
) {
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val settings = remember { SettingsRepository(LocalContext.current) }
  val hasApiKey = remember(settings.provider) { settings.hasApiKeyForCurrentProvider() }
  val speechRecognizer = remember { SpeechRecognizerService(LocalContext.current) }
  var isListening by remember { mutableStateOf(false) }

  LaunchedEffect(discussHandoff) {
    discussHandoff?.let {
      viewModel.applyDiscussHandoff(it)
      onDiscussHandoffConsumed()
    }
  }

  Column(modifier = modifier.fillMaxSize()) {
    TopAppBar(
        title = { Text("Agent") },
        actions = {
          IconButton(onClick = { viewModel.toggleConversationList() }) {
            Icon(Icons.Default.List, contentDescription = "Conversations")
          }
        },
    )

    uiState.error?.let {
      Text(
          text = it,
          color = MaterialTheme.colorScheme.error,
          modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
      )
    }

    LazyColumn(modifier = Modifier.weight(1f).padding(horizontal = 12.dp)) {
      items(uiState.messages, key = { it.id }) { msg ->
        Column(
            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
            horizontalAlignment =
                if (msg.role == "user") Alignment.End else Alignment.Start,
        ) {
          Text(
              text = msg.text,
              style = MaterialTheme.typography.bodyMedium,
              modifier = Modifier.padding(10.dp),
          )
          msg.imageId?.let {
            Text(
                text = "Attached image",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
          }
        }
      }
      item {
        if (uiState.isSending) {
          Row(
              modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
              horizontalArrangement = Arrangement.Center,
              verticalAlignment = Alignment.CenterVertically,
          ) {
            CircularProgressIndicator(modifier = Modifier.size(18.dp))
            Text("Thinking…", modifier = Modifier.padding(start = 8.dp))
          }
        }
      }
    }

    Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        androidx.compose.material3.Checkbox(
            checked = uiState.attachFrame,
            onCheckedChange = { viewModel.setAttachFrame(it) },
        )
        Text("Attach current frame", style = MaterialTheme.typography.bodySmall)
      }
      Row(verticalAlignment = Alignment.CenterVertically) {
        IconButton(
            onClick = {
              if (isListening) {
                speechRecognizer.stop()
                isListening = false
              } else {
                isListening = true
                speechRecognizer.startListening(
                    onResult = { text ->
                      viewModel.setDraft(text)
                      isListening = false
                    },
                    onError = {
                      isListening = false
                    },
                )
              }
            },
        ) {
          Icon(Icons.Default.Mic, contentDescription = "Voice input")
        }
        OutlinedTextField(
            value = uiState.draft,
            onValueChange = { viewModel.setDraft(it) },
            modifier = Modifier.weight(1f),
            label = { Text("Message") },
        )
        Button(
            onClick = { viewModel.send(getCurrentFrame()) },
            enabled = !uiState.isSending && hasApiKey,
            modifier = Modifier.padding(start = 8.dp),
        ) {
          Text("Send")
        }
      }
      if (!hasApiKey) {
        Text(
            text = "Add an API key in Settings to chat.",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 6.dp),
        )
      }
    }
  }

  if (uiState.showConversationList) {
    ConversationListSheet(
        conversations = uiState.conversations,
        activeId = uiState.activeConversationId,
        onSelect = viewModel::selectConversation,
        onCreate = viewModel::createConversation,
        onDelete = viewModel::deleteConversation,
        onDismiss = viewModel::toggleConversationList,
    )
  }
}
