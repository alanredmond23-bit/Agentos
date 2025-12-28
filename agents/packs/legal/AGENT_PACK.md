# Legal Pack

The Legal Pack provides AI agents for legal research, document analysis, privilege detection, evidence management, and timeline construction.

## Agents

### legal_pack_manager
Coordinates legal agents and manages case workflows with privilege protection.

### legal_attorney
- Legal strategy development
- Motion drafting
- Brief writing
- Argument construction
- Settlement analysis

### legal_discovery
- Document discovery and processing
- OCR and text extraction
- Entity extraction
- Document classification
- Deduplication

### legal_privilege
- Privilege detection (2-tier)
- Attorney-client privilege
- Work product doctrine
- Privilege log generation
- Waiver risk assessment

### legal_evidence
- Evidence identification
- Exhibit organization
- Foundation analysis
- Admissibility assessment
- Chain of custody tracking

### legal_timeline
- Chronological event mapping
- Date extraction and normalization
- Gap analysis
- Conflict detection
- Timeline visualization

### legal_research
- Case law research
- Statute analysis
- Precedent finding
- Citation verification
- Authority ranking

## Workflow

```
Discovery -> Privilege Review -> Classification -> Analysis -> Research -> Drafting -> Review
    |                                                                                   |
    <------------------------------ Iterative Refinement ------------------------------+
```

## Gates

- `gate.security.privilege`: Privilege protection (CRITICAL)
- `gate.quality.citation`: Citation verification
- `gate.compliance.frcp`: Federal Rules compliance
- `gate.approval.filing`: Human approval for filings

## MCP Servers

- `westlaw`: Legal research database
- `lexisnexis`: Legal research and Shepardizing
- `supabase`: Case document storage

## Example Usage

```yaml
task:
  type: legal.motion_draft
  input:
    motion_type: "motion_to_dismiss"
    case_number: "EDPA 24-376"
    grounds:
      - "lack_of_jurisdiction"
      - "failure_to_state_claim"
    jurisdiction: "3rd_circuit"
```
