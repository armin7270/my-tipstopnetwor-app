# The app has no reflection-based entry points besides the Activity/WebView
# classes referenced from the manifest, which R8 keeps automatically.
-dontwarn android.webkit.**
-keepclassmembers class com.obsidian.core.MainActivity { *; }
