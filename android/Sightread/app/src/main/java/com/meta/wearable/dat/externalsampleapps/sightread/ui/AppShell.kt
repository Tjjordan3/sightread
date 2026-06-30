package com.meta.wearable.dat.externalsampleapps.sightread.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

enum class AppTab(val label: String) {
  AGENT("Agent"),
  VISION("Vision"),
  SETTINGS("Settings"),
}

@Composable
fun AppShell(
    activeTab: AppTab,
    onTabChange: (AppTab) -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
  Scaffold(
      modifier = modifier,
      bottomBar = {
        NavigationBar(modifier = Modifier.navigationBarsPadding()) {
          NavigationBarItem(
              selected = activeTab == AppTab.AGENT,
              onClick = { onTabChange(AppTab.AGENT) },
              icon = { Icon(Icons.Default.Chat, contentDescription = "Agent") },
              label = { Text(AppTab.AGENT.label) },
          )
          NavigationBarItem(
              selected = activeTab == AppTab.VISION,
              onClick = { onTabChange(AppTab.VISION) },
              icon = { Icon(Icons.Default.Videocam, contentDescription = "Vision") },
              label = { Text(AppTab.VISION.label) },
          )
          NavigationBarItem(
              selected = activeTab == AppTab.SETTINGS,
              onClick = { onTabChange(AppTab.SETTINGS) },
              icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
              label = { Text(AppTab.SETTINGS.label) },
          )
        }
      },
  ) { padding ->
    Column(modifier = Modifier.padding(padding)) { content() }
  }
}
