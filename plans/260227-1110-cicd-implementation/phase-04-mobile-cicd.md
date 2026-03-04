# Phase 4: Mobile CI/CD

## Context
- Parent: [plan.md](./plan.md)
- Reference: IVM26 Mobile workflow (Android + iOS parallel)

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** Create GitHub Actions workflow for Flutter mobile app — build Android APK/AAB + iOS IPA in parallel

## Key Insights
- IVM26 pattern: 2 parallel jobs (build-android on ubuntu, build-ios on macos)
- Android: Java 17 + Flutter → test → build APK + AAB → upload artifacts
- iOS: Flutter → build ios --no-codesign → upload artifact
- Flutter test runs only in Android job (avoid duplicate)
- macOS runners cost 10x Linux runners — keep iOS job minimal

## Requirements
- Android job: setup → test → build APK + AAB → upload artifacts
- iOS job: setup → build → upload artifact
- Both jobs run in parallel
- Artifact retention: 30 days
- Discord notification on completion

## Architecture

```
Push to uat (Tracking_Mobile/**)
  ├── build-android (ubuntu-latest) ──────────┐
  │   ├── Setup Java 17                       │
  │   ├── Setup Flutter                       │ parallel
  │   ├── flutter pub get                     │
  │   ├── flutter test                        │
  │   ├── flutter build apk --release         │
  │   ├── flutter build appbundle --release   │
  │   ├── Upload APK artifact (30 days)       │
  │   ├── Upload AAB artifact (30 days)       │
  │   └── Discord notify                      │
  │                                           │
  └── build-ios (macos-latest) ───────────────┘
      ├── Setup Flutter
      ├── flutter pub get
      ├── flutter build ios --release --no-codesign
      ├── Upload IPA artifact (30 days)
      └── Discord notify
```

## Related Code Files
- `.github/workflows/mobile-uat.yml` — create
- `iot-vehicle-tracking-system/Tracking_Mobile/pubspec.yaml` — read for Flutter version
- `iot-vehicle-tracking-system/Tracking_Mobile/lib/` — app source

## Implementation Steps

### 1. Create `mobile-uat.yml`

```yaml
name: Mobile UAT Build
on:
  push:
    branches: [uat]
    paths:
      - 'iot-vehicle-tracking-system/Tracking_Mobile/**'

jobs:
  build-android:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: iot-vehicle-tracking-system/Tracking_Mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.27.0'
          channel: stable
          cache: true
      - run: flutter pub get
      - run: flutter doctor -v
      - run: flutter test
      - run: flutter build apk --release --target-platform android-arm64
      - run: flutter build appbundle --release
      - uses: actions/upload-artifact@v4
        with:
          name: android-apk
          path: iot-vehicle-tracking-system/Tracking_Mobile/build/app/outputs/flutter-apk/app-release.apk
          retention-days: 30
      - uses: actions/upload-artifact@v4
        with:
          name: android-appbundle
          path: iot-vehicle-tracking-system/Tracking_Mobile/build/app/outputs/bundle/release/app-release.aab
          retention-days: 30
      - name: Discord Notification
        if: success()
        uses: sarisia/actions-status-discord@v1
        with:
          webhook: ${{ secrets.DISCORD_WEBHOOK_URL }}
          title: "Android Build"
          status: ${{ job.status }}

  build-ios:
    runs-on: macos-latest
    defaults:
      run:
        working-directory: iot-vehicle-tracking-system/Tracking_Mobile
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.27.0'
          channel: stable
          cache: true
      - run: flutter pub get
      - run: flutter build ios --release --no-codesign
      - uses: actions/upload-artifact@v4
        with:
          name: ios-build
          path: iot-vehicle-tracking-system/Tracking_Mobile/build/ios/iphoneos/Runner.app
          retention-days: 30
      - name: Discord Notification
        if: success()
        uses: sarisia/actions-status-discord@v1
        with:
          webhook: ${{ secrets.DISCORD_WEBHOOK_URL }}
          title: "iOS Build"
          status: ${{ job.status }}
```

## Todo List
- [ ] Check Flutter version in pubspec.yaml
- [ ] Create `mobile-uat.yml` with Android + iOS parallel jobs
- [ ] Verify APK/AAB output paths match Flutter defaults
- [ ] Verify iOS build output path

## Success Criteria
- Push to uat with Tracking_Mobile changes → both Android + iOS jobs run
- APK + AAB artifacts uploaded successfully
- iOS .app artifact uploaded
- Artifacts retained 30 days
- Discord notifications sent

## Risk Assessment
- **Medium:** iOS build may fail without proper signing setup — `--no-codesign` mitigates
- **Medium:** Flutter version mismatch — lock version in workflow
- **Low:** macOS runner availability — GitHub-hosted runners generally available

## Security Considerations
- No signing keys in CI (--no-codesign for iOS, debug signing for Android)
- For production signing: add keystore/provisioning profile as secrets (future)

## Next Steps
- Phase 5: Improvements
