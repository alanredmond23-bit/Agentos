/**
 * AgentOS Studio - YAML Schema Definition
 * Complete JSON Schema for agent YAML validation covering all 18 clusters
 */

import type { JSONSchemaType } from 'ajv';

// ============================================
// Schema Types
// ============================================

export interface AgentYAMLSchema {
  version: string;
  metadata: MetadataSchema;
  identity?: IdentitySchema;
  model?: ModelSchema;
  authority?: AuthoritySchema;
  memory?: MemorySchema;
  tools?: ToolsSchema;
  gates?: GatesSchema;
  reasoning?: ReasoningSchema;
  communication?: CommunicationSchema;
  learning?: LearningSchema;
  security?: SecuritySchema;
  observability?: ObservabilitySchema;
  lifecycle?: LifecycleSchema;
  integration?: IntegrationSchema;
  scaling?: ScalingSchema;
  compliance?: ComplianceSchema;
  testing?: TestingSchema;
  deployment?: DeploymentSchema;
  governance?: GovernanceSchema;
}

interface MetadataSchema {
  name: string;
  description?: string;
  version: string;
  author?: string;
  tags?: string[];
  created?: string;
  updated?: string;
}

interface IdentitySchema {
  id?: string;
  type: 'autonomous' | 'assistive' | 'collaborative' | 'supervisory';
  role: string;
  persona?: string;
  capabilities?: string[];
  limitations?: string[];
}

interface ModelSchema {
  provider: 'anthropic' | 'openai' | 'google' | 'azure' | 'local' | 'custom';
  name: string;
  version?: string;
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
  };
  fallback?: {
    provider: string;
    name: string;
  };
}

interface AuthoritySchema {
  level: 'restricted' | 'standard' | 'elevated' | 'admin';
  permissions: string[];
  restrictions?: string[];
  approvalRequired?: {
    actions: string[];
    approvers: string[];
    timeout?: number;
  };
  delegation?: {
    enabled: boolean;
    maxDepth?: number;
    allowedAgents?: string[];
  };
}

interface MemorySchema {
  shortTerm?: {
    enabled: boolean;
    maxTokens?: number;
    retention?: string;
  };
  longTerm?: {
    enabled: boolean;
    store: 'vector' | 'graph' | 'relational' | 'hybrid';
    indexing?: 'semantic' | 'keyword' | 'hybrid';
    retention?: string;
  };
  episodic?: {
    enabled: boolean;
    maxEpisodes?: number;
    compression?: boolean;
  };
  working?: {
    enabled: boolean;
    capacity?: number;
  };
}

interface ToolsSchema {
  enabled: string[];
  custom?: Array<{
    name: string;
    description: string;
    endpoint?: string;
    schema?: Record<string, unknown>;
    authentication?: {
      type: 'api_key' | 'oauth2' | 'jwt' | 'none';
      credentials?: string;
    };
  }>;
  restrictions?: {
    rateLimit?: number;
    timeout?: number;
    allowedDomains?: string[];
    blockedDomains?: string[];
  };
}

interface GatesSchema {
  input?: Array<{
    name: string;
    type: 'content_filter' | 'schema_validation' | 'rate_limit' | 'authentication' | 'custom';
    config?: Record<string, unknown>;
    action: 'block' | 'warn' | 'log' | 'transform';
  }>;
  output?: Array<{
    name: string;
    type: 'content_filter' | 'pii_redaction' | 'format_validation' | 'approval' | 'custom';
    config?: Record<string, unknown>;
    action: 'block' | 'warn' | 'log' | 'transform';
  }>;
  decision?: Array<{
    name: string;
    type: 'cost_threshold' | 'risk_assessment' | 'human_in_loop' | 'consensus' | 'custom';
    config?: Record<string, unknown>;
    trigger?: string;
  }>;
}

interface ReasoningSchema {
  strategy: 'chain_of_thought' | 'tree_of_thought' | 'react' | 'reflexion' | 'custom';
  depth?: number;
  verification?: {
    enabled: boolean;
    method: 'self_consistency' | 'cross_validation' | 'external';
  };
  planning?: {
    enabled: boolean;
    horizon?: number;
    replanning?: boolean;
  };
}

interface CommunicationSchema {
  channels?: Array<{
    type: 'http' | 'websocket' | 'grpc' | 'message_queue' | 'event_bus';
    config?: Record<string, unknown>;
  }>;
  protocols?: {
    messaging?: 'json' | 'protobuf' | 'msgpack';
    compression?: 'gzip' | 'lz4' | 'none';
    encryption?: 'tls' | 'mtls' | 'none';
  };
  multiAgent?: {
    enabled: boolean;
    discoveryMethod?: 'registry' | 'broadcast' | 'explicit';
    coordinationProtocol?: 'leader_election' | 'consensus' | 'blackboard' | 'market';
  };
}

interface LearningSchema {
  mode: 'static' | 'online' | 'batch' | 'reinforcement';
  feedback?: {
    enabled: boolean;
    sources: Array<'human' | 'automated' | 'peer' | 'outcome'>;
    integration?: 'immediate' | 'batched' | 'scheduled';
  };
  adaptation?: {
    enabled: boolean;
    triggers?: string[];
    constraints?: string[];
  };
  evaluation?: {
    metrics: string[];
    frequency?: string;
    benchmarks?: string[];
  };
}

interface SecuritySchema {
  authentication?: {
    method: 'api_key' | 'oauth2' | 'jwt' | 'mtls' | 'saml';
    config?: Record<string, unknown>;
  };
  authorization?: {
    model: 'rbac' | 'abac' | 'pbac' | 'custom';
    policies?: string[];
  };
  encryption?: {
    atRest: boolean;
    inTransit: boolean;
    algorithm?: string;
  };
  audit?: {
    enabled: boolean;
    level: 'minimal' | 'standard' | 'comprehensive';
    retention?: string;
  };
  secrets?: {
    provider: 'vault' | 'aws_secrets' | 'azure_keyvault' | 'gcp_secrets' | 'env';
    rotation?: boolean;
    rotationPeriod?: string;
  };
}

interface ObservabilitySchema {
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text' | 'structured';
    destination?: string;
  };
  metrics?: {
    enabled: boolean;
    provider?: 'prometheus' | 'datadog' | 'cloudwatch' | 'custom';
    customMetrics?: string[];
  };
  tracing?: {
    enabled: boolean;
    provider?: 'jaeger' | 'zipkin' | 'otel' | 'xray';
    samplingRate?: number;
  };
  alerting?: {
    enabled: boolean;
    channels?: Array<{
      type: 'email' | 'slack' | 'pagerduty' | 'webhook';
      config?: Record<string, unknown>;
    }>;
    rules?: Array<{
      name: string;
      condition: string;
      severity: 'info' | 'warning' | 'critical';
    }>;
  };
}

interface LifecycleSchema {
  startup?: {
    timeout?: number;
    healthCheck?: {
      endpoint?: string;
      interval?: number;
    };
    dependencies?: string[];
  };
  shutdown?: {
    gracePeriod?: number;
    cleanup?: string[];
  };
  restart?: {
    policy: 'never' | 'on_failure' | 'always';
    maxRetries?: number;
    backoff?: {
      initial?: number;
      max?: number;
      multiplier?: number;
    };
  };
  maintenance?: {
    windows?: Array<{
      start: string;
      end: string;
      timezone?: string;
    }>;
    autoUpdate?: boolean;
  };
}

interface IntegrationSchema {
  apis?: Array<{
    name: string;
    type: 'rest' | 'graphql' | 'soap' | 'grpc';
    baseUrl?: string;
    authentication?: Record<string, unknown>;
    rateLimit?: number;
  }>;
  databases?: Array<{
    name: string;
    type: 'postgres' | 'mysql' | 'mongodb' | 'redis' | 'elasticsearch';
    connectionString?: string;
    poolSize?: number;
  }>;
  messageQueues?: Array<{
    name: string;
    type: 'rabbitmq' | 'kafka' | 'sqs' | 'pubsub';
    config?: Record<string, unknown>;
  }>;
  webhooks?: Array<{
    name: string;
    url: string;
    events: string[];
    secret?: string;
  }>;
}

interface ScalingSchema {
  mode: 'manual' | 'auto' | 'scheduled';
  horizontal?: {
    minInstances?: number;
    maxInstances?: number;
    metrics?: Array<{
      name: string;
      target: number;
    }>;
  };
  vertical?: {
    minResources?: {
      cpu?: string;
      memory?: string;
    };
    maxResources?: {
      cpu?: string;
      memory?: string;
    };
  };
  loadBalancing?: {
    strategy: 'round_robin' | 'least_connections' | 'weighted' | 'consistent_hash';
    healthCheck?: {
      path?: string;
      interval?: number;
    };
  };
}

interface ComplianceSchema {
  standards?: string[];
  dataResidency?: {
    regions: string[];
    restrictions?: string[];
  };
  retention?: {
    policy: string;
    duration?: string;
    deletion?: 'soft' | 'hard';
  };
  reporting?: {
    enabled: boolean;
    schedule?: string;
    recipients?: string[];
  };
  certifications?: string[];
}

interface TestingSchema {
  unit?: {
    enabled: boolean;
    framework?: string;
    coverage?: number;
  };
  integration?: {
    enabled: boolean;
    environment?: string;
    fixtures?: string[];
  };
  e2e?: {
    enabled: boolean;
    scenarios?: string[];
  };
  performance?: {
    enabled: boolean;
    benchmarks?: Array<{
      name: string;
      target: number;
      unit: string;
    }>;
  };
  chaos?: {
    enabled: boolean;
    experiments?: string[];
  };
}

interface DeploymentSchema {
  target: 'kubernetes' | 'docker' | 'serverless' | 'vm' | 'bare_metal';
  strategy: 'rolling' | 'blue_green' | 'canary' | 'recreate';
  environments?: Array<{
    name: string;
    config?: Record<string, unknown>;
  }>;
  rollback?: {
    enabled: boolean;
    automatic?: boolean;
    threshold?: number;
  };
  artifacts?: {
    registry?: string;
    repository?: string;
    tag?: string;
  };
}

interface GovernanceSchema {
  ownership?: {
    team: string;
    contact?: string;
    escalation?: string[];
  };
  approval?: {
    required: boolean;
    approvers?: string[];
    quorum?: number;
  };
  change?: {
    process: 'gitops' | 'ticket' | 'manual';
    tracking?: string;
  };
  documentation?: {
    required: boolean;
    location?: string;
    review?: string;
  };
}

// ============================================
// JSON Schema Definition for Monaco Editor
// ============================================

export const agentYAMLJSONSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'AgentOS Agent Configuration',
  description: 'Complete schema for defining AI agents in AgentOS',
  type: 'object',
  required: ['version', 'metadata'],
  additionalProperties: false,
  properties: {
    version: {
      type: 'string',
      description: 'Schema version',
      enum: ['1.0', '1.1', '2.0'],
      default: '1.0'
    },
    metadata: {
      type: 'object',
      description: 'Agent metadata and identification',
      required: ['name', 'version'],
      properties: {
        name: {
          type: 'string',
          description: 'Unique agent name',
          pattern: '^[a-z][a-z0-9-]*$',
          minLength: 3,
          maxLength: 64
        },
        description: {
          type: 'string',
          description: 'Human-readable description of the agent',
          maxLength: 500
        },
        version: {
          type: 'string',
          description: 'Agent version (semver)',
          pattern: '^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9]+)?$'
        },
        author: {
          type: 'string',
          description: 'Agent author or team'
        },
        tags: {
          type: 'array',
          description: 'Classification tags',
          items: { type: 'string' },
          maxItems: 10
        },
        created: {
          type: 'string',
          format: 'date-time',
          description: 'Creation timestamp'
        },
        updated: {
          type: 'string',
          format: 'date-time',
          description: 'Last update timestamp'
        }
      }
    },
    identity: {
      type: 'object',
      description: 'Agent identity and role definition',
      required: ['type', 'role'],
      properties: {
        id: {
          type: 'string',
          description: 'Unique identifier (auto-generated if not provided)'
        },
        type: {
          type: 'string',
          description: 'Agent operational type',
          enum: ['autonomous', 'assistive', 'collaborative', 'supervisory']
        },
        role: {
          type: 'string',
          description: 'Primary role or function',
          examples: ['code_reviewer', 'data_analyst', 'customer_support', 'research_assistant']
        },
        persona: {
          type: 'string',
          description: 'Agent personality and communication style',
          maxLength: 2000
        },
        capabilities: {
          type: 'array',
          description: 'List of agent capabilities',
          items: { type: 'string' }
        },
        limitations: {
          type: 'array',
          description: 'Known limitations or restrictions',
          items: { type: 'string' }
        }
      }
    },
    model: {
      type: 'object',
      description: 'AI model configuration',
      required: ['provider', 'name'],
      properties: {
        provider: {
          type: 'string',
          description: 'Model provider',
          enum: ['anthropic', 'openai', 'google', 'azure', 'local', 'custom']
        },
        name: {
          type: 'string',
          description: 'Model identifier',
          examples: ['claude-3-opus', 'claude-3-sonnet', 'gpt-4', 'gpt-4-turbo', 'gemini-pro']
        },
        version: {
          type: 'string',
          description: 'Specific model version'
        },
        parameters: {
          type: 'object',
          description: 'Model inference parameters',
          properties: {
            temperature: {
              type: 'number',
              description: 'Sampling temperature',
              minimum: 0,
              maximum: 2,
              default: 0.7
            },
            maxTokens: {
              type: 'integer',
              description: 'Maximum output tokens',
              minimum: 1,
              maximum: 200000,
              default: 4096
            },
            topP: {
              type: 'number',
              description: 'Nucleus sampling parameter',
              minimum: 0,
              maximum: 1,
              default: 1
            },
            topK: {
              type: 'integer',
              description: 'Top-k sampling parameter',
              minimum: 1,
              maximum: 100
            },
            frequencyPenalty: {
              type: 'number',
              description: 'Frequency penalty',
              minimum: -2,
              maximum: 2,
              default: 0
            },
            presencePenalty: {
              type: 'number',
              description: 'Presence penalty',
              minimum: -2,
              maximum: 2,
              default: 0
            },
            stopSequences: {
              type: 'array',
              description: 'Stop sequences',
              items: { type: 'string' },
              maxItems: 4
            }
          }
        },
        fallback: {
          type: 'object',
          description: 'Fallback model configuration',
          properties: {
            provider: { type: 'string' },
            name: { type: 'string' }
          }
        }
      }
    },
    authority: {
      type: 'object',
      description: 'Permission and authority configuration',
      required: ['level', 'permissions'],
      properties: {
        level: {
          type: 'string',
          description: 'Authority level',
          enum: ['restricted', 'standard', 'elevated', 'admin'],
          default: 'standard'
        },
        permissions: {
          type: 'array',
          description: 'Granted permissions',
          items: {
            type: 'string',
            examples: [
              'read:files',
              'write:files',
              'execute:commands',
              'create:resources',
              'delete:resources',
              'manage:agents',
              'access:network',
              'access:databases'
            ]
          }
        },
        restrictions: {
          type: 'array',
          description: 'Explicit restrictions',
          items: { type: 'string' }
        },
        approvalRequired: {
          type: 'object',
          description: 'Actions requiring approval',
          properties: {
            actions: {
              type: 'array',
              items: { type: 'string' }
            },
            approvers: {
              type: 'array',
              items: { type: 'string' }
            },
            timeout: {
              type: 'integer',
              description: 'Approval timeout in seconds',
              minimum: 60,
              default: 3600
            }
          }
        },
        delegation: {
          type: 'object',
          description: 'Authority delegation settings',
          properties: {
            enabled: { type: 'boolean', default: false },
            maxDepth: { type: 'integer', minimum: 1, maximum: 5 },
            allowedAgents: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    },
    memory: {
      type: 'object',
      description: 'Memory and context configuration',
      properties: {
        shortTerm: {
          type: 'object',
          description: 'Short-term/working memory',
          properties: {
            enabled: { type: 'boolean', default: true },
            maxTokens: { type: 'integer', minimum: 1000, maximum: 200000, default: 8000 },
            retention: { type: 'string', default: 'session' }
          }
        },
        longTerm: {
          type: 'object',
          description: 'Long-term memory storage',
          properties: {
            enabled: { type: 'boolean', default: false },
            store: {
              type: 'string',
              enum: ['vector', 'graph', 'relational', 'hybrid'],
              default: 'vector'
            },
            indexing: {
              type: 'string',
              enum: ['semantic', 'keyword', 'hybrid'],
              default: 'semantic'
            },
            retention: { type: 'string', default: '30d' }
          }
        },
        episodic: {
          type: 'object',
          description: 'Episodic memory for experiences',
          properties: {
            enabled: { type: 'boolean', default: false },
            maxEpisodes: { type: 'integer', minimum: 1, maximum: 10000, default: 100 },
            compression: { type: 'boolean', default: true }
          }
        },
        working: {
          type: 'object',
          description: 'Working memory scratch space',
          properties: {
            enabled: { type: 'boolean', default: true },
            capacity: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
          }
        }
      }
    },
    tools: {
      type: 'object',
      description: 'Tool and capability configuration',
      properties: {
        enabled: {
          type: 'array',
          description: 'Enabled built-in tools',
          items: {
            type: 'string',
            examples: [
              'web_search',
              'code_execution',
              'file_operations',
              'database_query',
              'api_calls',
              'image_generation',
              'document_analysis',
              'calculator',
              'calendar',
              'email'
            ]
          }
        },
        custom: {
          type: 'array',
          description: 'Custom tool definitions',
          items: {
            type: 'object',
            required: ['name', 'description'],
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              endpoint: { type: 'string', format: 'uri' },
              schema: { type: 'object' },
              authentication: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['api_key', 'oauth2', 'jwt', 'none']
                  },
                  credentials: { type: 'string' }
                }
              }
            }
          }
        },
        restrictions: {
          type: 'object',
          description: 'Tool usage restrictions',
          properties: {
            rateLimit: { type: 'integer', description: 'Calls per minute', minimum: 1 },
            timeout: { type: 'integer', description: 'Timeout in milliseconds', minimum: 100 },
            allowedDomains: {
              type: 'array',
              items: { type: 'string' }
            },
            blockedDomains: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    },
    gates: {
      type: 'object',
      description: 'Input/output gates and filters',
      properties: {
        input: {
          type: 'array',
          description: 'Input processing gates',
          items: {
            type: 'object',
            required: ['name', 'type', 'action'],
            properties: {
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: ['content_filter', 'schema_validation', 'rate_limit', 'authentication', 'custom']
              },
              config: { type: 'object' },
              action: {
                type: 'string',
                enum: ['block', 'warn', 'log', 'transform']
              }
            }
          }
        },
        output: {
          type: 'array',
          description: 'Output processing gates',
          items: {
            type: 'object',
            required: ['name', 'type', 'action'],
            properties: {
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: ['content_filter', 'pii_redaction', 'format_validation', 'approval', 'custom']
              },
              config: { type: 'object' },
              action: {
                type: 'string',
                enum: ['block', 'warn', 'log', 'transform']
              }
            }
          }
        },
        decision: {
          type: 'array',
          description: 'Decision gates for critical operations',
          items: {
            type: 'object',
            required: ['name', 'type'],
            properties: {
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: ['cost_threshold', 'risk_assessment', 'human_in_loop', 'consensus', 'custom']
              },
              config: { type: 'object' },
              trigger: { type: 'string' }
            }
          }
        }
      }
    },
    reasoning: {
      type: 'object',
      description: 'Reasoning and planning configuration',
      required: ['strategy'],
      properties: {
        strategy: {
          type: 'string',
          description: 'Primary reasoning strategy',
          enum: ['chain_of_thought', 'tree_of_thought', 'react', 'reflexion', 'custom']
        },
        depth: {
          type: 'integer',
          description: 'Maximum reasoning depth',
          minimum: 1,
          maximum: 10,
          default: 3
        },
        verification: {
          type: 'object',
          description: 'Answer verification settings',
          properties: {
            enabled: { type: 'boolean', default: false },
            method: {
              type: 'string',
              enum: ['self_consistency', 'cross_validation', 'external']
            }
          }
        },
        planning: {
          type: 'object',
          description: 'Planning capabilities',
          properties: {
            enabled: { type: 'boolean', default: false },
            horizon: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
            replanning: { type: 'boolean', default: true }
          }
        }
      }
    },
    communication: {
      type: 'object',
      description: 'Communication and messaging configuration',
      properties: {
        channels: {
          type: 'array',
          description: 'Communication channels',
          items: {
            type: 'object',
            required: ['type'],
            properties: {
              type: {
                type: 'string',
                enum: ['http', 'websocket', 'grpc', 'message_queue', 'event_bus']
              },
              config: { type: 'object' }
            }
          }
        },
        protocols: {
          type: 'object',
          description: 'Protocol settings',
          properties: {
            messaging: {
              type: 'string',
              enum: ['json', 'protobuf', 'msgpack'],
              default: 'json'
            },
            compression: {
              type: 'string',
              enum: ['gzip', 'lz4', 'none'],
              default: 'none'
            },
            encryption: {
              type: 'string',
              enum: ['tls', 'mtls', 'none'],
              default: 'tls'
            }
          }
        },
        multiAgent: {
          type: 'object',
          description: 'Multi-agent coordination',
          properties: {
            enabled: { type: 'boolean', default: false },
            discoveryMethod: {
              type: 'string',
              enum: ['registry', 'broadcast', 'explicit']
            },
            coordinationProtocol: {
              type: 'string',
              enum: ['leader_election', 'consensus', 'blackboard', 'market']
            }
          }
        }
      }
    },
    learning: {
      type: 'object',
      description: 'Learning and adaptation configuration',
      required: ['mode'],
      properties: {
        mode: {
          type: 'string',
          description: 'Learning mode',
          enum: ['static', 'online', 'batch', 'reinforcement']
        },
        feedback: {
          type: 'object',
          description: 'Feedback integration',
          properties: {
            enabled: { type: 'boolean', default: false },
            sources: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['human', 'automated', 'peer', 'outcome']
              }
            },
            integration: {
              type: 'string',
              enum: ['immediate', 'batched', 'scheduled']
            }
          }
        },
        adaptation: {
          type: 'object',
          description: 'Behavioral adaptation',
          properties: {
            enabled: { type: 'boolean', default: false },
            triggers: {
              type: 'array',
              items: { type: 'string' }
            },
            constraints: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        evaluation: {
          type: 'object',
          description: 'Performance evaluation',
          properties: {
            metrics: {
              type: 'array',
              items: { type: 'string' }
            },
            frequency: { type: 'string' },
            benchmarks: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    },
    security: {
      type: 'object',
      description: 'Security configuration',
      properties: {
        authentication: {
          type: 'object',
          description: 'Authentication settings',
          properties: {
            method: {
              type: 'string',
              enum: ['api_key', 'oauth2', 'jwt', 'mtls', 'saml']
            },
            config: { type: 'object' }
          }
        },
        authorization: {
          type: 'object',
          description: 'Authorization model',
          properties: {
            model: {
              type: 'string',
              enum: ['rbac', 'abac', 'pbac', 'custom']
            },
            policies: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        encryption: {
          type: 'object',
          description: 'Encryption settings',
          properties: {
            atRest: { type: 'boolean', default: true },
            inTransit: { type: 'boolean', default: true },
            algorithm: { type: 'string', default: 'AES-256-GCM' }
          }
        },
        audit: {
          type: 'object',
          description: 'Audit logging',
          properties: {
            enabled: { type: 'boolean', default: true },
            level: {
              type: 'string',
              enum: ['minimal', 'standard', 'comprehensive'],
              default: 'standard'
            },
            retention: { type: 'string', default: '90d' }
          }
        },
        secrets: {
          type: 'object',
          description: 'Secrets management',
          properties: {
            provider: {
              type: 'string',
              enum: ['vault', 'aws_secrets', 'azure_keyvault', 'gcp_secrets', 'env']
            },
            rotation: { type: 'boolean', default: false },
            rotationPeriod: { type: 'string' }
          }
        }
      }
    },
    observability: {
      type: 'object',
      description: 'Monitoring and observability configuration',
      properties: {
        logging: {
          type: 'object',
          description: 'Logging configuration',
          properties: {
            level: {
              type: 'string',
              enum: ['debug', 'info', 'warn', 'error'],
              default: 'info'
            },
            format: {
              type: 'string',
              enum: ['json', 'text', 'structured'],
              default: 'json'
            },
            destination: { type: 'string' }
          }
        },
        metrics: {
          type: 'object',
          description: 'Metrics collection',
          properties: {
            enabled: { type: 'boolean', default: true },
            provider: {
              type: 'string',
              enum: ['prometheus', 'datadog', 'cloudwatch', 'custom']
            },
            customMetrics: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        tracing: {
          type: 'object',
          description: 'Distributed tracing',
          properties: {
            enabled: { type: 'boolean', default: false },
            provider: {
              type: 'string',
              enum: ['jaeger', 'zipkin', 'otel', 'xray']
            },
            samplingRate: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              default: 0.1
            }
          }
        },
        alerting: {
          type: 'object',
          description: 'Alerting configuration',
          properties: {
            enabled: { type: 'boolean', default: false },
            channels: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['email', 'slack', 'pagerduty', 'webhook']
                  },
                  config: { type: 'object' }
                }
              }
            },
            rules: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'condition', 'severity'],
                properties: {
                  name: { type: 'string' },
                  condition: { type: 'string' },
                  severity: {
                    type: 'string',
                    enum: ['info', 'warning', 'critical']
                  }
                }
              }
            }
          }
        }
      }
    },
    lifecycle: {
      type: 'object',
      description: 'Agent lifecycle management',
      properties: {
        startup: {
          type: 'object',
          description: 'Startup configuration',
          properties: {
            timeout: { type: 'integer', minimum: 1000, default: 30000 },
            healthCheck: {
              type: 'object',
              properties: {
                endpoint: { type: 'string' },
                interval: { type: 'integer', minimum: 1000, default: 5000 }
              }
            },
            dependencies: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        shutdown: {
          type: 'object',
          description: 'Shutdown configuration',
          properties: {
            gracePeriod: { type: 'integer', minimum: 0, default: 30000 },
            cleanup: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        restart: {
          type: 'object',
          description: 'Restart policy',
          properties: {
            policy: {
              type: 'string',
              enum: ['never', 'on_failure', 'always'],
              default: 'on_failure'
            },
            maxRetries: { type: 'integer', minimum: 0, default: 3 },
            backoff: {
              type: 'object',
              properties: {
                initial: { type: 'integer', minimum: 100, default: 1000 },
                max: { type: 'integer', minimum: 1000, default: 60000 },
                multiplier: { type: 'number', minimum: 1, default: 2 }
              }
            }
          }
        },
        maintenance: {
          type: 'object',
          description: 'Maintenance settings',
          properties: {
            windows: {
              type: 'array',
              items: {
                type: 'object',
                required: ['start', 'end'],
                properties: {
                  start: { type: 'string' },
                  end: { type: 'string' },
                  timezone: { type: 'string', default: 'UTC' }
                }
              }
            },
            autoUpdate: { type: 'boolean', default: false }
          }
        }
      }
    },
    integration: {
      type: 'object',
      description: 'External integration configuration',
      properties: {
        apis: {
          type: 'array',
          description: 'API integrations',
          items: {
            type: 'object',
            required: ['name', 'type'],
            properties: {
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: ['rest', 'graphql', 'soap', 'grpc']
              },
              baseUrl: { type: 'string', format: 'uri' },
              authentication: { type: 'object' },
              rateLimit: { type: 'integer', minimum: 1 }
            }
          }
        },
        databases: {
          type: 'array',
          description: 'Database connections',
          items: {
            type: 'object',
            required: ['name', 'type'],
            properties: {
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: ['postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch']
              },
              connectionString: { type: 'string' },
              poolSize: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
            }
          }
        },
        messageQueues: {
          type: 'array',
          description: 'Message queue integrations',
          items: {
            type: 'object',
            required: ['name', 'type'],
            properties: {
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: ['rabbitmq', 'kafka', 'sqs', 'pubsub']
              },
              config: { type: 'object' }
            }
          }
        },
        webhooks: {
          type: 'array',
          description: 'Webhook configurations',
          items: {
            type: 'object',
            required: ['name', 'url', 'events'],
            properties: {
              name: { type: 'string' },
              url: { type: 'string', format: 'uri' },
              events: {
                type: 'array',
                items: { type: 'string' }
              },
              secret: { type: 'string' }
            }
          }
        }
      }
    },
    scaling: {
      type: 'object',
      description: 'Scaling configuration',
      required: ['mode'],
      properties: {
        mode: {
          type: 'string',
          description: 'Scaling mode',
          enum: ['manual', 'auto', 'scheduled']
        },
        horizontal: {
          type: 'object',
          description: 'Horizontal scaling',
          properties: {
            minInstances: { type: 'integer', minimum: 0, default: 1 },
            maxInstances: { type: 'integer', minimum: 1, default: 10 },
            metrics: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'target'],
                properties: {
                  name: { type: 'string' },
                  target: { type: 'number' }
                }
              }
            }
          }
        },
        vertical: {
          type: 'object',
          description: 'Vertical scaling',
          properties: {
            minResources: {
              type: 'object',
              properties: {
                cpu: { type: 'string' },
                memory: { type: 'string' }
              }
            },
            maxResources: {
              type: 'object',
              properties: {
                cpu: { type: 'string' },
                memory: { type: 'string' }
              }
            }
          }
        },
        loadBalancing: {
          type: 'object',
          description: 'Load balancing settings',
          properties: {
            strategy: {
              type: 'string',
              enum: ['round_robin', 'least_connections', 'weighted', 'consistent_hash'],
              default: 'round_robin'
            },
            healthCheck: {
              type: 'object',
              properties: {
                path: { type: 'string', default: '/health' },
                interval: { type: 'integer', minimum: 1000, default: 10000 }
              }
            }
          }
        }
      }
    },
    compliance: {
      type: 'object',
      description: 'Compliance and regulatory configuration',
      properties: {
        standards: {
          type: 'array',
          description: 'Compliance standards',
          items: {
            type: 'string',
            examples: ['SOC2', 'HIPAA', 'GDPR', 'PCI-DSS', 'ISO27001', 'FedRAMP']
          }
        },
        dataResidency: {
          type: 'object',
          description: 'Data residency requirements',
          properties: {
            regions: {
              type: 'array',
              items: { type: 'string' }
            },
            restrictions: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        retention: {
          type: 'object',
          description: 'Data retention policy',
          properties: {
            policy: { type: 'string' },
            duration: { type: 'string' },
            deletion: {
              type: 'string',
              enum: ['soft', 'hard'],
              default: 'soft'
            }
          }
        },
        reporting: {
          type: 'object',
          description: 'Compliance reporting',
          properties: {
            enabled: { type: 'boolean', default: false },
            schedule: { type: 'string' },
            recipients: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        certifications: {
          type: 'array',
          description: 'Required certifications',
          items: { type: 'string' }
        }
      }
    },
    testing: {
      type: 'object',
      description: 'Testing configuration',
      properties: {
        unit: {
          type: 'object',
          description: 'Unit testing',
          properties: {
            enabled: { type: 'boolean', default: true },
            framework: { type: 'string' },
            coverage: { type: 'number', minimum: 0, maximum: 100, default: 80 }
          }
        },
        integration: {
          type: 'object',
          description: 'Integration testing',
          properties: {
            enabled: { type: 'boolean', default: true },
            environment: { type: 'string' },
            fixtures: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        e2e: {
          type: 'object',
          description: 'End-to-end testing',
          properties: {
            enabled: { type: 'boolean', default: false },
            scenarios: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        performance: {
          type: 'object',
          description: 'Performance testing',
          properties: {
            enabled: { type: 'boolean', default: false },
            benchmarks: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'target', 'unit'],
                properties: {
                  name: { type: 'string' },
                  target: { type: 'number' },
                  unit: { type: 'string' }
                }
              }
            }
          }
        },
        chaos: {
          type: 'object',
          description: 'Chaos engineering',
          properties: {
            enabled: { type: 'boolean', default: false },
            experiments: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    },
    deployment: {
      type: 'object',
      description: 'Deployment configuration',
      required: ['target', 'strategy'],
      properties: {
        target: {
          type: 'string',
          description: 'Deployment target',
          enum: ['kubernetes', 'docker', 'serverless', 'vm', 'bare_metal']
        },
        strategy: {
          type: 'string',
          description: 'Deployment strategy',
          enum: ['rolling', 'blue_green', 'canary', 'recreate'],
          default: 'rolling'
        },
        environments: {
          type: 'array',
          description: 'Environment configurations',
          items: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
              config: { type: 'object' }
            }
          }
        },
        rollback: {
          type: 'object',
          description: 'Rollback settings',
          properties: {
            enabled: { type: 'boolean', default: true },
            automatic: { type: 'boolean', default: false },
            threshold: { type: 'number', minimum: 0, maximum: 100 }
          }
        },
        artifacts: {
          type: 'object',
          description: 'Build artifacts',
          properties: {
            registry: { type: 'string' },
            repository: { type: 'string' },
            tag: { type: 'string' }
          }
        }
      }
    },
    governance: {
      type: 'object',
      description: 'Governance configuration',
      properties: {
        ownership: {
          type: 'object',
          description: 'Ownership details',
          required: ['team'],
          properties: {
            team: { type: 'string' },
            contact: { type: 'string' },
            escalation: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        approval: {
          type: 'object',
          description: 'Change approval settings',
          properties: {
            required: { type: 'boolean', default: false },
            approvers: {
              type: 'array',
              items: { type: 'string' }
            },
            quorum: { type: 'integer', minimum: 1 }
          }
        },
        change: {
          type: 'object',
          description: 'Change management',
          properties: {
            process: {
              type: 'string',
              enum: ['gitops', 'ticket', 'manual'],
              default: 'gitops'
            },
            tracking: { type: 'string' }
          }
        },
        documentation: {
          type: 'object',
          description: 'Documentation requirements',
          properties: {
            required: { type: 'boolean', default: true },
            location: { type: 'string' },
            review: { type: 'string' }
          }
        }
      }
    }
  }
};

// ============================================
// Default Agent YAML Template
// ============================================

export const defaultAgentYAML = `# AgentOS Agent Configuration
# Version: 1.0

version: "1.0"

metadata:
  name: my-agent
  description: A new AI agent
  version: "0.1.0"
  author: AgentOS Team
  tags:
    - example
    - starter

identity:
  type: assistive
  role: general_assistant
  persona: |
    You are a helpful AI assistant that provides clear,
    accurate, and concise responses.
  capabilities:
    - natural_language_understanding
    - task_completion
    - information_retrieval

model:
  provider: anthropic
  name: claude-3-sonnet
  parameters:
    temperature: 0.7
    maxTokens: 4096

authority:
  level: standard
  permissions:
    - read:files
    - write:files
  restrictions:
    - no_external_api_calls
    - no_code_execution

memory:
  shortTerm:
    enabled: true
    maxTokens: 8000
  longTerm:
    enabled: false

tools:
  enabled:
    - web_search
    - calculator
    - document_analysis

gates:
  input:
    - name: content_safety
      type: content_filter
      action: block
  output:
    - name: pii_protection
      type: pii_redaction
      action: transform

reasoning:
  strategy: chain_of_thought
  depth: 3
  verification:
    enabled: true
    method: self_consistency

observability:
  logging:
    level: info
    format: json
  metrics:
    enabled: true
    provider: prometheus

deployment:
  target: kubernetes
  strategy: rolling
`;

// ============================================
// Export Schema for Monaco Editor
// ============================================

export function getMonacoYAMLSchema() {
  return {
    uri: 'http://agentos.dev/schemas/agent.json',
    fileMatch: ['*.agent.yaml', '*.agent.yml', 'agent.yaml', 'agent.yml'],
    schema: agentYAMLJSONSchema
  };
}

export default agentYAMLJSONSchema;
