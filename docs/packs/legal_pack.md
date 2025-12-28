# Legal Pack

The Legal Pack provides AI agents for legal operations including document drafting, eDiscovery, privilege protection, evidence management, timeline construction, and legal research.

## Overview

The Legal Pack orchestrates a team of specialized agents to support legal workflows while maintaining strict privilege protection and citation accuracy.

## Agents

### legal_pack_manager
**Role**: Legal Operations Orchestrator

Coordinates all legal agents and manages legal workflows. Ensures privilege protection and citation verification across all outputs.

**Key Capabilities**:
- Legal workflow orchestration
- Privilege protection oversight
- Citation verification
- Human review coordination

### legal_attorney
**Role**: Legal Document Drafting Specialist

Expert in drafting legal documents with proper citations and formatting.

**Key Capabilities**:
- Motion drafting
- Contract review
- Legal memo creation
- Bluebook citation
- Argument development

### legal_discovery
**Role**: eDiscovery Specialist

Expert in document review and discovery production.

**Key Capabilities**:
- Document review
- Relevance assessment
- Responsiveness tagging
- Production management
- ESI protocol development

### legal_privilege
**Role**: Privilege Protection Specialist

Expert in identifying and protecting privileged materials.

**Key Capabilities**:
- Privilege identification
- Privilege log creation
- Work product protection
- Clawback processing
- Waiver prevention

### legal_evidence
**Role**: Evidence Management Specialist

Expert in organizing and presenting evidence for litigation.

**Key Capabilities**:
- Evidence cataloging
- Exhibit preparation
- Authentication analysis
- Chain of custody tracking
- Evidence classification

### legal_timeline
**Role**: Case Timeline Specialist

Expert in constructing accurate case timelines from documents.

**Key Capabilities**:
- Chronology construction
- Key event identification
- Document-to-event mapping
- Timeline visualization
- Gap identification

### legal_research
**Role**: Legal Research Specialist

Expert in legal research with verified citations.

**Key Capabilities**:
- Case law research
- Statutory research
- Regulatory analysis
- Precedent identification
- Citation verification

## Workflow

```
Case Intake -> Research -> Discovery -> Privilege Review -> Evidence Org -> Timeline -> Drafting
                  |            |              |                 |              |           |
                  |            <- Privilege Check Loop ---------+              |           |
                  <---------------------- Human Review Required ---------------+-----------+
```

### Typical Flow

1. **Case Analysis**: Pack manager analyzes case requirements
2. **Legal Research**: Research agent gathers precedents
3. **Document Review**: Discovery agent reviews documents
4. **Privilege Protection**: Privilege agent identifies privileged materials
5. **Evidence Organization**: Evidence agent catalogs exhibits
6. **Timeline Construction**: Timeline agent builds chronology
7. **Document Drafting**: Attorney agent drafts motions/memos

## Gates

| Gate ID | Description | Type | Threshold |
|---------|-------------|------|-----------|
| `gate.security.privilege` | Privilege protection check | Security | 100% |
| `gate.quality.citation` | Citation verification | Quality | 99% |
| `gate.compliance.ethics` | Ethics compliance | Compliance | 100% |
| `gate.approval.attorney` | Attorney review required | Approval | Required |

## Forbidden Operations

- **court_filing**: No autonomous court filings
- **client_communication_direct**: No direct client contact
- **privilege_waiver**: No privilege waiver actions

## MCP Servers

| Server | Purpose | Priority |
|--------|---------|----------|
| `supabase` | Case data storage | Critical |
| `westlaw` | Legal research | Critical |
| `lexisnexis` | Legal research (fallback) | High |
| `relativity` | eDiscovery platform | High |

## Example Usage

### Discovery Document Review

```yaml
task:
  type: legal.discovery_review
  input:
    case_id: "2024-CV-12345"
    document_count: 500
    review_criteria:
      - relevance
      - privilege
      - responsiveness
```

### Motion Drafting

```yaml
task:
  type: legal.motion_draft
  input:
    case_id: "2024-CV-12345"
    motion_type: "summary_judgment"
    moving_party: "Defendant"
    arguments:
      - "No genuine dispute of fact"
      - "Statute of limitations"
```

## Quality Metrics

| Metric | Target |
|--------|--------|
| Privilege Protection | 100% |
| Citation Accuracy | 100% |
| Discovery Completeness | 100% |
| Research Thoroughness | >95% |

## Security Considerations

- Privilege must never be waived
- All court filings require attorney approval
- Work product doctrine enforced
- No unauthorized privilege disclosure
- Citation verification mandatory

## Related Documentation

- [Architecture Overview](../architecture.md)
- [Ethics Standards](../standards/ethics.md)
- [Eval Framework](../standards/evals_framework.md)
