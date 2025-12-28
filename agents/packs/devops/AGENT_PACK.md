# DevOps Pack

The DevOps Pack provides AI agents for infrastructure management, CI/CD automation, container orchestration, monitoring, and incident response.

## Agents

### devops_pack_manager
Coordinates all DevOps agents and manages infrastructure workflows.

### devops_terraform
- Infrastructure as Code with Terraform
- Multi-cloud provisioning (AWS, GCP, Azure)
- State management and locking
- Module development and versioning
- Drift detection and remediation

### devops_kubernetes
- Kubernetes cluster management
- Helm chart development
- Pod and deployment configuration
- Service mesh integration
- Resource optimization

### devops_cicd
- GitHub Actions workflow design
- Pipeline optimization
- Build caching strategies
- Deployment automation
- Feature flag integration

### devops_monitoring
- Observability stack setup
- Metrics collection and dashboards
- Log aggregation
- Distributed tracing
- Custom metric development

### devops_alerting
- Alert rule configuration
- PagerDuty/Opsgenie integration
- Escalation policy design
- Alert fatigue prevention
- SLO/SLI definition

### devops_incident_response
- Incident runbook generation
- Root cause analysis
- Post-mortem documentation
- Recovery automation
- Chaos engineering support

### devops_security
- Infrastructure security hardening
- Secret management
- Network policy configuration
- Compliance scanning
- Vulnerability remediation

## Workflow

```
Planning -> Infrastructure -> CI/CD -> Monitoring -> Alerting -> Incident Response
    |                                                                    |
    <------------------------- Continuous Improvement -------------------+
```

## Gates

- `gate.security.infra`: Infrastructure security scan
- `gate.quality.terraform`: Terraform validation and planning
- `gate.approval.production`: Human approval for production changes
- `gate.compliance.audit`: Compliance requirements check

## MCP Servers

- `github`: Repository and Actions management
- `vercel`: Deployment and domain management
- `supabase`: Database and backend services
- `monitoring`: Observability platforms

## Example Usage

```yaml
task:
  type: devops.infrastructure
  input:
    provider: "aws"
    resources:
      - type: "eks_cluster"
        name: "production"
        node_count: 3
      - type: "rds_instance"
        name: "primary-db"
        engine: "postgres"
    environment: "production"
```
