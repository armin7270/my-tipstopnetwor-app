# Building a real Android client

This repository contains the **web interface** plus a working Android VPN app.

## 0. What ships today

Every `v*` tag publishes a **signed, installable** universal APK on
[GitHub Releases](https://github.com/armin7270/my-tipstopnetwor-app/releases) (`v1.1.0`+):

- `com.obsidian.core`, minSdk 24, targetSdk 35, version derived from `package.json`
- **Real tunnel**: the official `com.wireguard.android:tunnel` userspace engine (`libwg-go`) is
  bundled for `arm64-v8a`, `armeabi-v7a`, `x86` and `x86_64`, and driven through
  `android.net.VpnService` by `WireGuardEngine.java`.
- **WireGuard only**: users import a standard `.conf` (`[Interface]` + `[Peer]`) in
  *Engine Config → Real WireGuard tunnel*. Keys are stored in the app-private `files/wireguard/`
  directory.
- Assets are served from a synthetic `https://app.local` origin via `shouldInterceptRequest`,
  because Chromium blocks ES modules on `file://`.
- The browser build still simulates telemetry — a browser cannot open a TUN device.

The rest of this document describes the native pieces and how to extend the client beyond
WireGuard.

---

## 1. What is actually required

A working VPN/proxy client is ~90% native code. The web UI can drive it, but cannot replace it:

| Piece | Purpose | Where it lives |
| --- | --- | --- |
| `VpnService` subclass | Creates the `tun0` interface and owns the file descriptor | Android app |
| `tun2socks` / `sing-box` / `xray` core | Converts IP packets into proxy streams | Native `.so` per ABI |
| Route/DNS controller | Applies `VpnService.Builder` routes, DNS servers, per-app rules | Android app |
| Keystore + signing config | Produces a distributable, verifiable APK/AAB | Gradle |
| UI (this repo) | Visualization and control surface | WebView / Compose |

> A browser page **cannot** open a TUN device. Any "connect" button in a web app is a simulation,
> which is exactly what this repo demonstrates.

---

## 2. Prerequisites

- Node.js **24.x** (see `.nvmrc`)
- Android Studio (latest stable) + Android SDK 35
- JDK 17+ (bundled with Android Studio)
- Android NDK r26+ *only if* you compile the proxy core yourself

---

## 3. Option A — WebView wrapper (what this repo ships)

`android/` is already a minimal native equivalent of this step: a plain `Activity` + `WebView`
with asset interception, no AndroidX and no native libraries. Build it with `npm run apk`.

If you prefer Capacitor instead, the same steps apply:

This packages the existing interface as an app shell. It is useful for design review and internal
builds, **not** for a functional VPN.

```bash
npm ci
npm run build

npm i -D @capacitor/cli
npm i @capacitor/android @capacitor/core

npx cap init "Liquid Obsidian Core" com.obsidian.core --web-dir=dist
npx cap add android
npx cap sync android
npx cap open android
```

Then in `android/app/build.gradle`:

```gradle
android {
  defaultConfig {
    minSdk 24
    targetSdk 35
    versionCode 1
    versionName "1.0.0"
  }
  splits {
    abi {
      enable true
      reset()
      include "arm64-v8a", "armeabi-v7a", "x86_64"
      universalApk true
    }
  }
}
```

Build:

```bash
cd android
./gradlew assembleRelease        # Windows: gradlew.bat assembleRelease
```

Outputs land in `android/app/build/outputs/apk/release/`.

---

## 4. Option B — Native UI + real proxy core (production path)

1. Create a new Android project (`com.obsidian.core`), Jetpack Compose.
2. Add a `VpnService` implementation:

```kotlin
class ObsidianVpnService : VpnService() {
    private var tun: ParcelFileDescriptor? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val builder = Builder()
            .setSession("Liquid Obsidian Core")
            .addAddress("172.19.0.1", 30)
            .addDnsServer("1.1.1.1")
            .addRoute("0.0.0.0", 0)
            .setMtu(1500)
            .setBlocking(true)

        // Per-app split tunneling from the "Traffic Matrix" screen
        excludedPackages.forEach { runCatching { builder.addDisallowedApplication(it) } }

        tun = builder.establish() ?: return START_NOT_STICKY
        startTun2Socks(tun!!.fileDescriptor) // JNI bridge into libtun2socks.so
        return START_STICKY
    }

    override fun onDestroy() {
        tun?.close()
        stopTun2Socks()
        super.onDestroy()
    }
}
```

3. Register it in `AndroidManifest.xml`:

```xml
<service
    android:name=".ObsidianVpnService"
    android:permission="android.permission.BIND_VPN_SERVICE"
    android:exported="false">
    <intent-filter>
        <action android:name="android.net.VpnService" />
    </intent-filter>
</service>
```

4. Ship the core binaries in `src/main/jniLibs/<abi>/` (`libtun2socks.so`, `libxray.so`, `libsingbox.so`).
5. Replace the simulated telemetry in this UI with a real bridge:

```
native -> JS:  { download, upload, ping, sockets, activeNode, log[] }
JS -> native:  { connect(uri), disconnect(), selectNode(id), setRule(...) }
```

With Capacitor, expose the bridge as a plugin; with a pure-WebView approach, use
`WebView.addJavascriptInterface` / `postWebMessage`.

6. Persist state with `DataStore`, not `localStorage`, and move secrets to the Android Keystore.

---

## 5. Signing and verification

```bash
keytool -genkeypair -v -keystore release.keystore -alias obsidian \
        -keyalg RSA -keysize 4096 -validity 10000

./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=$PWD/release.keystore \
  -Pandroid.injected.signing.store.password=*** \
  -Pandroid.injected.signing.key.alias=obsidian \
  -Pandroid.injected.signing.key.password=***

apksigner verify --print-certs app-release.apk
sha256sum app-release.apk        # publish this next to the download
```

---

## 6. Release checklist

- [ ] Never publish a debug-signed APK.
- [ ] Build and test every ABI you advertise.
- [ ] Publish SHA-256 hashes next to the download links.
- [ ] Document the data you collect; a VPN client must state its logging policy.
- [ ] Test the `VpnService.prepare()` consent flow on a physical device.
- [ ] Set battery optimization to *Unrestricted* in the onboarding copy.
- [ ] Use Play App Signing if you distribute on Google Play (AAB, not APK).
