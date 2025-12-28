# Marketing Pack

> Production-ready pack for marketing campaigns, content creation, SEO, and social media management.

## Pack Overview

| Property | Value |
|----------|-------|
| **Pack ID** | `pack.core.marketing.v1` |
| **Domain** | Marketing |
| **Version** | 1.0.0 |
| **Lifecycle** | Production |
| **Agents** | 7 |
| **Manager** | `agent.marketing.pack_manager.v1` |

## Purpose

The Marketing Pack provides AI-powered marketing automation covering content creation, SEO optimization, social media management, email campaigns, and analytics. Drive growth with intelligent marketing workflows.

## Agents

### Pack Manager
- **ID**: `agent.marketing.pack_manager.v1`
- **Role**: Orchestrates all marketing agents and routes tasks
- **Keyboard**: `Cmd+Shift+M`

### Content Writer
- **ID**: `agent.marketing.content_writer.v1`
- **Role**: Creates blog posts, articles, landing page copy
- **Outputs**: Blog posts, landing pages, ad copy, whitepapers
- **Keyboard**: `Cmd+Shift+1`

### SEO Specialist
- **ID**: `agent.marketing.seo.v1`
- **Role**: Optimizes content for search engines
- **Outputs**: Keyword research, meta tags, content optimization
- **Keyboard**: `Cmd+Shift+2`

### Social Media Manager
- **ID**: `agent.marketing.social_media.v1`
- **Role**: Creates and schedules social media content
- **Outputs**: Posts, threads, stories, content calendars
- **Keyboard**: `Cmd+Shift+3`

### Email Marketer
- **ID**: `agent.marketing.email.v1`
- **Role**: Creates email campaigns and sequences
- **Outputs**: Email copy, drip campaigns, newsletters
- **Keyboard**: `Cmd+Shift+4`

### Marketing Analytics
- **ID**: `agent.marketing.analytics.v1`
- **Role**: Analyzes marketing performance
- **Outputs**: Campaign reports, attribution analysis, ROI calculations
- **Keyboard**: `Cmd+Shift+5`

### Campaign Manager
- **ID**: `agent.marketing.campaign.v1`
- **Role**: Plans and executes multi-channel campaigns
- **Outputs**: Campaign briefs, launch plans, A/B tests
- **Keyboard**: `Cmd+Shift+6`

## Integrations

| Integration | Purpose | Priority |
|------------|---------|----------|
| **HubSpot** | CRM, marketing automation | Critical |
| **Mailchimp** | Email campaigns | Critical |
| **SEMrush** | SEO and keyword research | High |
| **Hootsuite** | Social media scheduling | High |
| **Google Analytics** | Website analytics | High |
| **Buffer** | Social scheduling | Medium |

## Workflows

### Content Launch
```
1. Content Writer -> Creates draft
2. SEO Specialist -> Optimizes for search
3. Social Media Manager -> Creates promotion posts
4. Email Marketer -> Drafts announcement email
5. Campaign Manager -> Coordinates launch
```

### Campaign Creation
```
1. Campaign Manager -> Creates brief
2. Content Writer -> Produces assets
3. Email Marketer -> Builds sequences
4. Social Media Manager -> Schedules posts
5. Marketing Analytics -> Sets up tracking
```

### Weekly Content Calendar
```
1. Content Writer -> Generates topics
2. SEO Specialist -> Assigns keywords
3. Social Media Manager -> Plans distribution
```

## Usage Examples

### Write Blog Post
```
@marketing Write a blog post about AI in customer service (1500 words, SEO optimized)
```

### Create Email Sequence
```
@marketing Create a 5-email welcome sequence for new subscribers
```

### Social Campaign
```
@marketing Create a Twitter thread promoting our new feature launch
```

### SEO Audit
```
@marketing Run SEO analysis on our landing page and suggest improvements
```

## Model Configuration

| Task Class | Primary Model | Temperature | Max Tokens |
|-----------|---------------|-------------|------------|
| Content Writing | claude-4-opus | 0.7 | 16000 |
| SEO Analysis | gpt-5 | 0.2 | 4000 |
| Social Posts | claude-4-sonnet | 0.8 | 2000 |
| Email Copy | claude-4-sonnet | 0.6 | 8000 |
| Analytics | gpt-5-mini | 0.1 | 4000 |

## Persona Styles

| Agent | Tone | Style |
|-------|------|-------|
| Content Writer | Professional, engaging | Long-form narrative |
| Social Media | Casual, witty | Short, punchy |
| Email Marketer | Friendly, persuasive | Conversational |
| SEO Specialist | Technical, precise | Data-driven |

## Quality Gates

- All content passes plagiarism check
- SEO content meets minimum keyword density
- Email subject lines A/B tested
- Social posts reviewed for brand voice

## Cost Estimate

| Agent | Avg Cost/Task | Monthly Estimate |
|-------|---------------|------------------|
| Content Writer | $0.30 | $90-150 |
| SEO Specialist | $0.12 | $30-50 |
| Social Media | $0.05 | $50-80 |
| Email Marketer | $0.15 | $40-70 |
| Analytics | $0.08 | $20-40 |
| Campaign | $0.20 | $40-60 |
| **Total** | | **$270-450** |

## Getting Started

1. Configure integrations:
   - `HUBSPOT_API_KEY`
   - `MAILCHIMP_API_KEY`
   - `SEMRUSH_API_KEY`
2. Activate pack: `@marketing activate`
3. Start with: `@marketing help`

## Brand Voice Settings

Configure in `config/brand_voice.yaml`:
```yaml
tone: professional_friendly
formality: medium
industry: technology
target_audience: B2B_decision_makers
```

## Dependencies

None - this is a standalone pack.

## Changelog

### v1.0.0 (2025-12-28)
- Initial production release
- 7 agents fully operational
- HubSpot, Mailchimp integrations verified
- Brand voice customization enabled
