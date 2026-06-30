package com.meta.wearable.dat.externalsampleapps.sightread.ui

import androidx.activity.ComponentActivity
import androidx.activity.compose.LocalActivity
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meta.wearable.dat.externalsampleapps.sightread.ai.ImageEncoding
import com.meta.wearable.dat.externalsampleapps.sightread.ai.SettingsRepository
import com.meta.wearable.dat.externalsampleapps.sightread.chat.VisionDiscussHandoff
import com.meta.wearable.dat.externalsampleapps.sightread.vision.PhoneVisionViewModel
import com.meta.wearable.dat.externalsampleapps.sightread.vision.VisionFrameState

@Composable
fun PhoneVisionScreen(
    visionFrameState: VisionFrameState,
    onDiscussInAgent: (VisionDiscussHandoff) -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: PhoneVisionViewModel =
        viewModel(
            factory =
                PhoneVisionViewModel.Factory(
                    application = (LocalActivity.current as ComponentActivity).application,
                    visionFrameState = visionFrameState,
                ),
        ),
) {
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val aiState by viewModel.aiController.uiState.collectAsStateWithLifecycle()
  val settings = remember { SettingsRepository(LocalContext.current) }
  val lifecycleOwner = LocalLifecycleOwner.current
  val hasApiKey = remember(settings.provider) { settings.hasApiKeyForCurrentProvider() }
  val previewView = remember { PreviewView(LocalContext.current) }

  DisposableEffect(lifecycleOwner) {
    viewModel.bindCamera(lifecycleOwner, previewView)
    onDispose { viewModel.unbind() }
  }

  Box(modifier = modifier.fillMaxSize()) {
    AndroidView(
        factory = { previewView },
        modifier = Modifier.fillMaxSize(),
    )
    Column(modifier = Modifier.fillMaxSize().padding(top = 8.dp)) {
      Text(
          text = "Phone camera",
          style = MaterialTheme.typography.labelSmall,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
          modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
      )
      if (uiState.isActive) {
        AIResponsePanel(
            aiState = aiState,
            promptTitle = settings.visionPrompt.title,
            ttsEnabled = settings.isTTSEnabled,
        )
      }
      uiState.error?.let {
        Text(
            text = it,
            color = MaterialTheme.colorScheme.error,
            modifier = Modifier.padding(horizontal = 16.dp),
        )
      }
      Box(modifier = Modifier.weight(1f))
      Row(
          modifier =
              Modifier.fillMaxWidth()
                  .navigationBarsPadding()
                  .padding(24.dp),
          horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp),
      ) {
        SwitchButton(
            label = "Analyze now",
            onClick = { viewModel.analyzeNow() },
            modifier = Modifier.weight(1f),
            enabled = hasApiKey && uiState.isActive,
        )
      }
      if (aiState.latestResponse.isNotBlank()) {
        SwitchButton(
            label = "Discuss in Agent",
            onClick = {
              val frame = visionFrameState.currentFrame.value
              val imageBytes = frame?.let { ImageEncoding.jpegBytes(it, maxWidth = 512, quality = 60) }
              onDiscussInAgent(
                  VisionDiscussHandoff(
                      promptText = "Let's discuss this: ${aiState.latestResponse}",
                      imageBytes = imageBytes,
                  ),
              )
            },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
            enabled = hasApiKey,
        )
      }
      if (!hasApiKey) {
        Text(
            text = "Add an API key in Settings to use AI.",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp),
        )
      }
    }
  }
}
