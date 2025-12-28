# Engineering Pack

> Production-ready pack for software development, architecture, code analysis, and performance optimization.

## Pack Overview

| Property | Value |
|----------|-------|
| **Pack ID** | `pack.core.engineering.v1` |
| **Domain** | Software Engineering |
| **Version** | 1.0.0 |
| **Lifecycle** | Production |
| **Agents** | 8 |
| **Manager** | `agent.engineering.pack_manager.v1` |

## Purpose

The Engineering Pack is the core development powerhouse of AgentOS. It provides specialized agents for feature development, architecture design, code analysis, performance optimization, and system integration. This pack follows engineering best practices and produces production-quality code.

## Agents

### Pack Manager
- **ID**: `agent.engineering.pack_manager.v1`
- **Role**: Orchestrates all engineering agents and routes tasks
- **Keyboard**: `Cmd+Shift+E`

### Product Developer
- **ID**: `agent.engineering.product_developer.v1`
- **Role**: Builds features end-to-end with TypeScript/React/Next.js
- **Outputs**: Components, pages, APIs, full features
- **Keyboard**: `Cmd+Shift+F`
- **Voice**: "Feature Bot"

### Architecture
- **ID**: `agent.engineering.architecture.v1`
- **Role**: Designs system architecture and technical specifications
- **Outputs**: Architecture docs, system diagrams, ADRs
- **Keyboard**: `Cmd+Shift+W`
- **Voice**: "Architecture Bot"

### Code Analysis
- **ID**: `agent.engineering.code_analysis.v1`
- **Role**: Reviews code quality, security, and best practices
- **Outputs**: Code reviews, security audits, refactor suggestions
- **Keyboard**: `Cmd+Shift+Q`
- **Voice**: "Code Analysis Bot"

### Performance
- **ID**: `agent.engineering.performance.v1`
- **Role**: Optimizes application performance
- **Outputs**: Lighthouse audits, bundle analysis, query optimization
- **Keyboard**: `Cmd+Shift+Y`
- **Voice**: "Performance Bot"

### Plumber
- **ID**: `agent.engineering.plumber.v1`
- **Role**: Builds integrations, webhooks, and data pipelines
- **Outputs**: API integrations, webhooks, sync mechanisms
- **Keyboard**: `Cmd+Shift+I`
- **Voice**: "Plumber Bot"

### Refactor
- **ID**: `agent.engineering.refactor.v1`
- **Role**: Refactors code for maintainability
- **Outputs**: Refactored code, design patterns, tech debt reduction
- **Keyboard**: `Cmd+Shift+R`

### Debugger
- **ID**: `agent.engineering.debugger.v1`
- **Role**: Diagnoses and fixes bugs
- **Outputs**: Bug fixes, root cause analysis, regression tests
- **Keyboard**: `Cmd+Shift+D`

## Integrations

| Integration | Purpose | Priority |
|------------|---------|----------|
| **GitHub** | Version control, PRs, issues | Critical |
| **VS Code** | IDE integration | Critical |
| **Sentry** | Error monitoring | High |
| **Vercel** | Deployment | High |
| **Jest** | Testing | High |
| **ESLint** | Code linting | Medium |

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React, Next.js 15, TypeScript, Tailwind CSS |
| **Backend** | Node.js, Supabase, Edge Functions |
| **Database** | PostgreSQL, Supabase |
| **Testing** | Jest, Playwright, Vitest |
| **Build** | Turbo, Webpack, SWC |

## Workflows

### Feature Development
```
1. Architecture -> Designs solution
2. Product Developer -> Implements feature
3. Code Analysis -> Reviews code
4. Performance -> Optimizes if needed
5. QA Pack -> Writes tests
```

### Code Review
```
1. Code Analysis -> Security audit
2. Code Analysis -> Best practices check
3. Performance -> Performance impact
4. Code Analysis -> Final approval
```

### Bug Fix
```
1. Debugger -> Diagnoses issue
2. Debugger -> Implements fix
3. Code Analysis -> Reviews fix
4. QA Pack -> Adds regression test
```

### Integration
```
1. Architecture -> Designs integration
2. Plumber -> Builds webhooks/APIs
3. Code Analysis -> Security review
4. Performance -> Load testing
```

## Usage Examples

### Build Feature
```
@engineering Build a user profile page with avatar upload and bio editing
```

### Architecture Review
```
@engineering Review the authentication architecture and suggest improvements
```

### Code Review
```
@engineering Review PR #123 for security and best practices
```

### Performance Audit
```
@engineering Run Lighthouse audit on the dashboard and fix critical issues
```

### Build Integration
```
@engineering Create a Stripe webhook handler for subscription events
```

### Debug Issue
```
@engineering Debug the checkout flow - users are getting 500 errors on submit
```

## Model Configuration

| Task Class | Primary Model | Temperature | Max Tokens |
|-----------|---------------|-------------|------------|
| Feature Dev | claude-4-opus | 0.3 | 16000 |
| Architecture | claude-4-opus | 0.4 | 12000 |
| Code Analysis | claude-4-sonnet | 0.1 | 8000 |
| Performance | gpt-5 | 0.2 | 4000 |
| Integration | claude-4-sonnet | 0.2 | 8000 |
| Debugging | claude-4-opus | 0.2 | 12000 |

## Code Standards

### TypeScript
```typescript
// Always use strict types
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Date;
}

// Use async/await, handle errors
async function fetchUser(id: string): Promise<UserProfile> {
  try {
    const response = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (response.error) throw response.error;
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}
```

### React Components
```typescript
// Use functional components with proper typing
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({
  variant,
  size = 'md',
  children,
  onClick,
  disabled
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }))}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

## Quality Gates

- All code passes ESLint and Prettier
- TypeScript strict mode enabled
- Unit test coverage > 80%
- No critical security vulnerabilities
- Performance budget met
- Accessibility WCAG 2.1 AA compliant

## Error Handling

```typescript
// Standard error handling pattern
import { AppError, ErrorCode } from '@/lib/errors';

try {
  // operation
} catch (error) {
  if (error instanceof AppError) {
    // Handle known errors
    logger.warn({ code: error.code, message: error.message });
  } else {
    // Handle unknown errors
    logger.error({ error, context: 'operation_name' });
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Operation failed');
  }
}
```

## Cost Estimate

| Agent | Avg Cost/Task | Monthly Estimate |
|-------|---------------|------------------|
| Product Developer | $0.40 | $200-400 |
| Architecture | $0.35 | $50-100 |
| Code Analysis | $0.15 | $75-150 |
| Performance | $0.12 | $30-60 |
| Plumber | $0.20 | $40-80 |
| Refactor | $0.25 | $50-100 |
| Debugger | $0.30 | $60-120 |
| **Total** | | **$505-1010** |

## Getting Started

1. Configure integrations:
   - `GITHUB_TOKEN`
   - `SENTRY_DSN`
   - `VERCEL_TOKEN`
2. Activate pack: `@engineering activate`
3. Start with: `@engineering help`

## Dependencies

- **Requires**: `pack.core.design.v1` (for UI components)
- **Recommended**: `pack.core.qa.v1` (for testing)

## Changelog

### v1.0.0 (2025-12-28)
- Initial production release
- 8 agents fully operational
- GitHub, VS Code integrations verified
- TypeScript/React best practices embedded
