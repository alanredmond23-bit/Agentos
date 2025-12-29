# Left To Do

## ✅ COMPLETED (v0.2.0 - 2024-12-28)

### LLM Adapters (3,843 lines)
- [x] Anthropic adapter (717 lines) - streaming, tool calling
- [x] OpenAI adapter (703 lines) - streaming, tool calling
- [x] Gemini adapter (1,237 lines) - multi-modal, safety settings
- [x] DeepSeek adapter (1,186 lines) - context caching (90% savings), FIM

### Storage Layer (3,619 lines)
- [x] ObjectStore base interface (1,619 lines) - streaming, batch ops
- [x] S3-compatible provider (1,102 lines) - AWS, R2, MinIO
- [x] Supabase Storage (898 lines) - RLS, image transforms

### Webhook Providers (2,481 lines)
- [x] Generic HMAC (437 lines) - configurable, replay prevention
- [x] Stripe (603 lines) - stripe-signature verification
- [x] Twilio (623 lines) - X-Twilio-Signature
- [x] Sinch (818 lines) - full implementation

### Agent Packs (98 agents across 16 packs)
- [x] Production: Product, Marketing, Supabase, Engineering, Design (30 agents)
- [x] Beta: DevOps, QA, Legal, Mobile (24 agents)
- [x] Alpha: Research, Planning, Analytics, Orchestration, Error Predictor (30 agents)
- [x] Bonus: Finance, Lead Faucet (14 agents)

### Core Runtime (13,000+ lines)
- [x] Task router with saga pattern
- [x] Model router with provider fallbacks
- [x] Gate evaluation system
- [x] Approval workflow stubs
- [x] Security module (rate limiting, RBAC)

---

## 🚧 Priority 1 - Enhanced Core (Optional)

- [ ] Polling for condition-based waits in task_router
- [ ] Full idempotency layer with persistence
- [ ] Enhanced approval workflow UI hooks

## 🚧 Priority 2 - Evals Framework

- [ ] Build eval runner with parallel execution
- [ ] Create golden task datasets for each pack
- [ ] Implement adversarial test suites
- [ ] Add regression detection for pack updates
- [ ] Provider comparison benchmarks

## 🚧 Priority 3 - Ops Console (React/Next.js)

- [ ] Real-time agent activity dashboard
- [ ] Approval queue interface
- [ ] Kill switch controls
- [ ] Audit log viewer
- [ ] Cost tracking per agent/pack

## 🚧 Priority 4 - Security & Compliance

- [ ] PII redaction pipeline
- [ ] RLS helper utilities for agents
- [ ] Secret rotation system
- [ ] TCPA/CTIA compliance gates
- [ ] SOC2 audit logging

## 🚧 Priority 5 - Documentation

- [ ] Complete architecture diagrams
- [ ] Write runbooks for all operations
- [ ] Document YAML schema fully (JSON Schema exists)
- [ ] Create onboarding guide
- [ ] Record video walkthroughs

---

## Project Statistics

| Category | Count | Lines |
|----------|-------|-------|
| TypeScript files | 43 | 22,330 |
| Agent YAMLs | 98 | ~25,000 |
| Total files | 236 | ~50,000 |
| Agent packs | 16 | - |

**Status: Core platform complete. Ready for evals, console, and production hardening.**
