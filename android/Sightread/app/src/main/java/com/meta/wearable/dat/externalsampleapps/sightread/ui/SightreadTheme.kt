package com.meta.wearable.dat.externalsampleapps.sightread.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import com.meta.wearable.dat.externalsampleapps.sightread.ai.SettingsRepository
import com.meta.wearable.dat.externalsampleapps.sightread.ai.ThemeSetting

@Composable
fun SightreadTheme(settings: SettingsRepository, content: @Composable () -> Unit) {
  val darkTheme =
      when (settings.theme) {
        ThemeSetting.LIGHT -> false
        ThemeSetting.DARK -> true
        ThemeSetting.AUTO -> isSystemInDarkTheme()
      }
  MaterialTheme(colorScheme = if (darkTheme) darkColorScheme() else lightColorScheme(), content = content)
}
