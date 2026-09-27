package com.honeymoney.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import org.json.JSONArray;
import org.json.JSONObject;
import java.security.MessageDigest;
import java.util.Locale;

public class SmsReceiver extends BroadcastReceiver {
    public static final String PREF_NAME = "honeymoney_native_sms_buffer";
    public static final String KEY_PENDING_SMS = "pending_sms_list";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
            return;
        }

        try {
            SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
            if (messages == null || messages.length == 0) {
                return;
            }

            // Reconstruct full multipart SMS
            StringBuilder bodyBuilder = new StringBuilder();
            String sender = messages[0].getDisplayOriginatingAddress();
            long timestamp = messages[0].getTimestampMillis();

            for (SmsMessage msg : messages) {
                if (msg != null && msg.getMessageBody() != null) {
                    bodyBuilder.append(msg.getMessageBody());
                }
            }

            String fullBody = bodyBuilder.toString().trim();
            if (fullBody.isEmpty()) {
                return;
            }

            // Check if this is a financial transaction SMS candidate
            if (!isFinancialTransactionSms(fullBody)) {
                return;
            }

            // Generate deterministic fingerprint/ID
            String id = generateDeterministicId(sender, fullBody, timestamp);

            JSONObject smsObj = new JSONObject();
            smsObj.put("id", id);
            smsObj.put("sender", sender != null ? sender : "UNKNOWN");
            smsObj.put("body", fullBody);
            smsObj.put("timestamp", timestamp);

            // Persist into compact SharedPreferences JSON array
            int pendingCount = appendToPendingBuffer(context, smsObj);

            // Trigger notification
            NotificationHelper.showConsolidatedNotification(context, pendingCount);

            // If WebView is live, notify bridge immediately
            HoneymoneyNativeBridgePlugin.notifyNewSmsIfActive(smsObj);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Filters out non-financial SMS (OTP, telecom promos, spam).
     */
    public static boolean isFinancialTransactionSms(String text) {
        if (text == null) return false;
        String lower = text.toLowerCase(Locale.ENGLISH);

        // Strict OTP / non-transaction exclusions
        if (lower.contains("otp") || lower.contains("one time password") || lower.contains("verification code")) {
            // Unless it is explicitly a transaction debited with an OTP reference
            if (!lower.contains("debited") && !lower.contains("spent") && !lower.contains("credited")) {
                return false;
            }
        }

        // Promotional or balance enquiry only
        if (lower.contains("avail loan") || lower.contains("pre-approved") || lower.contains("congratulations") || lower.contains("win cash")) {
            return false;
        }

        // Must contain transaction intent markers
        boolean hasDebitCredit = lower.contains("debited") || lower.contains("spent") || 
                                 lower.contains("credited") || lower.contains("sent rs") || 
                                 lower.contains("paid rs") || lower.contains("paid inr") || 
                                 lower.contains("txn of") || lower.contains("transaction of") ||
                                 lower.contains("withdrawn") || lower.contains("transfer to") ||
                                 lower.contains("transferred");

        boolean hasCurrency = lower.contains("rs.") || lower.contains("rs ") || 
                              lower.contains("inr") || lower.contains("₹");

        return hasDebitCredit && hasCurrency;
    }

    public static synchronized int appendToPendingBuffer(Context context, JSONObject newSms) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            String existingJson = prefs.getString(KEY_PENDING_SMS, "[]");
            JSONArray array = new JSONArray(existingJson);

            String newId = newSms.getString("id");
            for (int i = 0; i < array.length(); i++) {
                JSONObject item = array.getJSONObject(i);
                if (newId.equals(item.optString("id"))) {
                    // Already in buffer
                    return array.length();
                }
            }

            array.put(newSms);
            prefs.edit().putString(KEY_PENDING_SMS, array.toString()).apply();
            return array.length();
        } catch (Exception e) {
            e.printStackTrace();
            return 1;
        }
    }

    private static String generateDeterministicId(String sender, String body, long timestamp) {
        try {
            // Group timestamp by nearest 5-second bucket to avoid slight boundary jitter
            long timeBucket = timestamp / 5000;
            String raw = (sender != null ? sender : "") + "|" + body + "|" + timeBucket;
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(raw.getBytes("UTF-8"));
            StringBuilder hexString = new StringBuilder("sms-native-");
            for (int i = 0; i < Math.min(hash.length, 8); i++) {
                String hex = Integer.toHexString(0xff & hash[i]);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return "sms-native-" + System.currentTimeMillis();
        }
    }
}
