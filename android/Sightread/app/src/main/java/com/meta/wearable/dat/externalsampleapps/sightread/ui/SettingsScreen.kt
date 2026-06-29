package com.meta.wearable.dat.externalsampleapps.sightread.ui

import android.content.Intent
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.ExposedDropdownMenu
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.meta.wearable.dat.externalsampleapps.sightread.ai.AIProvider
import com.meta.wearable.dat.externalsampleapps.sightread.ai.PromptMode
import com.meta.wearable.dat.externalsampleapps.sightread.ai.PromptPresets
import com.meta.wearable.dat.externalsampleapps.sightread.ai.SettingsRepository
import com.meta.wearable.dat.externalsampleapps.sightread.ai.ThemeSetting
import com.meta.wearable.dat.externalsampleapps.sightread.storage.ConversationRepository
import com.meta.wearable.dat.externalsampleapps.sightread.storage.ExportManager
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    settings: SettingsRepository,
    onDone: () -> Unit,
    onHistoryCleared: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
  val context = LocalContext.current
  val scope = rememberCoroutineScope()
  val repository = remember { ConversationRepository(context) }

  var geminiKey by remember { mutableStateOf(settings.geminiApiKey) }
  var openAIKey by remember { mutableStateOf(settings.openAIApiKey) }
  var groqKey by remember { mutableStateOf(settings.groqApiKey) }
  var anthropicKey by remember { mutableStateOf(settings.anthropicApiKey) }
  var mistralKey by remember { mutableStateOf(settings.mistralApiKey) }
  var openrouterKey by remember { mutableStateOf(settings.openrouterApiKey) }
  var nvidiaKey by remember { mutableStateOf(settings.nvidiaApiKey) }
  var openrouterModel by remember { mutableStateOf(settings.openrouterModel) }
  var nvidiaModel by remember { mutableStateOf(settings.nvidiaModel) }
  var searchProxyUrl by remember { mutableStateOf(settings.searchProxyUrl) }
  var interval by remember { mutableIntStateOf(settings.analysisIntervalSec) }
  var keysVisible by remember { mutableStateOf(false) }

  Column(modifier = modifier.fillMaxSize()) {
    TopAppBar(
        title = { Text("Sightread Settings") },
        actions = {
          IconButton(onClick = { keysVisible = !keysVisible }) {
            Icon(
                if (keysVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                contentDescription = if (keysVisible) "Hide keys" else "Show keys",
            )
          }
        },
    )
    Column(
        modifier = Modifier.verticalScroll(rememberScrollState()).padding(16.dp),
    ) {
      ThemeDropdown(settings)
      ProviderDropdown(settings)
      RowWithSwitch("Enable AI analysis", settings.isAIEnabled) { settings.isAIEnabled = it }
      RowWithSwitch("Manual vision only", settings.visionManualOnly) { settings.visionManualOnly = it }
      RowWithSwitch("Read vision responses aloud", settings.isTTSEnabled) { settings.isTTSEnabled = it }
      RowWithSwitch("Speak chat replies", settings.speakChatReplies) { settings.speakChatReplies = it }
      RowWithSwitch("Web search (via proxy)", settings.webSearchEnabled) { settings.webSearchEnabled = it }

      RowWithSwitch(
          label = "Smart prompts (recommended)",
          checked = settings.promptMode == PromptMode.AUTO,
      ) {
        settings.promptMode = if (it) PromptMode.AUTO else PromptMode.MANUAL
      }
      if (settings.promptMode == PromptMode.AUTO) {
        Text(
            "Sightread picks the best vision prompt automatically.",
            modifier = Modifier.padding(bottom = 8.dp),
        )
      } else {
        PromptDropdown(settings)
      }

      Text("Analyze every ${interval}s")
      Slider(
          value = interval.toFloat(),
          onValueChange = { interval = it.toInt() },
          valueRange = SettingsRepository.MIN_INTERVAL.toFloat()..SettingsRepository.MAX_INTERVAL.toFloat(),
          steps = SettingsRepository.MAX_INTERVAL - SettingsRepository.MIN_INTERVAL - 1,
      )

      Text("API keys (encrypted on device)", modifier = Modifier.padding(vertical = 8.dp))
      KeyField("Gemini API key", geminiKey, keysVisible) { geminiKey = it }
      KeyField("OpenAI API key", openAIKey, keysVisible) { openAIKey = it }
      KeyField("Groq API key", groqKey, keysVisible) { groqKey = it }
      KeyField("Anthropic API key", anthropicKey, keysVisible) { anthropicKey = it }
      KeyField("Mistral API key", mistralKey, keysVisible) { mistralKey = it }
      KeyField("OpenRouter API key", openrouterKey, keysVisible) { openrouterKey = it }
      KeyField("NVIDIA API key", nvidiaKey, keysVisible) { nvidiaKey = it }

      OutlinedTextField(
          value = openrouterModel,
          onValueChange = { openrouterModel = it },
          label = { Text("OpenRouter model") },
          modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
      )
      OutlinedTextField(
          value = nvidiaModel,
          onValueChange = { nvidiaModel = it },
          label = { Text("NVIDIA model") },
          modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
      )
      OutlinedTextField(
          value = searchProxyUrl,
          onValueChange = { searchProxyUrl = it },
          label = { Text("Search proxy URL (optional)") },
          modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
      )

      Button(
          onClick = {
            settings.geminiApiKey = geminiKey
            settings.openAIApiKey = openAIKey
            settings.groqApiKey = groqKey
            settings.anthropicApiKey = anthropicKey
            settings.mistralApiKey = mistralKey
            settings.openrouterApiKey = openrouterKey
            settings.nvidiaApiKey = nvidiaKey
            settings.openrouterModel = openrouterModel
            settings.nvidiaModel = nvidiaModel
            settings.searchProxyUrl = searchProxyUrl
            settings.analysisIntervalSec = interval
            onDone()
          },
          modifier = Modifier.padding(top = 16.dp),
      ) {
        Text("Save")
      }

      Button(
          onClick = {
            scope.launch {
              repository.clearAllConversations()
              onHistoryCleared()
            }
          },
          modifier = Modifier.padding(top = 8.dp),
      ) {
        Text("Clear all conversations")
      }

      Button(
          onClick = {
            scope.launch {
              val conversations = repository.listConversations()
              val active = conversations.firstOrNull() ?: return@launch
              val messages = repository.getMessages(active.id)
              val images =
                  messages.mapNotNull { it.imageId }.associateWith { id ->
                    repository.getImage(id)!!
                  }
              val json = ExportManager.toJson(active, messages, images)
              val intent =
                  Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, json)
                  }
              context.startActivity(Intent.createChooser(intent, "Export conversation"))
            }
          },
          modifier = Modifier.padding(top = 8.dp),
      ) {
        Text("Export latest conversation (JSON)")
      }
    }
  }
}

@Composable
private fun KeyField(
    label: String,
    value: String,
    visible: Boolean,
    onValueChange: (String) -> Unit,
) {
  OutlinedTextField(
      value = value,
      onValueChange = onValueChange,
      label = { Text(label) },
      modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
      visualTransformation =
          if (visible) VisualTransformation.None else PasswordVisualTransformation(),
      keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
  )
}

@Composable
private fun RowWithSwitch(label: String, checked: Boolean, onChecked: (Boolean) -> Unit) {
  Row(
      modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
  ) {
    Text(label, modifier = Modifier.weight(1f))
    Switch(checked = checked, onCheckedChange = onChecked)
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ThemeDropdown(settings: SettingsRepository) {
  var expanded by remember { mutableStateOf(false) }
  ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
    OutlinedTextField(
        value = settings.theme.name.lowercase(),
        onValueChange = {},
        readOnly = true,
        label = { Text("Theme") },
        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
        modifier = Modifier.menuAnchor().fillMaxWidth(),
    )
    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
      ThemeSetting.entries.forEach { theme ->
        DropdownMenuItem(
            text = { Text(theme.name.lowercase()) },
            onClick = {
              settings.theme = theme
              expanded = false
            },
        )
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProviderDropdown(settings: SettingsRepository) {
  var expanded by remember { mutableStateOf(false) }
  ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
    OutlinedTextField(
        value = settings.provider.displayName,
        onValueChange = {},
        readOnly = true,
        label = { Text("Provider") },
        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
        modifier = Modifier.menuAnchor().fillMaxWidth(),
    )
    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
      AIProvider.entries.forEach { p ->
        DropdownMenuItem(
            text = { Text(p.displayName) },
            onClick = {
              settings.provider = p
              expanded = false
            },
        )
      }
    }
  }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PromptDropdown(settings: SettingsRepository) {
  var expanded by remember { mutableStateOf(false) }
  ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
    OutlinedTextField(
        value = settings.selectedPrompt.title,
        onValueChange = {},
        readOnly = true,
        label = { Text("Prompt preset") },
        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
        modifier = Modifier.menuAnchor().fillMaxWidth(),
    )
    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
      PromptPresets.all.forEach { preset ->
        DropdownMenuItem(
            text = { Text(preset.title) },
            onClick = {
              settings.selectedPromptId = preset.id
              expanded = false
            },
        )
      }
    }
  }
}
