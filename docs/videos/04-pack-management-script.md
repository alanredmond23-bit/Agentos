# Video 04: Managing Packs

## Metadata

- **Duration:** 5 minutes
- **Audience:** Intermediate developers and team leads
- **Prerequisites:** Completed Creating Agents (Video 03)
- **Goal:** Understand how to organize, configure, and deploy agent packs

---

## Scene Breakdown

### Scene 1: What Are Packs (0:00 - 0:40)

**Visuals:** Pack registry diagram animating in.

**Narration:**
"In AgentOS, you do not deploy individual agents. You deploy packs. A pack is a domain-specific collection of agents that work together. Think of it like a specialized team: the Product pack has a manager agent, requirements writers, and spec generators. The Marketing pack has campaign planners, compliance checkers, and execution agents."

**Actions:** Show pack diagram with:
- Product Pack: Manager + 5 subagents
- Marketing Pack: Lead + 8 subagents
- Engineering Pack: Architect + 6 subagents

**Narration (continued):**
"This approach gives you consistency, speed, and control. Every team uses the same proven pack, and updates roll out to everyone at once."

---

### Scene 2: Pack Structure (0:40 - 1:20)

**Visuals:** File browser showing pack directory.

**Narration:**
"Let us look at how packs are organized in the codebase."

**Actions:** Navigate to and show:
```
agents/packs/product/
  AGENT_PACK.md
  agents/
    product_pack_manager.yaml
    product_requirements.yaml
    product_prd_writer.yaml
    product_acceptance_criteria.yaml
```

**Narration (continued):**
"Each pack has an AGENT_PACK.md file that documents what the pack does, its agents, workflows, and gates. The agents directory contains the YAML definitions. The pack manager is the coordinator that routes tasks to the right subagent."

**Actions:** Open AGENT_PACK.md briefly to show structure

---

### Scene 3: Core vs Domain Packs (1:20 - 2:00)

**Visuals:** Pack dependency hierarchy diagram.

**Narration:**
"AgentOS has a pack hierarchy. At the foundation are Core Packs. These are required everywhere and provide identity, memory, observability, model routing, and governance primitives."

**Actions:** Show core packs list:
- pack.core.identity_and_persona.v1
- pack.core.memory_and_audit.v1
- pack.core.observability.v1
- pack.core.model_routing.v1
- pack.core.governance_primitives.v1

**Narration (continued):**
"On top of core packs sit Domain Packs. These are the specialized teams: Product, Marketing, Engineering, Supabase, Design, and more. Domain packs inherit from core packs and add their own agents and workflows."

**Actions:** Show domain packs list with status indicators

---

### Scene 4: Available Packs (2:00 - 2:45)

**Visuals:** Pack index table from documentation.

**Narration:**
"Let us review the packs currently available. Production-ready packs include Product, Marketing, Supabase, Engineering, and Design. These are battle-tested and ready for enterprise use."

**Actions:** Show each pack briefly:
- Product: PRDs, specs, roadmaps
- Marketing: Campaigns, SMS, compliance
- Supabase: Schema, RLS, Edge Functions
- Engineering: Implementation, CI/CD
- Design: UX research, UI specs

**Narration (continued):**
"In development, we have Mobile for React Native and native apps, DevOps for infrastructure, Research for market analysis, Planning for roadmaps, and specialized packs for Finance, Legal, and Lead Generation."

**Actions:** Show "Building" status tags on these packs

---

### Scene 5: Using a Pack (2:45 - 3:30)

**Visuals:** Terminal and Ops Console.

**Narration:**
"To use a pack, you configure it in your project and route tasks to the pack manager."

**Actions:** Show configuration file:
```yaml
# project_config.yaml
active_packs:
  - pack.domain.product_dev.v1
  - pack.domain.engineering.v1

pack_overrides:
  product_dev:
    cost_controls:
      per_run_budget_usd: 5.0
```

**Narration (continued):**
"You can override pack defaults at the project level. Here we are increasing the budget for product tasks. Now let us route a task to the Product pack."

**Actions:** Run command:
```bash
npm run task -- --pack product --type "generate_prd" --input "Build a user dashboard"
```

**Narration (continued):**
"The pack manager receives the task, analyzes it, and delegates to the appropriate subagent. In this case, the PRD writer."

---

### Scene 6: Pack Delegation (3:30 - 4:15)

**Visuals:** Workflow diagram showing cross-pack delegation.

**Narration:**
"Packs can delegate to other packs. When the Product pack finishes a PRD, it can hand off to the Engineering pack for implementation."

**Actions:** Show YAML delegation config:
```yaml
delegation:
  target_pack: engineering
  task: implement_feature
  context: ${prd_output}
  handoff_includes:
    - requirements
    - acceptance_criteria
    - test_plan
```

**Narration (continued):**
"The handoff package ensures the receiving pack has everything it needs. No context is lost between packs."

**Actions:** Show Ops Console with delegation visible in run history

---

### Scene 7: Pack-Level Controls (4:15 - 4:45)

**Visuals:** Kill Switch page in Ops Console.

**Narration:**
"From the Ops Console, you can control packs at runtime. The Kill Switch page lets you enable or disable any pack instantly."

**Actions:** Demonstrate:
1. Navigate to Kill Switch page
2. Show pack toggles
3. Disable a pack (show confirmation)
4. Show activity log of the change

**Narration (continued):**
"This is critical for incident response. If a pack is misbehaving, you can stop it immediately while other packs continue running."

---

### Scene 8: Creating Your Own Pack (4:45 - 5:00)

**Visuals:** Quick checklist on screen.

**Narration:**
"To create your own pack, follow these steps: Create a directory under agents packs, add your AGENT_PACK.md documentation, create agent YAML files, register the pack in the pack registry, add evaluation tests, and document in the docs directory. Check the agent_packs.md documentation for the complete specification."

**Actions:** Show checklist:
1. Create pack directory
2. Add AGENT_PACK.md
3. Create agent YAMLs
4. Register in PACK_REGISTRY.yaml
5. Add evals
6. Add documentation

---

## B-Roll Suggestions

- Team collaboration imagery
- Assembly line metaphor (standardization)
- Dashboard charts updating
- File system navigation

## Graphics Needed

1. Pack hierarchy pyramid diagram
2. Pack composition flowchart
3. Cross-pack delegation arrows
4. Pack status badges (Active, Building, Deprecated)
5. Kill Switch toggle animation
6. Checklist for pack creation

## Call to Action

- **Primary:** Explore the Ops Console (Video 05)
- **Secondary:** Read pack documentation for your domain
- **Tertiary:** Contribute a new pack to the project

## Key Concepts to Reinforce

- Packs provide consistency across teams
- Core packs are always inherited
- Delegation enables complex workflows
- Kill switches provide safety controls

## Demo Data

Prepare demo tasks that show:
- Single pack execution
- Cross-pack delegation
- Pack disable/enable cycle
