# Mobile Pack

The Mobile Pack provides AI agents for end-to-end mobile application development, covering iOS, Android, API integration, build pipelines, QA testing, security auditing, and app store submissions.

## Overview

The Mobile Pack orchestrates a team of specialized agents to handle the complete mobile development lifecycle, from feature implementation to store submission.

## Agents

### mobile_pack_manager
**Role**: Mobile Development Orchestrator

Coordinates all mobile development agents and manages workflow transitions between iOS, Android, and shared components. Routes tasks to appropriate specialists and tracks progress across workstreams.

**Key Capabilities**:
- Workflow orchestration
- Agent delegation
- Progress tracking
- Quality aggregation

### mobile_ios_swift
**Role**: iOS Development Specialist

Expert in Swift and SwiftUI development following Apple Human Interface Guidelines.

**Key Capabilities**:
- Swift/SwiftUI code generation
- iOS architecture design (MVVM, Clean Architecture)
- XCTest and XCUITest generation
- Core Data and CloudKit integration
- Accessibility implementation

### mobile_android_kotlin
**Role**: Android Development Specialist

Expert in Kotlin and Jetpack Compose following Material Design 3 guidelines.

**Key Capabilities**:
- Kotlin/Compose code generation
- Android architecture design (MVVM, Clean Architecture)
- JUnit and Espresso test generation
- Room database integration
- Hilt dependency injection

### mobile_api_integration
**Role**: Mobile Backend Integration Specialist

Expert in building robust, offline-capable API integrations.

**Key Capabilities**:
- REST/GraphQL client generation
- Offline-first architecture
- Sync conflict resolution
- Network layer optimization
- Error handling and retry logic

### mobile_build_pipeline
**Role**: Mobile CI/CD Specialist

Expert in mobile build automation and distribution.

**Key Capabilities**:
- Fastlane configuration
- GitHub Actions workflows
- iOS/Android code signing setup
- Build caching optimization
- Multi-environment builds

### mobile_qa_testing
**Role**: Mobile Testing Specialist

Expert in comprehensive mobile testing strategies.

**Key Capabilities**:
- Unit test generation
- UI automation testing
- Device farm integration
- Accessibility testing
- Performance testing

### mobile_security
**Role**: Mobile Security Specialist

Expert in mobile application security and OWASP MASVS compliance.

**Key Capabilities**:
- Security auditing
- Secure storage implementation
- Certificate pinning
- Biometric authentication
- App hardening

### mobile_appstore
**Role**: iOS App Store Specialist

Expert in App Store Connect and Apple guidelines compliance.

**Key Capabilities**:
- App Store metadata optimization
- Privacy nutrition label generation
- Guideline compliance checking
- TestFlight management
- ASO optimization

### mobile_playstore
**Role**: Google Play Store Specialist

Expert in Google Play Console and policy compliance.

**Key Capabilities**:
- Play Store metadata optimization
- Data safety section generation
- Policy compliance checking
- Release track management
- ASO optimization

## Workflow

```
Discovery -> iOS/Android Dev -> API Integration -> Build Pipeline -> QA -> Security -> Store Submission
                    |                                                          |
                    <------------------ Feedback Loop -------------------------+
```

### Typical Flow

1. **Requirements Analysis**: Pack manager analyzes requirements and creates work breakdown
2. **Platform Development**: iOS and Android agents implement features in parallel
3. **API Integration**: API agent builds network layer and sync logic
4. **Build Setup**: Build agent configures CI/CD pipelines
5. **Testing**: QA agent generates and runs test suites
6. **Security Review**: Security agent audits for vulnerabilities
7. **Store Submission**: Store agents prepare metadata and compliance docs

## Gates

| Gate ID | Description | Type | Threshold |
|---------|-------------|------|-----------|
| `gate.quality.ios` | iOS code quality (SwiftLint) | Quality | 95% |
| `gate.quality.android` | Android code quality (Detekt) | Quality | 95% |
| `gate.security.mobile` | OWASP MASVS L1 compliance | Security | 100% |
| `gate.quality.test_coverage` | Minimum test coverage | Quality | 80% |
| `gate.approval.store` | Human approval for submission | Approval | Required |

## MCP Servers

| Server | Purpose | Priority |
|--------|---------|----------|
| `github` | Repository and CI/CD management | Critical |
| `firebase` | Android distribution and analytics | High |
| `supabase` | Backend integration | High |
| `slack` | Team notifications | Medium |

## Example Usage

### iOS Feature Implementation

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

### Android Screen Implementation

```yaml
task:
  type: mobile.android_screen
  input:
    screen_name: "ProductList"
    requirements:
      - Pagination with Paging 3
      - Pull to refresh
      - Offline support with Room
    min_sdk: 24
    architecture: "MVVM with Clean Architecture"
```

### Full Release Coordination

```yaml
task:
  type: mobile.release
  input:
    version: "2.1.0"
    platforms:
      - ios
      - android
    release_notes: "New biometric login feature"
    stages:
      - internal_testing
      - beta
      - production
```

## Quality Metrics

| Metric | Target |
|--------|--------|
| Code Quality Score | >95% |
| Test Coverage | >80% |
| Security Score (MASVS) | 100% L1 |
| Accessibility Score | >90% |
| First Submission Approval Rate | >90% |

## Security Considerations

- All agents follow OWASP MASVS Level 1 requirements
- Signing credentials are never accessed by agents
- Security agent must approve all releases
- Hardcoded secrets detection is mandatory
- Certificate pinning is required for all API calls

## Related Documentation

- [Architecture Overview](../architecture.md)
- [Security Standards](../standards/gates.md)
- [Eval Framework](../standards/evals_framework.md)
