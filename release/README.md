# Release artifacts

APKs are **not** committed to the repository. Every * tag triggers
.github/workflows/android-apk.yml, which builds a signed universal APK and attaches it to the
matching GitHub Release together with SHA256SUMS.txt.

Download the latest build from:
https://github.com/armin7270/my-tipstopnetwor-app/releases/latest

Build it locally with 
pm run apk (see ndroid/README.md).
