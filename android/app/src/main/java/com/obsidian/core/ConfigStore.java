package com.obsidian.core;

import android.content.Context;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Stores imported WireGuard configurations inside the app's private files
 * directory. Nothing is ever written to shared storage or logged.
 */
public final class ConfigStore {

    public static final class StoredConfig {
        public final String id;
        public final String name;
        public final String endpoint;

        StoredConfig(String id, String name, String endpoint) {
            this.id = id;
            this.name = name;
            this.endpoint = endpoint;
        }
    }

    private static final SecureRandom RANDOM = new SecureRandom();

    private final File directory;

    public ConfigStore(Context context) {
        this.directory = new File(context.getFilesDir(), "wireguard");
        if (!directory.exists() && !directory.mkdirs()) {
            android.util.Log.w("ObsidianWG", "could not create config directory");
        }
    }

    public List<StoredConfig> list() {
        List<StoredConfig> configs = new ArrayList<>();
        File[] files = directory.listFiles();
        if (files == null) {
            return configs;
        }
        for (File file : files) {
            String fileName = file.getName();
            if (!fileName.endsWith(".conf")) {
                continue;
            }
            String id = fileName.substring(0, fileName.length() - ".conf".length());
            configs.add(new StoredConfig(id, readText(id + ".name", id), readText(id + ".endpoint", "")));
        }
        configs.sort((left, right) -> left.name.compareToIgnoreCase(right.name));
        return configs;
    }

    public StoredConfig find(String id) {
        for (StoredConfig config : list()) {
            if (config.id.equals(id)) {
                return config;
            }
        }
        return null;
    }

    public String read(String id) {
        return readText(id + ".conf", null);
    }

    /** Persists a validated config and returns its metadata. */
    public StoredConfig save(String displayName, String configText, String endpoint) throws IOException {
        String id = newId();
        write(id + ".conf", configText);
        write(id + ".name", displayName);
        write(id + ".endpoint", endpoint == null ? "" : endpoint);
        return new StoredConfig(id, displayName, endpoint == null ? "" : endpoint);
    }

    public boolean delete(String id) {
        boolean removed = false;
        for (String suffix : new String[]{".conf", ".name", ".endpoint"}) {
            File file = new File(directory, id + suffix);
            if (file.exists()) {
                removed |= file.delete();
            }
        }
        return removed;
    }

    public String tunnelName(String id) {
        return "obs-" + id;
    }

    private String newId() {
        byte[] bytes = new byte[5];
        RANDOM.nextBytes(bytes);
        StringBuilder builder = new StringBuilder();
        for (byte value : bytes) {
            builder.append(String.format(Locale.US, "%02x", value));
        }
        return builder.toString();
    }

    private void write(String fileName, String content) throws IOException {
        try (FileOutputStream stream = new FileOutputStream(new File(directory, fileName))) {
            stream.write(content.getBytes(StandardCharsets.UTF_8));
        }
    }

    private String readText(String fileName, String fallback) {
        File file = new File(directory, fileName);
        if (!file.exists()) {
            return fallback;
        }
        try {
            byte[] bytes = Files.readAllBytes(file.toPath());
            String text = new String(bytes, StandardCharsets.UTF_8).trim();
            return text.isEmpty() ? fallback : text;
        } catch (IOException exception) {
            return fallback;
        }
    }
}
