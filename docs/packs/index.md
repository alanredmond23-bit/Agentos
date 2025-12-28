# Agent Packs Index

Agent Packs are domain-specific collections of AI agents designed to work together on related tasks. Each pack contains:

- **Pack Manager**: Coordinates agents within the pack
- **Specialized Agents**: Task-specific workers with defined capabilities
- **Shared Tools**: Common utilities used by pack agents
- **Gates**: Quality and security checkpoints
- **Evals**: Test suites for reliability validation

## Available Packs

### Production Ready

| Pack | Agents | Description |
|------|--------|-------------|
| [Product](product_pack.md) | 8 | Product discovery, PRDs, specs, and delivery |
| [Marketing](marketing_pack.md) | 11 | Campaigns, SMS/MMS, compliance, deliverability |
| [Supabase](supabase_pack.md) | 11 | Schema, RLS, Edge Functions, observability |
| [Engineering](engineering_pack.md) | 9 | Implementation, testing, CI/CD, releases |
| [Design](design_pack.md) | 12 | UX research, UI specs, component libraries |

### In Development

| Pack | Status | Description |
|------|--------|-------------|
| [Mobile](mobile_pack.md) | Building | React Native, iOS, Android development |
| [DevOps](devops_pack.md) | Building | Infrastructure, Terraform, Kubernetes |
| [Research](research_pack.md) | Building | Market analysis, competitive intelligence |
| [Planning](planning_pack.md) | Building | Roadmaps, sprints, resource allocation |
| [Error Predictor](error_predictor_pack.md) | Building | Failure prediction and prevention |
| [Finance](finance_pack.md) | Building | Budgets, invoicing, financial reporting |
| [Legal](legal_pack.md) | Building | Contracts, compliance, risk assessment |
| [Lead Faucet](lead_faucet_pack.md) | Building | Lead generation and qualification |

## Pack Structure

Each pack follows this structure:

```
packs/{pack_name}/
  AGENT_PACK.md          # Pack overview and agent descriptions
  agents/
    {pack}_pack_manager.yaml
    {pack}_{agent_1}.yaml
    {pack}_{agent_2}.yaml
    ...
```

## Creating New Packs

1. Create pack directory under `agents/packs/`
2. Add `AGENT_PACK.md` with pack description
3. Create agent YAML files following schema
4. Register pack in `PACK_REGISTRY.yaml`
5. Add evals in `evals/golden_tasks/{pack}/`
6. Add documentation in `docs/packs/{pack}_pack.md`

## Pack Interactions

Packs can delegate to other packs through the orchestrator:

```yaml
# Example: Product pack delegating to Engineering
delegation:
  target_pack: engineering
  task: implement_feature
  context: ${prd_output}
```

See [pack_registry_graph.md](../diagrams/pack_registry_graph.md) for interaction diagrams.
