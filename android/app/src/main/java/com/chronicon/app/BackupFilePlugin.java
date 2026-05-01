package com.chronicon.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "BackupFile")
public class BackupFilePlugin extends Plugin {

    @PluginMethod
    public void pickBackupFile(PluginCall call) {
        String suggestedName = call.getString("suggestedName", "chronicon-autobackup.json");

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, suggestedName);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION |
            Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );

        startActivityForResult(call, intent, "handlePickBackupFile");
    }

    @ActivityCallback
    private void handlePickBackupFile(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("Backup destination selection was cancelled.");
            return;
        }

        Intent data = result.getData();
        if (data == null || data.getData() == null) {
            call.reject("No backup destination was selected.");
            return;
        }

        Uri uri = data.getData();
        int takeFlags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

        try {
            getContext().getContentResolver().takePersistableUriPermission(uri, takeFlags);
        } catch (SecurityException ignored) {
            // Some document providers already grant sufficient access.
        }

        JSObject ret = new JSObject();
        ret.put("uri", uri.toString());
        ret.put("displayName", getDisplayName(uri));
        call.resolve(ret);
    }

    @PluginMethod
    public void writeBackup(PluginCall call) {
        String uriString = call.getString("uri");
        String content = call.getString("content", "");

        if (uriString == null || uriString.isEmpty()) {
            call.reject("Missing backup destination URI.");
            return;
        }

        Uri uri = Uri.parse(uriString);
        ContentResolver contentResolver = getContext().getContentResolver();

        try (
            OutputStream outputStream = contentResolver.openOutputStream(uri, "wt");
            OutputStreamWriter writer = outputStream == null ? null : new OutputStreamWriter(outputStream, StandardCharsets.UTF_8)
        ) {
            if (writer == null) {
                call.reject("Could not open the backup destination.");
                return;
            }

            writer.write(content);
            writer.flush();

            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            ret.put("displayName", getDisplayName(uri));
            call.resolve(ret);
        } catch (Exception ex) {
            call.reject("Failed to write backup file.", ex);
        }
    }

    private String getDisplayName(Uri uri) {
        Cursor cursor = null;
        try {
            cursor = getContext().getContentResolver().query(uri, null, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    return cursor.getString(index);
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }

        String fallback = uri.getLastPathSegment();
        return fallback == null || fallback.isEmpty() ? uri.toString() : fallback;
    }
}
