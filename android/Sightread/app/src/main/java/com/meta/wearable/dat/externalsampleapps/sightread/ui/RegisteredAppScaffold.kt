package com.meta.wearable.dat.externalsampleapps.sightread.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.meta.wearable.dat.core.types.Permission
import com.meta.wearable.dat.core.types.PermissionStatus
import com.meta.wearable.dat.externalsampleapps.sightread.chat.VisionDiscussHandoff
import com.meta.wearable.dat.externalsampleapps.sightread.wearables.WearablesViewModel

@Composable
fun RegisteredAppScaffold(
    wearablesViewModel: WearablesViewModel,
    onRequestWearablesPermission: suspend (Permission) -> PermissionStatus,
    isStreaming: Boolean,
    modifier: Modifier = Modifier,
) {
  var activeTab by remember { mutableStateOf(AppTab.VISION) }
  var discussHandoff by remember { mutableStateOf<VisionDiscussHandoff?>(null) }

  AppShell(
        activeTab = activeTab,
        onTabChange = { activeTab = it },
        modifier = modifier,
    ) {
      Box(modifier = Modifier.fillMaxSize()) {
        when (activeTab) {
          AppTab.AGENT ->
              AgentChatScreen(
                  getCurrentFrame = { null },
                  discussHandoff = discussHandoff,
                  onDiscussHandoffConsumed = { discussHandoff = null },
                  modifier = Modifier.fillMaxSize(),
              )
          AppTab.VISION ->
              if (isStreaming) {
                StreamScreen(
                    wearablesViewModel = wearablesViewModel,
                    onDiscussInAgent = { handoff ->
                      discussHandoff = handoff
                      activeTab = AppTab.AGENT
                    },
                )
              } else {
                NonStreamScreen(
                    viewModel = wearablesViewModel,
                    onRequestWearablesPermission = onRequestWearablesPermission,
                )
              }
          AppTab.SETTINGS ->
              SettingsScreen(
                  settings = SettingsRepository(LocalContext.current),
                  onDone = { activeTab = AppTab.AGENT },
                  onHistoryCleared = {},
                  modifier = Modifier.fillMaxSize(),
              )
        }
      }
    }
}
