# Supabase Pack

The Supabase Pack provides AI agents for Supabase backend development, from schema design to production observability.

## Agents

### supabase_pack_manager
Coordinates Supabase agents and manages migration workflows.

### supabase_architecture
- System design for Supabase projects
- Service decomposition
- Integration patterns
- Scalability planning

### supabase_schema_migrations
- Table design and creation
- Migration file generation
- Schema versioning
- Rollback scripts

### supabase_rls_policy
- Row Level Security policy design
- Policy generation and testing
- Permission matrix management
- Security audit preparation

### supabase_edge_functions
- Edge function development
- Deno/TypeScript patterns
- Performance optimization
- Error handling

### supabase_webhook_gateway
- Webhook endpoint design
- Signature verification
- Event processing
- Retry logic

### supabase_storage_s3
- Storage bucket configuration
- Access policies
- CDN integration
- File organization

### supabase_observability
- Logging configuration
- Metrics collection
- Alert setup
- Performance monitoring

### supabase_jobs_queue
- Background job design
- Queue management
- Scheduled tasks
- Dead letter handling

### supabase_security_pii
- PII identification
- Data classification
- Encryption strategies
- Compliance requirements

### supabase_evals
- Schema validation tests
- RLS policy testing
- Function testing
- Integration tests

## Gates

- `gate.security.rls`: RLS policy completeness
- `gate.quality.migration`: Migration safety
- `gate.security.pii`: PII handling verification

## Example Usage

```yaml
task:
  type: supabase.schema
  input:
    entity: "user_preferences"
    fields:
      - name: user_id
        type: uuid
        references: auth.users
      - name: theme
        type: text
        default: "light"
      - name: notifications_enabled
        type: boolean
        default: true
    rls: true
```
