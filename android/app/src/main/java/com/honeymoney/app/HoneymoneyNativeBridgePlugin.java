package com.honeymoney.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import org.json.JSONArray;
import org.json.JSONObject;

import java.lang.ref.WeakReference;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(
    name = "HoneymoneyNativeBridge",
    permissions = {
        @Permission(
            alias = "sms",
            strings = { Manifest.permission.RECEIVE_SMS }
        ),
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class HoneymoneyNativeBridgePlugin extends Plugin {
    private static WeakReference<HoneymoneyNativeBridgePlugin> activeInstance = null;
    private static String initialPendingRoute = null;

    @Override
    public void load() {
        super.load();
        activeInstance = new WeakReference<>(this);
    }

    public static void setInitialRoute(String route) {
        initialPendingRoute = route;
        if (activeInstance != null && activeInstance.get() != null) {
            JSObject data = new JSObject();
            data.put("route", route);
            activeInstance.get().notifyListeners("appRouteRequested", data);
        }
    }

    public static void notifyNewSmsIfActive(JSONObject smsObj) {
        if (activeInstance != null && activeInstance.get() != null) {
            try {
                JSObject jsObj = new JSObject(smsObj.toString());
                activeInstance.get().notifyListeners("pendingSmsReceived", jsObj);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @PluginMethod
    public void getInitialRoute(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("route", initialPendingRoute);
        // Clear once consumed so subsequent resumes don't re-trigger
        initialPendingRoute = null;
        call.resolve(ret);
    }

    @PluginMethod
    public void getPendingSms(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(SmsReceiver.PREF_NAME, Context.MODE_PRIVATE);
        String rawJson = prefs.getString(SmsReceiver.KEY_PENDING_SMS, "[]");

        try {
            JSONArray arr = new JSONArray(rawJson);
            JSArray resultArr = new JSArray();
            for (int i = 0; i < arr.length(); i++) {
                resultArr.put(new JSObject(arr.getJSONObject(i).toString()));
            }
            JSObject ret = new JSObject();
            ret.put("smsList", resultArr);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read pending SMS buffer: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearPendingSms(PluginCall call) {
        JSArray idsToClear = call.getArray("ids");
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(SmsReceiver.PREF_NAME, Context.MODE_PRIVATE);

        try {
            if (idsToClear == null || idsToClear.length() == 0) {
                // Clear all
                prefs.edit().putString(SmsReceiver.KEY_PENDING_SMS, "[]").apply();
            } else {
                Set<String> idSet = new HashSet<>();
                for (int i = 0; i < idsToClear.length(); i++) {
                    idSet.add(idsToClear.getString(i));
                }

                String rawJson = prefs.getString(SmsReceiver.KEY_PENDING_SMS, "[]");
                JSONArray currentArr = new JSONArray(rawJson);
                JSONArray remainingArr = new JSONArray();

                for (int i = 0; i < currentArr.length(); i++) {
                    JSONObject item = currentArr.getJSONObject(i);
                    if (!idSet.contains(item.optString("id"))) {
                        remainingArr.put(item);
                    }
                }
                prefs.edit().putString(SmsReceiver.KEY_PENDING_SMS, remainingArr.toString()).apply();
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to clear pending SMS buffer: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelNotification(PluginCall call) {
        NotificationHelper.cancelNotification(getContext());
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void updateNotificationCount(PluginCall call) {
        int count = call.getInt("count", 0);
        if (count <= 0) {
            NotificationHelper.cancelNotification(getContext());
        } else {
            NotificationHelper.showConsolidatedNotification(getContext(), count);
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkSmsPermission(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.RECEIVE_SMS
        ) == PackageManager.PERMISSION_GRANTED;

        boolean notifGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notifGranted = ContextCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED;
        }

        JSObject ret = new JSObject();
        ret.put("smsGranted", granted);
        ret.put("notificationsGranted", notifGranted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAppPermissions(PluginCall call) {
        requestPermissionForAlias("sms", call, "permissionCallback");
    }
}
