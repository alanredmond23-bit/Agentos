# Mobile Pack

The Mobile Pack provides AI agents for end-to-end mobile application development, covering iOS, Android, API integration, build pipelines, QA testing, security auditing, and app store submissions.

## Agents

### mobile_pack_manager
Coordinates all mobile development agents and manages workflow transitions between iOS, Android, and shared components.

### mobile_ios_swift
- Swift/SwiftUI development patterns
- iOS SDK integration
- Apple Human Interface Guidelines
- Core Data and CloudKit patterns
- Performance optimization for iOS

### mobile_android_kotlin
- Kotlin/Jetpack Compose development
- Android SDK integration
- Material Design 3 compliance
- Room database patterns
- Android performance optimization

### mobile_api_integration
- REST/GraphQL mobile client patterns
- Offline-first architecture
- Sync conflict resolution
- API versioning strategies
- Network layer optimization

### mobile_build_pipeline
- Fastlane configuration
- iOS code signing and provisioning
- Android signing configurations
- Multi-environment builds (dev/staging/prod)
- CI/CD automation for mobile

### mobile_qa_testing
- XCTest and Espresso test generation
- UI automation testing
- Device farm integration
- Accessibility testing
- Crash reporting setup

### mobile_security
- Secure storage implementation
- Certificate pinning
- OWASP MASVS compliance
- Biometric authentication
- App obfuscation and hardening

### mobile_appstore
- App Store Connect integration
- App Store Optimization (ASO)
- Screenshot and preview generation
- Privacy nutrition labels
- App review guideline compliance

### mobile_playstore
- Google Play Console integration
- Play Store optimization
- Release track management
- Android App Bundle configuration
- Content rating questionnaires

## Workflow

```
Discovery -> iOS/Android Dev -> API Integration -> Build Pipeline -> QA -> Security -> Store Submission
                    |                                                          |
                    <------------------ Feedback Loop -------------------------+
```

## Gates

- `gate.quality.ios`: iOS code quality and SwiftLint compliance
- `gate.quality.android`: Android code quality and Detekt compliance
- `gate.security.mobile`: OWASP MASVS security verification
- `gate.approval.store`: Human approval required before store submission

## MCP Servers

- `github`: Repository management and CI/CD
- `xcode-cloud`: iOS build automation
- `firebase`: Android distribution and analytics
- `testflight`: iOS beta testing
- `app-store-connect`: iOS store management
- `google-play`: Android store management

## Example Usage

```yaml
task:
  type: mobile.ios_feature
  input:
    feature_name: "Biometric Login"
    requirements:
      - Face ID and Touch ID support
      - Fallback to PIN
      - Secure keychain storage
    target_ios: "16.0+"
    architecture: "MVVM"
```
