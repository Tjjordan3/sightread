package com.meta.wearable.dat.externalsampleapps.sightread.ui

import android.graphics.Bitmap
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meta.wearable.dat.externalsampleapps.sightread.ai.SettingsRepository
import com.meta.wearable.dat.externalsampleapps.sightread.chat.ChatRole
import com.meta.wearable.dat.externalsampleapps.sightread.chat.ChatViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    getCurrentFrame: () -> Bitmap?,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
    chatViewModel: ChatViewModel =
        viewModel(
            factory =
                object : androidx.lifecycle.ViewModelProvider.Factory {
                  override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                    val settings = SettingsRepository(LocalContext.current)
                    @Suppress("UNCHECKED_CAST")
                    return ChatViewModel(settings) as T
                  }
                },
        ),
) {
  val uiState by chatViewModel.uiState.collectAsStateWithLifecycle()

  Column(modifier = modifier) {
    TopAppBar(title = { Text("Chat") })

    uiState.error?.let {
      Text(
          text = it,
          color = MaterialTheme.colorScheme.error,
          modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
      )
    }

    LazyColumn(modifier = Modifier.weight(1f).padding(horizontal = 12.dp)) {
      items(uiState.messages) { msg ->
        Column(
            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
            horizontalAlignment =
                if (msg.role == ChatRole.USER) Alignment.End else Alignment.Start,
        ) {
          Text(
              text = msg.text,
              style = MaterialTheme.typography.bodyMedium,
              modifier = Modifier.padding(10.dp),
          )
          msg.attachedImageBytes?.let { bytes ->
            Text(
                text = "Attached frame ($bytes bytes)",
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
        Checkbox(checked = uiState.attachFrame, onCheckedChange = { chatViewModel.setAttachFrame(it) })
        Text("Attach current frame", style = MaterialTheme.typography.bodySmall)
        androidx.compose.foundation.layout.Spacer(modifier = Modifier.weight(1f))
        Button(onClick = onClose) { Text("Close") }
      }
      Row(verticalAlignment = Alignment.CenterVertically) {
        OutlinedTextField(
            value = uiState.draft,
            onValueChange = { chatViewModel.setDraft(it) },
            modifier = Modifier.weight(1f),
            label = { Text("Message") },
        )
        Button(
            onClick = { chatViewModel.send(getCurrentFrame()) },
            enabled = !uiState.isSending,
            modifier = Modifier.padding(start = 8.dp),
        ) {
          Text("Send")
        }
      }
    }
  }
}

