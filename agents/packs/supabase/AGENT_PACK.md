# Supabase Pack

> Production-ready pack for Supabase database, authentication, storage, and edge functions.

## Pack Overview

| Property | Value |
|----------|-------|
| **Pack ID** | `pack.core.supabase.v1` |
| **Domain** | Backend Infrastructure |
| **Version** | 1.0.0 |
| **Lifecycle** | Production |
| **Agents** | 6 |
| **Manager** | `agent.supabase.pack_manager.v1` |

## Purpose

The Supabase Pack provides specialized AI agents for working with the Supabase platform. From database schema design to edge function deployment, this pack handles all aspects of Supabase development with best practices built in.

## Agents

### Pack Manager
- **ID**: `agent.supabase.pack_manager.v1`
- **Role**: Orchestrates all Supabase agents and routes tasks
- **Keyboard**: `Cmd+Shift+S`

### Database Architect
- **ID**: `agent.supabase.database.v1`
- **Role**: Designs schemas, writes migrations, optimizes queries
- **Outputs**: SQL migrations, RLS policies, indexes, views
- **Keyboard**: `Cmd+Shift+1`

### Auth Specialist
- **ID**: `agent.supabase.auth.v1`
- **Role**: Implements authentication and authorization
- **Outputs**: Auth flows, RLS policies, JWT configurations
- **Keyboard**: `Cmd+Shift+2`

### Storage Manager
- **ID**: `agent.supabase.storage.v1`
- **Role**: Configures storage buckets and policies
- **Outputs**: Bucket configs, storage policies, CDN setup
- **Keyboard**: `Cmd+Shift+3`

### Edge Functions Developer
- **ID**: `agent.supabase.edge_functions.v1`
- **Role**: Creates and deploys Deno edge functions
- **Outputs**: Edge functions, webhooks, scheduled tasks
- **Keyboard**: `Cmd+Shift+4`

### Realtime Specialist
- **ID**: `agent.supabase.realtime.v1`
- **Role**: Implements realtime subscriptions and broadcasts
- **Outputs**: Realtime channels, presence, broadcasts
- **Keyboard**: `Cmd+Shift+5`

## Integrations

| Integration | Purpose | Priority |
|------------|---------|----------|
| **Supabase MCP** | Direct Supabase API access | Critical |
| **PostgreSQL** | Database operations | Critical |
| **Deno** | Edge function runtime | High |
| **PostgREST** | API generation | High |

## Workflows

### New Table Creation
```
1. Database Architect -> Designs schema
2. Auth Specialist -> Adds RLS policies
3. Database Architect -> Creates indexes
4. Realtime Specialist -> Enables subscriptions
```

### Auth Implementation
```
1. Auth Specialist -> Configures providers
2. Database Architect -> Creates user tables
3. Auth Specialist -> Writes RLS policies
4. Edge Functions -> Creates auth hooks
```

### API Endpoint
```
1. Database Architect -> Creates function/view
2. Edge Functions -> Deploys custom endpoint
3. Storage Manager -> Configures file uploads
```

## Usage Examples

### Create Table with RLS
```
@supabase Create a posts table with user ownership and RLS policies
```

### Configure Auth
```
@supabase Set up Google OAuth with custom user metadata
```

### Edge Function
```
@supabase Create an edge function for Stripe webhook handling
```

### Storage Bucket
```
@supabase Create a public images bucket with 5MB file limit
```

### Realtime Channel
```
@supabase Set up realtime presence for a chat room
```

## Model Configuration

| Task Class | Primary Model | Temperature | Max Tokens |
|-----------|---------------|-------------|------------|
| Schema Design | claude-4-opus | 0.2 | 8000 |
| RLS Policies | claude-4-sonnet | 0.1 | 4000 |
| Edge Functions | claude-4-sonnet | 0.2 | 8000 |
| SQL Queries | gpt-5 | 0.1 | 4000 |

## Security Protocols

### RLS Best Practices
- Always enable RLS on new tables
- Use `auth.uid()` for user ownership
- Create policies for each operation (SELECT, INSERT, UPDATE, DELETE)
- Test policies before deployment

### Auth Security
- Enable MFA for admin users
- Use secure JWT secrets
- Implement rate limiting
- Configure allowed redirect URLs

### Storage Security
- Set appropriate MIME type restrictions
- Configure file size limits
- Use signed URLs for sensitive content

## Code Standards

### SQL Migrations
```sql
-- Example migration
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own posts"
  ON public.posts FOR SELECT
  USING (auth.uid() = user_id);
```

### Edge Functions
```typescript
// Example edge function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  // ... implementation
})
```

## Quality Gates

- All tables have RLS enabled
- Migrations are reversible
- Edge functions have error handling
- Auth flows tested end-to-end

## Cost Estimate

| Agent | Avg Cost/Task | Monthly Estimate |
|-------|---------------|------------------|
| Database | $0.15 | $30-60 |
| Auth | $0.12 | $25-50 |
| Storage | $0.08 | $15-30 |
| Edge Functions | $0.20 | $40-80 |
| Realtime | $0.10 | $20-40 |
| **Total** | | **$130-260** |

## Getting Started

1. Configure Supabase credentials:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
2. Activate pack: `@supabase activate`
3. Start with: `@supabase help`

## MCP Server Configuration

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

## Dependencies

None - this is a standalone pack.

## Changelog

### v1.0.0 (2025-12-28)
- Initial production release
- 6 agents fully operational
- Supabase MCP integration verified
- RLS policy templates included
