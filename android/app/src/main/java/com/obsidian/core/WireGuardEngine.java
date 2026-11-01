package com.obsidian.core;

import android.content.Context;
import android.util.Log;

import com.wireguard.android.backend.Backend;
import com.wireguard.android.backend.GoBackend;
import com.wireguard.android.backend.Statistics;
import com.wireguard.android.backend.Tunnel;
import com.wireguard.config.Config;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Real WireGuard tunnel controller built on the official
 * {@code com.wireguard.android:tunnel} userspace engine (libwg-go).
 *
 * WireGuard is used instead of the VLESS/Hysteria mock-ups because it is a
 * standard, auditable protocol with a maintained embeddable library, and any
 * ordinary {@code .conf} exported by a provider works unchanged.
 */
public final class WireGuardEngine {

    private static final String TAG = "ObsidianWG";

    public interface Listener {
        void onStateChanged();
    }

    private final Context context;
    private final Backend backend;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Listener listener;

    private volatile String state = "down";
    private volatile String activeName = null;
    private volatile String lastError = null;
    private volatile Tunnel tunnel;

    public WireGuardEngine(Context context, Listener listener) {
        this.context = context.getApplicationContext();
        this.backend = new GoBackend(this.context);
        this.listener = listener;
    }

    public String getState() {
        return state;
    }

    public String getActiveName() {
        return activeName;
    }

    public String getLastError() {
        return lastError;
    }

    /** Surfaces a failure (for example a denied VPN consent) to the UI. */
    public void reportError(String message) {
        lastError = message;
        setStateInternal("error");
    }

    public boolean isUp() {
        return "up".equals(state);
    }

    /** Validates a WG config and returns its primary endpoint, or null when invalid. */
    public static String validate(String configText) {
        Config config = parse(configText);
        if (config == null || config.getPeers().isEmpty()) {
            return null;
        }
        return EndpointHint.of(configText);
    }

    private static Config parse(String configText) {
        try {
            return Config.parse(new ByteArrayInputStream(configText.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            Log.w(TAG, "invalid config: " + exception.getMessage());
            return null;
        }
    }

    public synchronized void connect(final String tunnelName, final String configText) {
        lastError = null;
        setStateInternal("connecting");

        executor.execute(() -> {
            try {
                Config config = parse(configText);
                if (config == null) {
                    throw new IllegalArgumentException("Invalid WireGuard configuration");
                }
                if (config.getPeers().isEmpty()) {
                    throw new IllegalArgumentException("Configuration has no [Peer] section");
                }

                Tunnel current = tunnel;
                if (current == null || !tunnelName.equals(current.getName())) {
                    tunnel = new ActiveTunnel(tunnelName);
                    current = tunnel;
                }

                backend.setState(current, Tunnel.State.UP, config);
                activeName = tunnelName;
                lastError = null;
                setStateInternal("up");
            } catch (Exception exception) {
                lastError = describe(exception);
                Log.e(TAG, "connect failed", exception);
                setStateInternal("error");
            }
        });
    }

    public synchronized void disconnect() {        final Tunnel current = tunnel;
        if (current == null) {
            activeName = null;
            setStateInternal("down");
            return;
        }

        executor.execute(() -> {
            try {
                backend.setState(current, Tunnel.State.DOWN, null);
            } catch (Exception exception) {
                Log.w(TAG, "disconnect reported: " + describe(exception));
            } finally {
                activeName = null;
                setStateInternal("down");
            }
        });
    }

    /** @return {@code [rxBytes, txBytes]} for the active tunnel, zeros when idle. */
    public long[] stats() {
        Tunnel current = tunnel;
        if (current == null) {
            return new long[]{0L, 0L};
        }
        try {
            Statistics statistics = backend.getStatistics(current);
            if (statistics != null) {
                return new long[]{statistics.totalRx(), statistics.totalTx()};
            }
        } catch (Exception exception) {
            Log.w(TAG, "stats unavailable: " + describe(exception));
        }
        return new long[]{0L, 0L};
    }

    private String describe(Exception exception) {
        String message = exception.getMessage();
        return message == null || message.isEmpty() ? exception.getClass().getSimpleName() : message;
    }

    private void setStateInternal(String next) {
        state = next;
        if (listener != null) {
            listener.onStateChanged();
        }
    }

    private final class ActiveTunnel implements Tunnel {
        private final String name;

        ActiveTunnel(String name) {
            this.name = name;
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public void onStateChange(Tunnel.State newState) {
            if (newState == Tunnel.State.UP) {
                state = "up";
            } else if (newState == Tunnel.State.DOWN) {
                state = "down";
                activeName = null;
            }
            if (listener != null) {
                listener.onStateChanged();
            }
        }
    }

    /** Best-effort endpoint extraction for display; parsing already validated the file. */
    private static final class EndpointHint {
        private static final java.util.regex.Pattern PATTERN =
                java.util.regex.Pattern.compile("(?im)^\\s*Endpoint\\s*=\\s*([^\\s#]+)");

        static String of(String configText) {
            java.util.regex.Matcher matcher = PATTERN.matcher(configText);
            return matcher.find() ? matcher.group(1).trim() : "";
        }
    }
}
