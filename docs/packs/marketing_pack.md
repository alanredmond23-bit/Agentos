# Marketing Pack

The Marketing Pack provides AI agents for campaign management, messaging, and compliance-focused marketing automation.

## Agents

### marketing_pack_manager
Coordinates marketing agents and ensures campaign coherence.

### marketing_campaign_brief
- Campaign objective definition
- Target audience specification
- Channel strategy
- Budget allocation

### marketing_offer_strategy
- Offer creation and positioning
- Discount/promotion structures
- Value proposition crafting
- Urgency/scarcity tactics

### marketing_segmentation
- Audience segmentation
- Persona development
- Behavioral targeting
- Lookalike modeling specs

### marketing_copy_library
- Message variant generation
- A/B test copy creation
- Brand voice consistency
- Multi-channel adaptation

### marketing_cadence_orchestration
- Drip campaign design
- Timing optimization
- Frequency capping
- Journey orchestration

### marketing_compliance_trust
- TCPA/CTIA compliance checking
- Opt-out handling
- Consent verification
- Privacy regulation adherence

### marketing_twilio_sinch_execution
- SMS/MMS campaign execution
- Provider integration
- Delivery optimization
- Error handling

### marketing_deliverability
- Sender reputation management
- List hygiene recommendations
- Bounce/complaint handling
- Deliverability monitoring

### marketing_reporting_dashboards
- Campaign performance metrics
- ROI calculation
- Attribution modeling
- Executive summaries

### marketing_qa_risk
- Campaign validation
- Risk assessment
- Pre-send checks
- Compliance verification

## Compliance Gates

- `gate.tcpa_ctia`: Telecommunications compliance
- `gate.consent`: Opt-in verification
- `gate.frequency`: Rate limiting checks
- `gate.content`: Prohibited content scanning

## Example Usage

```yaml
task:
  type: marketing.campaign
  input:
    objective: "Re-engagement"
    segment: "Dormant users 30+ days"
    channels: ["sms", "email"]
    offer: "20% comeback discount"
    duration_days: 14
```
