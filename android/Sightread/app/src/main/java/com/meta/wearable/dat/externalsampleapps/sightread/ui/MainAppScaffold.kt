package com.meta.wearable.dat.externalsampleapps.sightread.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.meta.wearable.dat.core.types.Permission
import com.meta.wearable.dat.core.types.PermissionStatus
import com.meta.wearable.dat.externalsampleapps.sightread.ai.SettingsRepository
import com.meta.wearable.dat.externalsampleapps.sightread.chat.VisionDiscussHandoff
import com.meta.wearable.dat.externalsampleapps.sightread.vision.VisionFrameState
import com.meta.wearable.dat.externalsampleapps.sightread.vision.VisionSource
import com.meta.wearable.dat.externalsampleapps.sightread.wearables.WearablesViewModel

/** Agent-first app shell — matches web App.tsx focus (Agent / Vision / Settings). */
@Composable
fun MainAppScaffold(
    wearablesViewModel: WearablesViewModel,
    onRequestWearablesPermission: suspend (Permission) -> PermissionStatus,
    modifier: Modifier = Modifier,
) {
  val settings = remember { SettingsRepository(LocalContext.current) }
  val wearablesState by wearablesViewModel.uiState.collectAsStateWithLifecycle()
  val visionFrameState = remember { VisionFrameState() }
  val currentFrame by visionFrameState.currentFrame.collectAsStateWithLifecycle()

  var activeTab by remember { mutableStateOf(AppTab.AGENT) }
  var visionSource by remember { mutableStateOf(VisionSource.PHONE) }
  var discussHandoff by remember { mutableStateOf<VisionDiscussHandoff?>(null) }
  var showOnboarding by remember { mutableStateOf(!settings.onboardingComplete) }

  LaunchedEffect(wearablesState.isStreaming) {
    if (!wearablesState.isStreaming && visionSource == VisionSource.GLASSES) {
      visionFrameState.clear()
    }
  }

  AppShell(
      activeTab = activeTab,
      onTabChange = { activeTab = it },
      modifier = modifier,
  ) {
    Box(modifier = Modifier.fillMaxSize()) {
      when (activeTab) {
        AppTab.AGENT ->
            AgentChatScreen(
                getCurrentFrame = { currentFrame },
                discussHandoff = discussHandoff,
                onDiscussHandoffConsumed = { discussHandoff = null },
                modifier = Modifier.fillMaxSize(),
            )
        AppTab.VISION ->
            VisionTabScreen(
                wearablesViewModel = wearablesViewModel,
                visionFrameState = visionFrameState,
                visionSource = visionSource,
                onVisionSourceChange = { source ->
                  if (source == VisionSource.PHONE) visionFrameState.clear()
                  visionSource = source
                },
                onDiscussInAgent = { handoff ->
                  discussHandoff = handoff
                  activeTab = AppTab.AGENT
                },
                onRequestWearablesPermission = onRequestWearablesPermission,
                modifier = Modifier.fillMaxSize(),
            )
        AppTab.SETTINGS ->
            SettingsScreen(
                settings = settings,
                wearablesViewModel = wearablesViewModel,
                onDone = { activeTab = AppTab.AGENT },
                onHistoryCleared = {},
                modifier = Modifier.fillMaxSize(),
            )
      }
    }
  }

  if (showOnboarding) {
    OnboardingDialog(
        onComplete = {
          settings.onboardingComplete = true
          showOnboarding = false
        },
    )
  }
}
