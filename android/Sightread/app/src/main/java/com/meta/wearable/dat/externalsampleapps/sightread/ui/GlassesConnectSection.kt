package com.meta.wearable.dat.externalsampleapps.sightread.ui

import android.widget.Toast
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.meta.wearable.dat.core.types.RegistrationState
import com.meta.wearable.dat.externalsampleapps.sightread.R
import com.meta.wearable.dat.externalsampleapps.sightread.wearables.WearablesViewModel

@Composable
fun GlassesConnectSection(
    wearablesViewModel: WearablesViewModel,
    modifier: Modifier = Modifier,
) {
  val uiState by wearablesViewModel.uiState.collectAsStateWithLifecycle()
  val activity = LocalActivity.current
  val context = LocalContext.current
  val isRegistered = uiState.isRegistered
  val canUnregister = uiState.registrationState == RegistrationState.REGISTERED

  Column(modifier = modifier.fillMaxWidth().padding(vertical = 8.dp)) {
    Text(
        text = "Ray-Ban Meta glasses (optional)",
        style = MaterialTheme.typography.titleMedium,
        modifier = Modifier.padding(bottom = 8.dp),
    )
    Text(
        text =
            if (isRegistered) {
              "Connected — switch Vision tab to Glasses to stream from your glasses."
            } else {
              "Connect glasses for first-person vision. Agent chat works without them."
            },
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(bottom = 12.dp),
    )

    if (!isRegistered) {
      SwitchButton(
          label = stringResource(R.string.register_button_title),
          enabled = uiState.canStartRegistration,
          onClick = {
            activity?.let { wearablesViewModel.startRegistration(it) }
                ?: Toast.makeText(context, "Activity not available", Toast.LENGTH_SHORT).show()
          },
          modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
      )
    } else {
      SwitchButton(
          label = stringResource(R.string.unregister_button_title),
          onClick = {
            activity?.let { wearablesViewModel.startUnregistration(it) }
                ?: Toast.makeText(context, "Activity not available", Toast.LENGTH_SHORT).show()
          },
          isDestructive = true,
          enabled = canUnregister,
          modifier = Modifier.fillMaxWidth(),
      )
      if (uiState.isFirmwareUpdateRequired) {
        SwitchButton(
            label = stringResource(R.string.update_firmware_button_title),
            onClick = {
              activity?.let { wearablesViewModel.openFirmwareUpdate(it) }
                  ?: Toast.makeText(context, "Activity not available", Toast.LENGTH_SHORT).show()
            },
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        )
      }
      if (uiState.isDatAppUpdateRequired) {
        SwitchButton(
            label = stringResource(R.string.update_dat_app_button_title),
            onClick = {
              activity?.let { wearablesViewModel.openDATGlassesAppUpdate(it) }
                  ?: Toast.makeText(context, "Activity not available", Toast.LENGTH_SHORT).show()
            },
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        )
      }
    }
  }
}
