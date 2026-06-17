package com.meta.wearable.dat.externalsampleapps.sightread.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.meta.wearable.dat.externalsampleapps.sightread.ai.AIProvider
import com.meta.wearable.dat.externalsampleapps.sightread.ai.PromptMode
import com.meta.wearable.dat.externalsampleapps.sightread.ai.PromptPresets
import com.meta.wearable.dat.externalsampleapps.sightread.ai.SettingsRepository

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(settings: SettingsRepository, onDone: () -> Unit, modifier: Modifier = Modifier) {
  var geminiKey by remember { mutableStateOf(settings.geminiApiKey) }
  var openAIKey by remember { mutableStateOf(settings.openAIApiKey) }
  var groqKey by remember { mutableStateOf(settings.groqApiKey) }
  var interval by remember { mutableIntStateOf(settings.analysisIntervalSec) }

  Column(modifier = modifier.fillMaxSize()) {
    TopAppBar(title = { Text("Sightread Settings") })
    Column(
        modifier = Modifier.verticalScroll(rememberScrollState()).padding(16.dp),
    ) {
      RowWithSwitch("Enable AI analysis", settings.isAIEnabled) { settings.isAIEnabled = it }
      RowWithSwitch("Read responses aloud", settings.isTTSEnabled) { settings.isTTSEnabled = it }

      ProviderDropdown(settings)
      RowWithSwitch(
          label = "Smart prompts (recommended)",
          checked = settings.promptMode == PromptMode.AUTO,
      ) {
        settings.promptMode = if (it) PromptMode.AUTO else PromptMode.MANUAL
      }
      if (settings.promptMode == PromptMode.AUTO) {
        Text(
            "Sightread picks the best vision prompt automatically — no preset to choose.",
            modifier = Modifier.padding(bottom = 8.dp),
        )
      } else {
        PromptDropdown(settings)
      }

      Text("Analyze every ${interval}s")
      Slider(
          value = interval.toFloat(),
          onValueChange = { interval = it.toInt() },
          valueRange = 2f..10f,
          steps = 7,
      )

      OutlinedTextField(
          value = geminiKey,
          onValueChange = { geminiKey = it },
          label = { Text("Gemini API key") },
          modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
      )
      OutlinedTextField(
          value = openAIKey,
          onValueChange = { openAIKey = it },
          label = { Text("OpenAI API key") },
          modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
      )
      OutlinedTextField(
          value = groqKey,
          onValueChange = { groqKey = it },
          label = { Text("Groq API key") },
          modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
      )

      Button(
          onClick = {
            settings.geminiApiKey = geminiKey
            settings.openAIApiKey = openAIKey
            settings.groqApiKey = groqKey
            settings.analysisIntervalSec = interval
            onDone()
          },
          modifier = Modifier.padding(top = 16.dp),
      ) {
        Text("Save")
      }
    }
  }
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
