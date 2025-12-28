# Design Pack

> Production-ready pack for UI/UX design, design systems, accessibility, and prototyping.

## Pack Overview

| Property | Value |
|----------|-------|
| **Pack ID** | `pack.core.design.v1` |
| **Domain** | Design |
| **Version** | 1.0.0 |
| **Lifecycle** | Production |
| **Agents** | 5 |
| **Manager** | `agent.design.pack_manager.v1` |

## Purpose

The Design Pack provides AI-powered design capabilities for creating beautiful, accessible, and consistent user interfaces. From component design to full design systems, this pack ensures visual excellence across all products.

## Agents

### Pack Manager
- **ID**: `agent.design.pack_manager.v1`
- **Role**: Orchestrates all design agents and routes tasks
- **Keyboard**: `Cmd+Shift+G`

### UI/UX Designer
- **ID**: `agent.design.uiux.v1`
- **Role**: Creates UI components and user experiences
- **Outputs**: React components, Tailwind styles, layouts
- **Keyboard**: `Cmd+Shift+U`
- **Voice**: "UI/UX Bot"

### Design System
- **ID**: `agent.design.system.v1`
- **Role**: Maintains design tokens and component libraries
- **Outputs**: Design tokens, component specs, style guides
- **Keyboard**: `Cmd+Shift+1`

### Accessibility Specialist
- **ID**: `agent.design.accessibility.v1`
- **Role**: Ensures WCAG compliance and inclusive design
- **Outputs**: A11y audits, ARIA implementations, screen reader support
- **Keyboard**: `Cmd+Shift+2`

### Prototyper
- **ID**: `agent.design.prototyping.v1`
- **Role**: Creates interactive prototypes and mockups
- **Outputs**: Figma specs, interactive demos, user flows
- **Keyboard**: `Cmd+Shift+3`

## Integrations

| Integration | Purpose | Priority |
|------------|---------|----------|
| **Figma** | Design collaboration | Critical |
| **Storybook** | Component documentation | Critical |
| **Tailwind CSS** | Styling framework | High |
| **Radix UI** | Accessible primitives | High |
| **shadcn/ui** | Component library | High |

## Design System

### Color Tokens
```css
:root {
  /* Primary */
  --color-primary-50: #eef2ff;
  --color-primary-500: #6366f1;
  --color-primary-900: #312e81;

  /* Semantic */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* Neutral */
  --color-gray-50: #f9fafb;
  --color-gray-900: #111827;
}
```

### Typography Scale
```css
:root {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
}
```

### Spacing Scale
```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
}
```

## Workflows

### Component Creation
```
1. UI/UX Designer -> Creates component design
2. Design System -> Ensures token compliance
3. Accessibility -> Adds ARIA and keyboard support
4. UI/UX Designer -> Implements in React
```

### Design Audit
```
1. Accessibility -> WCAG audit
2. Design System -> Consistency check
3. UI/UX Designer -> Visual polish
```

### New Page Design
```
1. Prototyper -> Creates wireframe
2. UI/UX Designer -> Designs high-fidelity
3. Accessibility -> Reviews for a11y
4. Engineering Pack -> Implements
```

## Usage Examples

### Create Component
```
@design Create a notification toast component with success, error, and info variants
```

### Design Page
```
@design Design a settings page with profile, security, and notification sections
```

### Accessibility Audit
```
@design Run WCAG 2.1 AA audit on the checkout flow
```

### Design System Token
```
@design Add a new "brand-purple" color to the design system
```

### Prototype
```
@design Create a user flow prototype for the onboarding process
```

## Model Configuration

| Task Class | Primary Model | Temperature | Max Tokens |
|-----------|---------------|-------------|------------|
| UI Design | claude-4-opus | 0.4 | 12000 |
| Design System | claude-4-sonnet | 0.2 | 8000 |
| Accessibility | gpt-5 | 0.1 | 4000 |
| Prototyping | claude-4-sonnet | 0.5 | 8000 |

## Component Standards

### React Component Template
```typescript
import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### Accessibility Requirements
```typescript
// All interactive elements must have:
// 1. Visible focus indicators
// 2. Keyboard navigation
// 3. ARIA labels where needed
// 4. Sufficient color contrast (4.5:1 for text)

<button
  aria-label="Close dialog"
  className="focus:ring-2 focus:ring-primary focus:outline-none"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClose();
    }
  }}
>
  <XIcon aria-hidden="true" />
</button>
```

## Quality Gates

- All components have Storybook stories
- WCAG 2.1 AA compliance verified
- Design tokens used (no hardcoded values)
- Responsive design tested
- Dark mode support included
- Keyboard navigation functional

## Accessibility Checklist

- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 UI)
- [ ] Focus indicators visible
- [ ] Keyboard navigation works
- [ ] Screen reader labels present
- [ ] Motion respects prefers-reduced-motion
- [ ] Touch targets minimum 44x44px
- [ ] Form fields have labels
- [ ] Error messages announced
- [ ] Skip links for navigation
- [ ] Heading hierarchy correct

## Cost Estimate

| Agent | Avg Cost/Task | Monthly Estimate |
|-------|---------------|------------------|
| UI/UX Designer | $0.25 | $100-200 |
| Design System | $0.15 | $30-60 |
| Accessibility | $0.12 | $25-50 |
| Prototyper | $0.18 | $35-70 |
| **Total** | | **$190-380** |

## Getting Started

1. Configure integrations:
   - `FIGMA_ACCESS_TOKEN`
   - Storybook deployment
2. Install dependencies:
   - `@radix-ui/react-*`
   - `class-variance-authority`
   - `tailwind-merge`
3. Activate pack: `@design activate`
4. Start with: `@design help`

## Dependencies

None - this pack is a dependency for other packs.

## Used By

- `pack.core.engineering.v1`
- `pack.core.mobile.v1`

## Changelog

### v1.0.0 (2025-12-28)
- Initial production release
- 5 agents fully operational
- Figma, Storybook integrations verified
- shadcn/ui patterns embedded
- WCAG 2.1 AA compliance built-in
