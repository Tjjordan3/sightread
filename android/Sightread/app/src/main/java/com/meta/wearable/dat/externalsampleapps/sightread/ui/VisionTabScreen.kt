package com.meta.wearable.dat.externalsampleapps.sightread.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.meta.wearable.dat.core.types.Permission
import com.meta.wearable.dat.core.types.PermissionStatus
import com.meta.wearable.dat.externalsampleapps.sightread.R
import com.meta.wearable.dat.externalsampleapps.sightread.chat.VisionDiscussHandoff
import com.meta.wearable.dat.externalsampleapps.sightread.vision.VisionFrameState
import com.meta.wearable.dat.externalsampleapps.sightread.vision.VisionSource
import com.meta.wearable.dat.externalsampleapps.sightread.wearables.WearablesViewModel

@Composable
fun VisionTabScreen(
    wearablesViewModel: WearablesViewModel,
    visionFrameState: VisionFrameState,
    visionSource: VisionSource,
    onVisionSourceChange: (VisionSource) -> Unit,
    onDiscussInAgent: (VisionDiscussHandoff) -> Unit,
    onRequestWearablesPermission: suspend (Permission) -> PermissionStatus,
    modifier: Modifier = Modifier,
) {
  val wearablesState by wearablesViewModel.uiState.collectAsStateWithLifecycle()

  Column(modifier = modifier.fillMaxSize()) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      FilterChip(
          selected = visionSource == VisionSource.PHONE,
          onClick = { onVisionSourceChange(VisionSource.PHONE) },
          label = { Text("Phone") },
      )
      FilterChip(
          selected = visionSource == VisionSource.GLASSES,
          onClick = { onVisionSourceChange(VisionSource.GLASSES) },
          label = { Text("Glasses") },
          enabled = wearablesState.isRegistered,
      )
    }

    when {
      visionSource == VisionSource.PHONE ->
          PhoneVisionScreen(
              visionFrameState = visionFrameState,
              onDiscussInAgent = onDiscussInAgent,
              modifier = Modifier.weight(1f),
          )
      wearablesState.isStreaming ->
          StreamScreen(
              wearablesViewModel = wearablesViewModel,
              visionFrameState = visionFrameState,
              onDiscussInAgent = onDiscussInAgent,
              modifier = Modifier.weight(1f),
          )
      else ->
          GlassesVisionSetup(
              wearablesViewModel = wearablesViewModel,
              onRequestWearablesPermission = onRequestWearablesPermission,
              modifier = Modifier.weight(1f),
          )
    }
  }
}

@Composable
private fun GlassesVisionSetup(
    wearablesViewModel: WearablesViewModel,
    onRequestWearablesPermission: suspend (Permission) -> PermissionStatus,
    modifier: Modifier = Modifier,
) {
  val wearablesState by wearablesViewModel.uiState.collectAsStateWithLifecycle()
  val isUpdateRequired =
      wearablesState.isFirmwareUpdateRequired || wearablesState.isDatAppUpdateRequired

  Column(
      modifier = modifier.fillMaxSize().padding(24.dp),
      verticalArrangement = Arrangement.Center,
      horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    if (!wearablesState.isRegistered) {
      Text(
          text = "Connect Ray-Ban Meta glasses in Settings to stream from your glasses.",
          style = MaterialTheme.typography.bodyLarge,
          modifier = Modifier.padding(bottom = 16.dp),
      )
      Text(
          text = "Use the Phone source for vision without glasses.",
          style = MaterialTheme.typography.bodyMedium,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
      return
    }

    Text(
        text = stringResource(R.string.non_stream_screen_description),
        style = MaterialTheme.typography.bodyMedium,
        modifier = Modifier.padding(bottom = 16.dp),
    )

    if (!wearablesState.hasActiveDevice) {
      Text(
          text = stringResource(R.string.waiting_for_active_device),
          style = MaterialTheme.typography.bodyMedium,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
          modifier = Modifier.padding(bottom = 12.dp),
      )
    }

    if (isUpdateRequired) {
      Text(
          text = stringResource(R.string.update_required_title),
          color = MaterialTheme.colorScheme.error,
          modifier = Modifier.padding(bottom = 12.dp),
      )
    }

    SwitchButton(
        label = stringResource(R.string.stream_button_title),
        onClick = { wearablesViewModel.navigateToStreaming(onRequestWearablesPermission) },
        enabled = wearablesState.hasActiveDevice && !isUpdateRequired,
        modifier = Modifier.fillMaxWidth(),
    )
  }
}
