# Product Pack

The Product Pack provides AI agents for end-to-end product management, from discovery to delivery.

## Agents

### product_pack_manager
Coordinates all product agents and manages workflow transitions.

### product_discovery
- User research analysis
- Problem statement formulation
- Opportunity identification
- Market sizing

### product_prd
- PRD generation from discovery insights
- Requirements structuring
- Success metrics definition
- Stakeholder alignment docs

### product_ux
- User journey mapping
- Wireframe descriptions
- Interaction patterns
- Usability requirements

### product_tech_spec
- Technical requirements translation
- API contract definitions
- Data model specifications
- Integration requirements

### product_delivery
- Sprint planning assistance
- Story breakdown
- Acceptance criteria writing
- Dependency identification

### product_qa_release
- Test plan generation
- Release checklist creation
- Rollback planning
- Feature flag strategies

### product_metrics
- KPI definition
- Dashboard specifications
- A/B test design
- Success criteria validation

## Workflow

```
Discovery → PRD → UX → Tech Spec → Delivery → QA/Release → Metrics
    ↑                                              |
    └──────────────── Feedback Loop ───────────────┘
```

## Gates

- `quality.prd`: Validates PRD completeness
- `quality.tech_spec`: Validates technical feasibility
- `approval.stakeholder`: Requires human approval for major features

## Example Usage

```yaml
task:
  type: product.discovery
  input:
    problem_area: "User onboarding friction"
    target_segment: "SMB customers"
    data_sources:
      - user_interviews
      - support_tickets
      - analytics
```
