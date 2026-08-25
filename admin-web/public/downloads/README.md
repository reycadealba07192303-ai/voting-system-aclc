# App downloads

Drop the release build of the student app here as **`ssg-vote.apk`**.

```bash
cd ../student-mobile
flutter build apk --release
cp build/app/outputs/flutter-apk/app-release.apk ../admin-web/public/downloads/ssg-vote.apk
```

The landing page QR code and download button point at `/downloads/ssg-vote.apk`
by default. To serve the APK from somewhere else (a CDN, Google Drive, a
Play Store listing), set these in `admin-web/.env` instead — no code change
needed:

```
VITE_APP_DOWNLOAD_URL=https://example.edu.ph/downloads/ssg-vote.apk
VITE_APP_VERSION=1.0.0
VITE_APP_SIZE=24 MB
```
