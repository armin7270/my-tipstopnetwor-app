import java.util.Properties

plugins {
    id("com.android.application")
}

/**
 * Signing credentials are read from (in order):
 *   1. android/keystore.properties   (local only — git-ignored)
 *   2. OBSIDIAN_* environment variables (CI)
 * When neither is present the release build stays unsigned and the debug build is used as-is.
 */
val keystoreProps = Properties().apply {
    val file = rootProject.file("keystore.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

fun secret(key: String, env: String, fallback: String? = null): String? =
    keystoreProps.getProperty(key) ?: System.getenv(env) ?: fallback

/** Single source of truth for the version: package.json at the repository root. */
val appVersion: String = run {
    val packageJson = rootProject.file("../package.json")
    if (!packageJson.exists()) return@run "1.0.0"
    Regex("\"version\"\\s*:\\s*\"([^\"]+)\"")
        .find(packageJson.readText())
        ?.groupValues
        ?.getOrNull(1)
        ?: "1.0.0"
}

fun versionCodeOf(version: String): Int {
    val parts = version.split('-', '+').first().split('.').mapNotNull { it.toIntOrNull() }
    val major = parts.getOrElse(0) { 1 }
    val minor = parts.getOrElse(1) { 0 }
    val patch = parts.getOrElse(2) { 0 }
    return major * 10_000 + minor * 100 + patch
}

android {
    namespace = "com.obsidian.core"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.obsidian.core"
        minSdk = 24
        targetSdk = 35
        versionCode = (secret("versionCode", "OBSIDIAN_VERSION_CODE", versionCodeOf(appVersion).toString())
            ?: "1").toInt()
        versionName = secret("versionName", "OBSIDIAN_VERSION_NAME", appVersion)
    }

    signingConfigs {
        val storePath = secret("storeFile", "OBSIDIAN_KEYSTORE")
        if (storePath != null) {
            create("release") {
                storeFile = file(storePath)
                storePassword = secret("storePassword", "OBSIDIAN_STORE_PASSWORD")
                keyAlias = secret("keyAlias", "OBSIDIAN_KEY_ALIAS")
                keyPassword = secret("keyPassword", "OBSIDIAN_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.findByName("release")
        }
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    // The web bundle contains no native libraries, so a single universal APK
    // installs on every ABI (arm64-v8a, armeabi-v7a, x86, x86_64).
    splits {
        abi {
            isEnable = false
        }
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

/** Copies the Vite production bundle (../dist-android) into the APK assets before every build. */
val webDist = rootProject.file(System.getenv("WEB_DIST") ?: "../dist-android")
val syncWebAssets by tasks.registering(Copy::class) {
    description = "Copies the web bundle from ../dist into app/src/main/assets/www"
    from(webDist)
    into(layout.projectDirectory.dir("src/main/assets/www"))
    doFirst {
        if (!webDist.exists()) {
            throw GradleException("Web bundle not found at ${webDist.path} — run `npm run build:android` in the repository root first.")
        }
    }
}

tasks.named("preBuild") {
    dependsOn(syncWebAssets)
}

tasks.matching { it.name.endsWith("Assets") && it.name != "syncWebAssets" }.configureEach {
    dependsOn(syncWebAssets)
}

dependencies {
    // Official WireGuard userspace engine (libwg-go.so for all four ABIs) plus the
    // embeddable backend that drives android.net.VpnService.
    implementation("com.wireguard.android:tunnel:1.0.20260102")
}

