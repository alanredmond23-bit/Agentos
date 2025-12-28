# Research Pack

The Research Pack provides AI agents for comprehensive research operations, including multi-source searching, fact verification, and synthesized report generation.

## Overview

The Research Pack orchestrates a team of specialized agents to conduct rigorous research with verified sources, ensuring accuracy and objectivity in all outputs.

## Agents

### research_pack_manager
**Role**: Research Operations Orchestrator

Coordinates all research agents and manages the research pipeline from search to synthesis. Ensures source verification and maintains research quality standards.

**Key Capabilities**:
- Research workflow orchestration
- Source quality management
- Synthesis coordination
- Citation verification oversight

### research_searcher
**Role**: Multi-Source Search Specialist

Expert in comprehensive source discovery across academic, industry, and web sources.

**Key Capabilities**:
- Multi-database search (academic, industry, news)
- Boolean query optimization
- Source relevance ranking
- Citation chain following
- Recency filtering

### research_verifier
**Role**: Source Verification Specialist

Expert in fact-checking and source credibility assessment.

**Key Capabilities**:
- Source credibility scoring
- Fact cross-referencing
- Data accuracy validation
- Bias detection
- Recency verification

### research_synthesizer
**Role**: Research Synthesis Specialist

Expert in combining multiple sources into coherent, actionable reports.

**Key Capabilities**:
- Multi-source synthesis
- Theme extraction
- Insight generation
- Citation formatting
- Executive summary creation

## Workflow

```
Search Request -> Multi-Source Search -> Verification -> Synthesis -> Final Report
                       |                      |              |
                       |    <-- Rejection Loop if unverified |
                       <-------------------------------------|
```

### Typical Flow

1. **Request Analysis**: Pack manager analyzes research requirements
2. **Source Search**: Searcher discovers relevant sources across databases
3. **Verification**: Verifier checks source credibility and fact accuracy
4. **Synthesis**: Synthesizer combines verified sources into cohesive report
5. **Quality Review**: Final citation verification and completeness check

## Gates

| Gate ID | Description | Type | Threshold |
|---------|-------------|------|-----------|
| `gate.quality.citation` | Citation accuracy check | Quality | 100% |
| `gate.quality.verification` | Source verification | Quality | 100% |
| `gate.quality.synthesis` | Synthesis completeness | Quality | 95% |
| `gate.objectivity.bias` | Bias detection | Quality | 95% |

## MCP Servers

| Server | Purpose | Priority |
|--------|---------|----------|
| `supabase` | Research data storage | Critical |
| `perplexity` | Web search | High |
| `arxiv` | Academic papers | High |
| `github` | Documentation storage | Medium |

## Example Usage

### Market Research Report

```yaml
task:
  type: research.market_analysis
  input:
    topic: "AI Agent Framework Market 2024-2028"
    scope:
      - market_size
      - key_players
      - trends
    requirements:
      sources_minimum: 10
      recency: "last_12_months"
      verification: true
```

### Competitive Intelligence

```yaml
task:
  type: research.competitive_analysis
  input:
    target: "Acme Tech"
    competitors:
      - "Competitor A"
      - "Competitor B"
    dimensions:
      - product_offerings
      - pricing
      - market_positioning
```

## Quality Metrics

| Metric | Target |
|--------|--------|
| Source Verification Rate | 100% |
| Citation Accuracy | 100% |
| Synthesis Completeness | >95% |
| Objectivity Score | >95% |

## Security Considerations

- All sources must be verified before inclusion
- No fabricated citations allowed
- Bias must be disclosed when detected
- Confidential sources require authorization

## Related Documentation

- [Architecture Overview](../architecture.md)
- [Quality Standards](../standards/gates.md)
- [Eval Framework](../standards/evals_framework.md)
