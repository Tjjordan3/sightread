package com.meta.wearable.dat.externalsampleapps.sightread.ui

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable

@Composable
fun OnboardingDialog(onComplete: () -> Unit) {
  AlertDialog(
      onDismissRequest = onComplete,
      title = { Text("Welcome to Sightread") },
      text = {
        Text(
            "Sightread is your AI agent companion. Chat in Agent, use live vision " +
                "from your phone camera or optional Ray-Ban Meta glasses, and add API keys in Settings.",
        )
      },
      confirmButton = {
        TextButton(onClick = onComplete) { Text("Get started") }
      },
  )
}
