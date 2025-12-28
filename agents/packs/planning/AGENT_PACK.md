# Planning Pack

The Planning Pack provides AI agents for strategic planning, roadmapping, sprint planning, and resource management.

## Agents

### planning_pack_manager
Coordinates planning agents and manages planning workflows across different timeframes.

### planning_roadmap
- Strategic roadmap creation
- Milestone definition
- Timeline visualization
- Goal alignment
- Stakeholder communication

### planning_sprint
- Sprint planning assistance
- Story breakdown
- Capacity planning
- Velocity tracking
- Sprint review preparation

### planning_resource
- Resource allocation optimization
- Team capacity management
- Skill matrix management
- Workload balancing
- Availability tracking

### planning_dependency
- Dependency mapping
- Critical path analysis
- Blocker identification
- Integration planning
- Cross-team coordination

### planning_risk
- Risk identification
- Risk assessment matrix
- Mitigation planning
- Contingency development
- Risk monitoring

## Workflow

```
Strategy -> Roadmap -> Sprint Planning -> Resource Allocation -> Dependency Analysis -> Risk Assessment
    |                                                                                          |
    <------------------------------ Continuous Refinement ------------------------------------+
```

## Gates

- `gate.quality.roadmap`: Roadmap completeness check
- `gate.approval.milestone`: Milestone approval
- `gate.quality.capacity`: Capacity validation

## Example Usage

```yaml
task:
  type: planning.roadmap
  input:
    timeframe: "Q1-Q2 2025"
    goals:
      - "Launch mobile app"
      - "Expand to European market"
      - "Achieve SOC2 compliance"
    teams:
      - engineering
      - product
      - security
```
