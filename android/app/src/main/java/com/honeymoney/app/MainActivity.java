package com.honeymoney.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private long lastBackPressTime = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HoneymoneyNativeBridgePlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());

        // Handle Android swipe back gestures and back button
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "(function() { return window.__handleAndroidBack ? window.__handleAndroidBack() : false; })();",
                        new ValueCallback<String>() {
                            @Override
                            public void onReceiveValue(String value) {
                                // If web app handled back (modal closed or switched to Home)
                                if ("true".equalsIgnoreCase(value) || "\"true\"".equalsIgnoreCase(value)) {
                                    return;
                                }

                                // If webview has browser history to navigate back
                                if (getBridge().getWebView().canGoBack()) {
                                    getBridge().getWebView().goBack();
                                    return;
                                }

                                // Double back press confirmation on Home screen
                                long now = System.currentTimeMillis();
                                if (now - lastBackPressTime < 2000) {
                                    moveTaskToBack(true);
                                } else {
                                    lastBackPressTime = now;
                                    Toast.makeText(
                                        MainActivity.this,
                                        "Swipe back again to exit",
                                        Toast.LENGTH_SHORT
                                    ).show();
                                }
                            }
                        }
                    );
                } else {
                    finish();
                }
            }
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null) {
            String action = intent.getStringExtra(NotificationHelper.EXTRA_ACTION);
            if (NotificationHelper.ACTION_OPEN_SMS_REVIEW.equals(action)) {
                HoneymoneyNativeBridgePlugin.setInitialRoute("SMS_REVIEW");
            }
        }
    }
}
