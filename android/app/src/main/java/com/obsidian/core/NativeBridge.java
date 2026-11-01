package com.obsidian.core;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * JavaScript bridge exposed to the WebView as {@code window.ObsidianNative}.
 * Every method returns a JSON string and never throws across the bridge.
 */
public final class NativeBridge {

    private static final String PREFS = "obsidian_native";
    private static final String KEY_SELECTED = "selected_wireguard";

    private final MainActivity activity;
    private final ConfigStore store;
    private final WireGuardEngine engine;
    private final SharedPreferences preferences;

    public NativeBridge(MainActivity activity, ConfigStore store, WireGuardEngine engine) {
        this.activity = activity;
        this.store = store;
        this.engine = engine;
        this.preferences = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @JavascriptInterface
    public String status() {
        try {
            JSONObject json = new JSONObject();
            long[] stats = engine.stats();
            json.put("available", true);
            json.put("state", engine.getState());
            json.put("tunnel", engine.getActiveName());
            json.put("rx", stats[0]);
            json.put("tx", stats[1]);
            json.put("error", engine.getLastError());
            json.put("selected", getSelectedId());
            json.put("version", "wireguard-go");
            return json.toString();
        } catch (Exception exception) {
            return "{\"available\":true,\"state\":\"error\",\"error\":" + quote(exception.getMessage()) + "}";
        }
    }

    @JavascriptInterface
    public String listConfigs() {
        try {
            JSONArray array = new JSONArray();
            for (ConfigStore.StoredConfig config : store.list()) {
                JSONObject item = new JSONObject();
                item.put("id", config.id);
                item.put("name", config.name);
                item.put("endpoint", config.endpoint);
                array.put(item);
            }
            return array.toString();
        } catch (Exception exception) {
            return "[]";
        }
    }

    @JavascriptInterface
    public String importConfig(String name, String text) {
        try {
            if (text == null || text.trim().isEmpty()) {
                return error("Configuration is empty");
            }
            String endpoint = WireGuardEngine.validate(text);
            if (endpoint == null) {
                return error("Invalid WireGuard config — check [Interface], [Peer], keys and Address");
            }
            String displayName = name == null ? "" : name.trim();
            if (displayName.isEmpty()) {
                displayName = endpoint.isEmpty() ? "WireGuard tunnel" : endpoint;
            }
            ConfigStore.StoredConfig saved = store.save(displayName, text, endpoint);
            preferences.edit().putString(KEY_SELECTED, saved.id).apply();
            JSONObject json = new JSONObject();
            json.put("ok", true);
            json.put("id", saved.id);
            json.put("name", saved.name);
            json.put("endpoint", saved.endpoint);
            return json.toString();
        } catch (Exception exception) {
            return error(exception.getMessage() == null ? "Import failed" : exception.getMessage());
        }
    }

    @JavascriptInterface
    public String deleteConfig(String id) {
        try {
            ConfigStore.StoredConfig config = store.find(id);
            if (config == null) {
                return error("Configuration not found");
            }
            if (id.equals(getSelectedId())) {
                preferences.edit().remove(KEY_SELECTED).apply();
            }
            if (store.tunnelName(id).equals(engine.getActiveName())) {
                engine.disconnect();
            }
            store.delete(id);
            JSONObject json = new JSONObject();
            json.put("ok", true);
            return json.toString();
        } catch (Exception exception) {
            return error(exception.getMessage() == null ? "Delete failed" : exception.getMessage());
        }
    }

    @JavascriptInterface
    public String selectConfig(String id) {
        preferences.edit().putString(KEY_SELECTED, id).apply();
        return status();
    }

    @JavascriptInterface
    public String connect(String id) {
        String target = id;
        if (target == null || target.isEmpty()) {
            target = getSelectedId();
        }
        if (target == null || store.find(target) == null) {
            return error("Import a WireGuard configuration first");
        }
        preferences.edit().putString(KEY_SELECTED, target).apply();
        activity.requestConnect(target);
        return status();
    }

    @JavascriptInterface
    public String disconnect() {
        engine.disconnect();
        return status();
    }

    @JavascriptInterface
    public String getConfig(String id) {
        try {
            String text = store.read(id);
            if (text == null) {
                return error("Configuration not found");
            }
            JSONObject json = new JSONObject();
            json.put("ok", true);
            json.put("text", text);
            return json.toString();
        } catch (Exception exception) {
            return error("read failed");
        }
    }

    String getSelectedId() {
        return preferences.getString(KEY_SELECTED, null);
    }

    private String error(String message) {
        try {
            JSONObject json = new JSONObject();
            json.put("ok", false);
            json.put("error", message == null ? "Unknown error" : message);
            return json.toString();
        } catch (Exception ignored) {
            return "{\"ok\":false,\"error\":\"Unknown error\"}";
        }
    }

    private static String quote(String value) {
        try {
            return JSONObject.quote(value == null ? "" : value);
        } catch (Exception exception) {
            return "\"\"";
        }
    }
}
