# DevOps Pack

The DevOps Pack provides AI agents for infrastructure management, CI/CD automation, container orchestration, monitoring, and incident response.

## Overview

The DevOps Pack orchestrates infrastructure and deployment workflows through specialized agents, enabling reliable, automated, and secure operations.

## Agents

### devops_pack_manager
**Role**: Infrastructure Architect & Deployment Orchestrator

Coordinates all DevOps agents and manages infrastructure workflows. Routes tasks to appropriate specialists and ensures reliable operations.

**Key Capabilities**:
- Workflow orchestration
- Agent delegation
- Incident coordination
- Quality aggregation

### devops_terraform
**Role**: Infrastructure as Code Specialist

Expert in Terraform for multi-cloud infrastructure provisioning.

**Key Capabilities**:
- Terraform configuration generation
- Module development
- State management guidance
- Drift detection
- Cost estimation

### devops_kubernetes
**Role**: Container Orchestration Specialist

Expert in Kubernetes cluster management and Helm charts.

**Key Capabilities**:
- Kubernetes manifest generation
- Helm chart development
- Resource optimization
- Security policy configuration
- Service mesh integration

### devops_cicd
**Role**: Pipeline Automation Specialist

Expert in CI/CD pipeline design and optimization.

**Key Capabilities**:
- GitHub Actions workflows
- Pipeline optimization
- Build caching strategies
- Deployment automation
- Rollback configuration

### devops_monitoring
**Role**: Observability Specialist

Expert in monitoring, metrics, and distributed tracing.

**Key Capabilities**:
- Dashboard creation
- Metric definition
- Log query design
- Distributed tracing setup
- SLI/SLO definition

### devops_alerting
**Role**: Alert Management Specialist

Expert in actionable alerting and escalation policies.

**Key Capabilities**:
- Alert rule configuration
- Escalation policy design
- SLO alignment
- Alert fatigue prevention
- PagerDuty/Opsgenie integration

### devops_incident_response
**Role**: Incident Management Specialist

Expert in incident response, runbooks, and post-mortems.

**Key Capabilities**:
- Runbook generation
- Root cause analysis
- Post-mortem documentation
- Recovery planning
- Chaos engineering design

### devops_security
**Role**: Infrastructure Security Specialist

Expert in infrastructure security and compliance.

**Key Capabilities**:
- Security scanning
- Policy generation
- Compliance checking
- Hardening recommendations
- Secret management guidance

## Workflow

```
Planning -> Infrastructure -> CI/CD -> Monitoring -> Alerting -> Incident Response
    |                                                                    |
    <------------------------- Continuous Improvement -------------------+
```

## Gates

| Gate ID | Description | Type | Threshold |
|---------|-------------|------|-----------|
| `gate.security.infra` | Infrastructure security scan | Security | 95% |
| `gate.quality.terraform` | Terraform validation | Quality | 100% |
| `gate.approval.production` | Human approval for production | Approval | Required |
| `gate.compliance.audit` | Compliance requirements | Compliance | 100% |

## Example Usage

### CI/CD Pipeline

```yaml
task:
  type: devops.cicd
  input:
    project_type: "typescript_fullstack"
    platform: "github_actions"
    stages:
      - lint
      - test
      - build
      - deploy
    environments:
      - staging
      - production
```

### Terraform Infrastructure

```yaml
task:
  type: devops.terraform
  input:
    provider: "aws"
    resources:
      - type: "eks_cluster"
        name: "production"
        node_count: 3
    environment: "production"
```

### Incident Runbook

```yaml
task:
  type: devops.incident_runbook
  input:
    incident_type: "database_connection_failure"
    services:
      - api
      - worker
    severity: "high"
```

## Security Considerations

- Agents cannot apply changes to production directly
- Secret creation requires human approval
- All infrastructure changes generate plans for review
- Security scanning is mandatory for all configurations

## Related Documentation

- [Architecture Overview](../architecture.md)
- [Security Standards](../standards/gates.md)
