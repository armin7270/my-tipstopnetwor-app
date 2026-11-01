package com.obsidian.core;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Thin WebView shell around the Vite bundle in {@code assets/www}.
 *
 * The bundle is served from a synthetic {@code https://app.local} origin instead of
 * {@code file://} because Chromium refuses to load ES modules from file URLs (CORS),
 * and because a real origin makes localStorage/DOM storage behave predictably.
 *
 * The interface is fully client-side, so the app ships no native libraries and the
 * same APK installs on every CPU architecture.
 */
public class MainActivity extends Activity {

    private static final String APP_HOST = "app.local";
    private static final String APP_URL = "https://" + APP_HOST + "/index.html";
    private static final int CANVAS = Color.parseColor("#0A0E18");

    private static final Map<String, String> MIME_TYPES = new HashMap<>();

    static {
        MIME_TYPES.put("html", "text/html");
        MIME_TYPES.put("js", "text/javascript");
        MIME_TYPES.put("mjs", "text/javascript");
        MIME_TYPES.put("css", "text/css");
        MIME_TYPES.put("json", "application/json");
        MIME_TYPES.put("webmanifest", "application/manifest+json");
        MIME_TYPES.put("svg", "image/svg+xml");
        MIME_TYPES.put("png", "image/png");
        MIME_TYPES.put("jpg", "image/jpeg");
        MIME_TYPES.put("webp", "image/webp");
        MIME_TYPES.put("ico", "image/x-icon");
        MIME_TYPES.put("woff2", "font/woff2");
        MIME_TYPES.put("txt", "text/plain");
    }

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setStatusBarColor(CANVAS);
        window.setNavigationBarColor(CANVAS);
        // Light status/navigation icons on the dark canvas.
        window.getDecorView().setSystemUiVisibility(0);

        webView = new WebView(this);
        webView.setBackgroundColor(CANVAS);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setTextZoom(100);

        // Android 15 enforces edge-to-edge; keep the sticky header clear of the status bar.
        if (Build.VERSION.SDK_INT >= 35) {
            webView.setOnApplyWindowInsetsListener((view, insets) -> {
                view.setPadding(0, insets.getSystemWindowInsetTop(), 0, 0);
                return insets;
            });
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (url == null || !APP_HOST.equals(url.getHost())) {
                    return null;
                }
                return serveAsset(url.getPath());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                String host = uri.getHost();
                if (scheme == null || ("https".equals(scheme) && APP_HOST.equals(host))) {
                    return false;
                }
                openExternally(uri);
                return true;
            }
        });

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        setContentView(webView);
        webView.loadUrl(APP_URL);
    }

    /** Maps a request path onto {@code assets/www}, falling back to index.html for SPA routes. */
    private WebResourceResponse serveAsset(String rawPath) {
        String path = rawPath == null ? "/" : rawPath;
        try {
            path = URLDecoder.decode(path, "UTF-8");
        } catch (Exception ignored) {
            // keep the raw path
        }
        if (path.isEmpty() || "/".equals(path)) {
            path = "/index.html";
        }
        if (path.contains("..")) {
            return emptyResponse("text/plain", 403);
        }

        InputStream stream = openAsset("www" + path);
        String servedPath = path;
        if (stream == null) {
            servedPath = "/index.html";
            stream = openAsset("www" + servedPath);
        }
        if (stream == null) {
            return emptyResponse("text/plain", 404);
        }

        String extension = "";
        int dot = servedPath.lastIndexOf('.');
        if (dot >= 0) {
            extension = servedPath.substring(dot + 1).toLowerCase(Locale.US);
        }
        String mime = MIME_TYPES.get(extension);
        if (mime == null) {
            mime = "application/octet-stream";
        }
        String encoding = mime.startsWith("text/") || mime.contains("json") || mime.contains("svg")
                ? "utf-8"
                : null;
        return new WebResourceResponse(mime, encoding, stream);
    }

    private InputStream openAsset(String path) {
        try {
            return getAssets().open(path);
        } catch (IOException exception) {
            return null;
        }
    }

    private WebResourceResponse emptyResponse(String mime, int status) {
        WebResourceResponse response =
                new WebResourceResponse(mime, "utf-8", new ByteArrayInputStream(new byte[0]));
        if (Build.VERSION.SDK_INT >= 21) {
            response.setStatusCodeAndReasonPhrase(status, status == 403 ? "Forbidden" : "Not Found");
        }
        return response;
    }

    private void openExternally(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException exception) {
            Toast.makeText(this, R.string.no_browser, Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
