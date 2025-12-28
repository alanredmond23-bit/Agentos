# Research Pack

The Research Pack provides AI agents for comprehensive research, information verification, and knowledge synthesis.

## Agents

### research_pack_manager
Coordinates research agents and manages multi-source research workflows.

### research_searcher
- Multi-source information gathering
- Web search integration
- Academic database access
- News and media monitoring
- Source discovery and tracking

### research_verifier
- Fact-checking and verification
- Source credibility assessment
- Cross-reference validation
- Claim analysis
- Citation verification

### research_synthesizer
- Information synthesis and summarization
- Insight extraction
- Report generation
- Knowledge graph building
- Trend identification

## Workflow

```
Query -> Search -> Verify -> Synthesize -> Report
    |                                        |
    <---------- Iteration Loop --------------+
```

## Gates

- `gate.quality.source_credibility`: Source credibility check
- `gate.quality.verification`: Fact verification threshold
- `gate.quality.synthesis`: Synthesis quality check

## Example Usage

```yaml
task:
  type: research.comprehensive
  input:
    topic: "AI agent frameworks comparison"
    scope:
      - academic_papers
      - industry_reports
      - technical_documentation
    depth: "deep"
    output_format: "executive_summary"
```
