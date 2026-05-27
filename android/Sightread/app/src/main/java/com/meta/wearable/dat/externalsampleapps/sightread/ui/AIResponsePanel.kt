package com.meta.wearable.dat.externalsampleapps.sightread.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.meta.wearable.dat.externalsampleapps.sightread.ai.AIUiState
import com.meta.wearable.dat.externalsampleapps.sightread.ai.AnalysisState

@Composable
fun AIResponsePanel(aiState: AIUiState, promptTitle: String, ttsEnabled: Boolean, modifier: Modifier = Modifier) {
  Column(
      modifier =
          modifier
              .fillMaxWidth()
              .padding(horizontal = 12.dp, vertical = 8.dp)
              .background(
                  MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
                  RoundedCornerShape(12.dp),
              )
              .padding(12.dp),
  ) {
    Row(modifier = Modifier.fillMaxWidth()) {
      Text("Sightread AI", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
      when (aiState.analysisState) {
        AnalysisState.RUNNING -> Text("…", style = MaterialTheme.typography.labelSmall)
        AnalysisState.ERROR -> Text("!", color = MaterialTheme.colorScheme.error)
        else -> Text("●", color = MaterialTheme.colorScheme.primary)
      }
    }
    when (aiState.analysisState) {
      AnalysisState.ERROR ->
          Text(aiState.errorMessage, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
      else ->
          Text(
              aiState.latestResponse.ifBlank { "Waiting for frames…" },
              style = MaterialTheme.typography.bodySmall,
              maxLines = 6,
          )
    }
    Text(
        "$promptTitle${if (ttsEnabled) " · TTS on" else ""}",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
  }
}
