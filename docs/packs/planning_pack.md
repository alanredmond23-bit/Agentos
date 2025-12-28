# Planning Pack

The Planning Pack provides AI agents for strategic planning, sprint management, resource allocation, dependency tracking, and risk assessment.

## Overview

The Planning Pack orchestrates a team of specialized agents to create realistic, resource-balanced plans with clear milestones, mapped dependencies, and identified risks.

## Agents

### planning_pack_manager
**Role**: Planning Operations Orchestrator

Coordinates all planning agents and manages the planning lifecycle from roadmapping to sprint execution. Ensures feasibility and stakeholder alignment.

**Key Capabilities**:
- Planning workflow orchestration
- Stakeholder alignment
- Resource coordination
- Timeline management

### planning_roadmap
**Role**: Strategic Roadmap Specialist

Expert in long-term planning and quarterly roadmap creation.

**Key Capabilities**:
- Quarterly/annual roadmap creation
- OKR alignment
- Theme identification
- Milestone definition
- Success metrics

### planning_sprint
**Role**: Sprint Planning Specialist

Expert in agile sprint planning and backlog management.

**Key Capabilities**:
- Sprint planning facilitation
- Backlog grooming
- Story estimation
- Velocity tracking
- Commitment setting

### planning_resource
**Role**: Resource Allocation Specialist

Expert in team capacity planning and workload optimization.

**Key Capabilities**:
- Capacity calculation
- Workload balancing
- Skill-based assignment
- Utilization optimization
- Conflict resolution

### planning_dependency
**Role**: Dependency Mapping Specialist

Expert in identifying and managing project dependencies.

**Key Capabilities**:
- Dependency graphing
- Critical path analysis
- Blocking issue identification
- Cross-team coordination
- Parallel work identification

### planning_risk
**Role**: Risk Assessment Specialist

Expert in identifying and mitigating project risks.

**Key Capabilities**:
- Risk identification
- Impact assessment
- Mitigation planning
- Contingency development
- Risk monitoring

## Workflow

```
Objectives -> Roadmapping -> Resource Allocation -> Dependency Mapping -> Risk Assessment -> Execution
                  |                  |                    |                    |
                  <---- Iteration Loop for Feasibility ----+--------------------+
```

### Typical Flow

1. **Objective Analysis**: Pack manager gathers stakeholder objectives
2. **Roadmapping**: Roadmap agent creates timeline with milestones
3. **Resource Planning**: Resource agent allocates team capacity
4. **Dependency Mapping**: Dependency agent identifies blockers
5. **Risk Assessment**: Risk agent evaluates and plans mitigations
6. **Finalization**: Pack manager produces integrated plan

## Gates

| Gate ID | Description | Type | Threshold |
|---------|-------------|------|-----------|
| `gate.feasibility.resource` | Resource availability check | Feasibility | 100% |
| `gate.feasibility.dependency` | No unresolved blockers | Feasibility | 100% |
| `gate.quality.risk_coverage` | All risks mitigated | Quality | 90% |
| `gate.approval.stakeholder` | Stakeholder sign-off | Approval | Required |

## MCP Servers

| Server | Purpose | Priority |
|--------|---------|----------|
| `supabase` | Planning data storage | Critical |
| `linear` | Issue tracking | High |
| `github` | Sprint tracking | High |
| `slack` | Stakeholder communication | Medium |

## Example Usage

### Quarterly Roadmap

```yaml
task:
  type: planning.quarterly_roadmap
  input:
    quarter: "Q1 2025"
    objectives:
      - "Launch mobile app v2.0"
      - "Implement AI engine"
    constraints:
      team_size: 25
      budget: "$500,000"
```

### Sprint Planning

```yaml
task:
  type: planning.sprint
  input:
    sprint_duration: "2 weeks"
    team_capacity: 50
    backlog:
      - id: "FEAT-101"
        estimate: 13
        priority: "high"
```

## Quality Metrics

| Metric | Target |
|--------|--------|
| Capacity Utilization | 80-95% |
| Dependency Resolution | 100% |
| Risk Coverage | >90% |
| Deadline Achievement | >95% |

## Security Considerations

- Capacity limits must be respected
- Dependencies cannot be bypassed
- Risks must be documented and tracked
- Stakeholder approval required for major changes

## Related Documentation

- [Architecture Overview](../architecture.md)
- [Quality Standards](../standards/gates.md)
- [Eval Framework](../standards/evals_framework.md)
