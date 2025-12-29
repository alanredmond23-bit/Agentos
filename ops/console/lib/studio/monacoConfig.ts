/**
 * AgentOS Studio - Monaco Editor Configuration
 * Complete configuration for Monaco editor with YAML language support
 * Features: Custom themes, keybindings, autocomplete providers, validation
 */

import type { editor, languages, KeyMod, KeyCode } from 'monaco-editor';

// ============================================
// Type Definitions
// ============================================

export interface MonacoThemeData {
  base: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
  inherit: boolean;
  rules: Array<{
    token: string;
    foreground?: string;
    background?: string;
    fontStyle?: string;
  }>;
  colors: Record<string, string>;
}

export interface KeybindingConfig {
  key: number;
  command: string;
  when?: string;
}

export interface CompletionItemConfig {
  label: string;
  kind: languages.CompletionItemKind;
  insertText: string;
  insertTextRules?: languages.CompletionItemInsertTextRule;
  documentation?: string;
  detail?: string;
  sortText?: string;
}

// ============================================
// AgentOS Dark Theme
// ============================================

export const agentOSDarkTheme: MonacoThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Comments
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'comment.yaml', foreground: '6A9955', fontStyle: 'italic' },

    // Keywords and types
    { token: 'keyword', foreground: '569CD6' },
    { token: 'keyword.control', foreground: 'C586C0' },
    { token: 'type', foreground: '4EC9B0' },
    { token: 'type.identifier', foreground: '4EC9B0' },

    // Strings
    { token: 'string', foreground: 'CE9178' },
    { token: 'string.yaml', foreground: 'CE9178' },
    { token: 'string.key', foreground: '9CDCFE' },
    { token: 'string.value', foreground: 'CE9178' },

    // Numbers
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'number.yaml', foreground: 'B5CEA8' },

    // Variables and identifiers
    { token: 'variable', foreground: '9CDCFE' },
    { token: 'variable.parameter', foreground: '9CDCFE' },
    { token: 'identifier', foreground: '9CDCFE' },

    // YAML specific
    { token: 'key', foreground: '9CDCFE' },
    { token: 'tag', foreground: '569CD6' },
    { token: 'tag.yaml', foreground: '569CD6' },
    { token: 'attribute.name', foreground: '9CDCFE' },
    { token: 'attribute.value', foreground: 'CE9178' },

    // Boolean and null
    { token: 'constant.language.boolean', foreground: '569CD6' },
    { token: 'constant.language.null', foreground: '569CD6' },

    // Operators
    { token: 'delimiter', foreground: 'D4D4D4' },
    { token: 'delimiter.bracket', foreground: 'D4D4D4' },
    { token: 'operator', foreground: 'D4D4D4' },

    // Invalid
    { token: 'invalid', foreground: 'F44747' }
  ],
  colors: {
    // Editor backgrounds
    'editor.background': '#0a0a0f',
    'editor.foreground': '#D4D4D4',
    'editorWidget.background': '#141418',
    'editorWidget.foreground': '#D4D4D4',
    'editorWidget.border': '#262630',

    // Line highlighting
    'editor.lineHighlightBackground': '#1a1a2e',
    'editor.lineHighlightBorder': '#00000000',

    // Selection
    'editor.selectionBackground': '#264F78',
    'editor.inactiveSelectionBackground': '#3A3D41',
    'editor.selectionHighlightBackground': '#3A3D4180',

    // Cursor
    'editorCursor.foreground': '#A855F7',
    'editorCursor.background': '#0a0a0f',

    // Whitespace
    'editorWhitespace.foreground': '#3B3B3B',

    // Line numbers
    'editorLineNumber.foreground': '#5A5A5A',
    'editorLineNumber.activeForeground': '#C6C6C6',

    // Indent guides
    'editorIndentGuide.background': '#404040',
    'editorIndentGuide.activeBackground': '#707070',

    // Brackets
    'editorBracketMatch.background': '#0D3A58',
    'editorBracketMatch.border': '#888888',
    'editorBracketHighlight.foreground1': '#FFD700',
    'editorBracketHighlight.foreground2': '#DA70D6',
    'editorBracketHighlight.foreground3': '#179FFF',

    // Gutter
    'editorGutter.background': '#0a0a0f',
    'editorGutter.addedBackground': '#587C0C',
    'editorGutter.modifiedBackground': '#0C7D9D',
    'editorGutter.deletedBackground': '#94151B',

    // Overview ruler
    'editorOverviewRuler.border': '#1a1a2e',
    'editorOverviewRuler.findMatchForeground': '#FFD70080',
    'editorOverviewRuler.errorForeground': '#F4433680',
    'editorOverviewRuler.warningForeground': '#FF980080',
    'editorOverviewRuler.infoForeground': '#2196F380',

    // Scrollbar
    'scrollbar.shadow': '#000000',
    'scrollbarSlider.background': '#4A4A4A50',
    'scrollbarSlider.hoverBackground': '#5A5A5A80',
    'scrollbarSlider.activeBackground': '#6A6A6AA0',

    // Minimap
    'minimap.background': '#0a0a0f',
    'minimap.selectionHighlight': '#264F78',
    'minimap.findMatchHighlight': '#FFD700',
    'minimap.errorHighlight': '#F44336',
    'minimap.warningHighlight': '#FF9800',
    'minimapSlider.background': '#4A4A4A30',
    'minimapSlider.hoverBackground': '#4A4A4A50',
    'minimapSlider.activeBackground': '#4A4A4A70',

    // Error/warning markers
    'editorError.foreground': '#F44336',
    'editorError.background': '#F4433610',
    'editorWarning.foreground': '#FF9800',
    'editorWarning.background': '#FF980010',
    'editorInfo.foreground': '#2196F3',
    'editorInfo.background': '#2196F310',
    'editorHint.foreground': '#EEEEEE',

    // Suggestions/autocomplete
    'editorSuggestWidget.background': '#141418',
    'editorSuggestWidget.border': '#262630',
    'editorSuggestWidget.foreground': '#D4D4D4',
    'editorSuggestWidget.selectedBackground': '#264F78',
    'editorSuggestWidget.highlightForeground': '#A855F7',
    'editorSuggestWidget.focusHighlightForeground': '#A855F7',

    // Hover widget
    'editorHoverWidget.background': '#141418',
    'editorHoverWidget.border': '#262630',
    'editorHoverWidget.foreground': '#D4D4D4',

    // Find/replace
    'editor.findMatchBackground': '#FFD70040',
    'editor.findMatchHighlightBackground': '#FFD70030',
    'editor.findRangeHighlightBackground': '#3A3D4140',

    // Peek view
    'peekView.border': '#A855F7',
    'peekViewEditor.background': '#0a0a0f',
    'peekViewEditorGutter.background': '#0a0a0f',
    'peekViewResult.background': '#141418',
    'peekViewTitle.background': '#141418',

    // Sticky scroll
    'editorStickyScroll.background': '#0a0a0f',
    'editorStickyScrollHover.background': '#1a1a2e',

    // Focus border
    'focusBorder': '#A855F7'
  }
};

// ============================================
// AgentOS Light Theme
// ============================================

export const agentOSLightTheme: MonacoThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    // Comments
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    { token: 'comment.yaml', foreground: '008000', fontStyle: 'italic' },

    // Keywords and types
    { token: 'keyword', foreground: '0000FF' },
    { token: 'keyword.control', foreground: 'AF00DB' },
    { token: 'type', foreground: '267F99' },

    // Strings
    { token: 'string', foreground: 'A31515' },
    { token: 'string.yaml', foreground: 'A31515' },
    { token: 'string.key', foreground: '001080' },

    // Numbers
    { token: 'number', foreground: '098658' },
    { token: 'number.yaml', foreground: '098658' },

    // Variables
    { token: 'variable', foreground: '001080' },
    { token: 'key', foreground: '001080' },

    // Boolean and null
    { token: 'constant.language.boolean', foreground: '0000FF' },
    { token: 'constant.language.null', foreground: '0000FF' }
  ],
  colors: {
    // Editor backgrounds
    'editor.background': '#FFFFFF',
    'editor.foreground': '#000000',
    'editorWidget.background': '#F8F8F8',
    'editorWidget.foreground': '#000000',
    'editorWidget.border': '#E2E8F0',

    // Line highlighting
    'editor.lineHighlightBackground': '#F7F7F7',
    'editor.lineHighlightBorder': '#00000000',

    // Selection
    'editor.selectionBackground': '#ADD6FF',
    'editor.inactiveSelectionBackground': '#E5EBF1',
    'editor.selectionHighlightBackground': '#ADD6FF80',

    // Cursor
    'editorCursor.foreground': '#7C3AED',
    'editorCursor.background': '#FFFFFF',

    // Line numbers
    'editorLineNumber.foreground': '#999999',
    'editorLineNumber.activeForeground': '#333333',

    // Indent guides
    'editorIndentGuide.background': '#D3D3D3',
    'editorIndentGuide.activeBackground': '#939393',

    // Brackets
    'editorBracketMatch.background': '#E4F2FF',
    'editorBracketMatch.border': '#0078D7',

    // Gutter
    'editorGutter.background': '#FFFFFF',
    'editorGutter.addedBackground': '#81B88B',
    'editorGutter.modifiedBackground': '#66AFE0',
    'editorGutter.deletedBackground': '#CA4B51',

    // Minimap
    'minimap.background': '#FFFFFF',
    'minimapSlider.background': '#00000020',

    // Errors/warnings
    'editorError.foreground': '#D32F2F',
    'editorWarning.foreground': '#F57C00',
    'editorInfo.foreground': '#1976D2',

    // Suggestions
    'editorSuggestWidget.background': '#FFFFFF',
    'editorSuggestWidget.border': '#E2E8F0',
    'editorSuggestWidget.selectedBackground': '#E4F2FF',
    'editorSuggestWidget.highlightForeground': '#7C3AED',

    // Focus border
    'focusBorder': '#7C3AED'
  }
};

// ============================================
// Keybinding Configuration
// ============================================

export function getKeybindings(
  monaco: typeof import('monaco-editor')
): KeybindingConfig[] {
  return [
    // Save
    {
      key: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      command: 'agentos.save'
    },
    // Format document
    {
      key: monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      command: 'editor.action.formatDocument'
    },
    // Go to line
    {
      key: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG,
      command: 'editor.action.gotoLine'
    },
    // Duplicate line
    {
      key: monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow,
      command: 'editor.action.copyLinesDownAction'
    },
    // Toggle comment
    {
      key: monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash,
      command: 'editor.action.commentLine'
    },
    // Fold all
    {
      key: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketLeft,
      command: 'editor.foldAll'
    },
    // Unfold all
    {
      key: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketRight,
      command: 'editor.unfoldAll'
    },
    // Find
    {
      key: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
      command: 'actions.find'
    },
    // Replace
    {
      key: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH,
      command: 'editor.action.startFindReplaceAction'
    },
    // Move line up
    {
      key: monaco.KeyMod.Alt | monaco.KeyCode.UpArrow,
      command: 'editor.action.moveLinesUpAction'
    },
    // Move line down
    {
      key: monaco.KeyMod.Alt | monaco.KeyCode.DownArrow,
      command: 'editor.action.moveLinesDownAction'
    },
    // Select all occurrences
    {
      key: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL,
      command: 'editor.action.selectHighlights'
    },
    // Add cursor above
    {
      key: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow,
      command: 'editor.action.insertCursorAbove'
    },
    // Add cursor below
    {
      key: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow,
      command: 'editor.action.insertCursorBelow'
    }
  ];
}

// ============================================
// YAML Root Completions
// ============================================

export const yamlRootCompletions: Array<{
  key: string;
  description: string;
  snippet: string;
  required?: boolean;
}> = [
  {
    key: 'version',
    description: 'Schema version (required)',
    snippet: 'version: "${1:1.0}"',
    required: true
  },
  {
    key: 'metadata',
    description: 'Agent metadata and identification (required)',
    snippet: `metadata:
  name: \${1:my-agent}
  description: \${2:Agent description}
  version: "\${3:0.1.0}"
  author: \${4:Team Name}
  tags:
    - \${5:example}`,
    required: true
  },
  {
    key: 'identity',
    description: 'Agent identity and role definition',
    snippet: `identity:
  type: \${1|autonomous,assistive,collaborative,supervisory|}
  role: \${2:general_assistant}
  persona: |
    \${3:You are a helpful AI assistant.}
  capabilities:
    - \${4:natural_language_understanding}`
  },
  {
    key: 'model',
    description: 'AI model configuration',
    snippet: `model:
  provider: \${1|anthropic,openai,google,azure,local,custom|}
  name: \${2:claude-3-sonnet}
  parameters:
    temperature: \${3:0.7}
    maxTokens: \${4:4096}`
  },
  {
    key: 'authority',
    description: 'Permission and authority configuration',
    snippet: `authority:
  level: \${1|restricted,standard,elevated,admin|}
  permissions:
    - \${2:read:files}
    - \${3:write:files}
  restrictions:
    - \${4:no_external_api_calls}`
  },
  {
    key: 'memory',
    description: 'Memory and context configuration',
    snippet: `memory:
  shortTerm:
    enabled: true
    maxTokens: \${1:8000}
  longTerm:
    enabled: \${2:false}
    store: \${3|vector,graph,relational,hybrid|}`
  },
  {
    key: 'tools',
    description: 'Tool and capability configuration',
    snippet: `tools:
  enabled:
    - \${1:web_search}
    - \${2:calculator}
    - \${3:document_analysis}
  restrictions:
    rateLimit: \${4:100}
    timeout: \${5:30000}`
  },
  {
    key: 'gates',
    description: 'Input/output gates and filters',
    snippet: `gates:
  input:
    - name: \${1:content_safety}
      type: content_filter
      action: \${2|block,warn,log,transform|}
  output:
    - name: \${3:pii_protection}
      type: pii_redaction
      action: transform`
  },
  {
    key: 'reasoning',
    description: 'Reasoning and planning configuration',
    snippet: `reasoning:
  strategy: \${1|chain_of_thought,tree_of_thought,react,reflexion,custom|}
  depth: \${2:3}
  verification:
    enabled: \${3:true}
    method: \${4|self_consistency,cross_validation,external|}`
  },
  {
    key: 'communication',
    description: 'Communication and messaging configuration',
    snippet: `communication:
  channels:
    - type: \${1|http,websocket,grpc,message_queue,event_bus|}
  protocols:
    messaging: \${2|json,protobuf,msgpack|}
    encryption: \${3|tls,mtls,none|}`
  },
  {
    key: 'learning',
    description: 'Learning and adaptation configuration',
    snippet: `learning:
  mode: \${1|static,online,batch,reinforcement|}
  feedback:
    enabled: \${2:false}
    sources:
      - \${3|human,automated,peer,outcome|}`
  },
  {
    key: 'security',
    description: 'Security configuration',
    snippet: `security:
  authentication:
    method: \${1|api_key,oauth2,jwt,mtls,saml|}
  encryption:
    atRest: true
    inTransit: true
  audit:
    enabled: true
    level: \${2|minimal,standard,comprehensive|}`
  },
  {
    key: 'observability',
    description: 'Monitoring and observability configuration',
    snippet: `observability:
  logging:
    level: \${1|debug,info,warn,error|}
    format: \${2|json,text,structured|}
  metrics:
    enabled: true
    provider: \${3|prometheus,datadog,cloudwatch,custom|}
  tracing:
    enabled: \${4:false}
    provider: \${5|jaeger,zipkin,otel,xray|}`
  },
  {
    key: 'lifecycle',
    description: 'Agent lifecycle management',
    snippet: `lifecycle:
  startup:
    timeout: \${1:30000}
    healthCheck:
      interval: \${2:5000}
  restart:
    policy: \${3|never,on_failure,always|}
    maxRetries: \${4:3}`
  },
  {
    key: 'integration',
    description: 'External integration configuration',
    snippet: `integration:
  apis:
    - name: \${1:api_name}
      type: \${2|rest,graphql,soap,grpc|}
      baseUrl: \${3:https://api.example.com}
  databases:
    - name: \${4:db_name}
      type: \${5|postgres,mysql,mongodb,redis,elasticsearch|}`
  },
  {
    key: 'scaling',
    description: 'Scaling configuration',
    snippet: `scaling:
  mode: \${1|manual,auto,scheduled|}
  horizontal:
    minInstances: \${2:1}
    maxInstances: \${3:10}
  loadBalancing:
    strategy: \${4|round_robin,least_connections,weighted,consistent_hash|}`
  },
  {
    key: 'compliance',
    description: 'Compliance and regulatory configuration',
    snippet: `compliance:
  standards:
    - \${1|SOC2,HIPAA,GDPR,PCI-DSS,ISO27001,FedRAMP|}
  dataResidency:
    regions:
      - \${2:us-east-1}
  retention:
    policy: \${3:standard}
    duration: \${4:90d}`
  },
  {
    key: 'testing',
    description: 'Testing configuration',
    snippet: `testing:
  unit:
    enabled: true
    coverage: \${1:80}
  integration:
    enabled: true
  e2e:
    enabled: \${2:false}`
  },
  {
    key: 'deployment',
    description: 'Deployment configuration',
    snippet: `deployment:
  target: \${1|kubernetes,docker,serverless,vm,bare_metal|}
  strategy: \${2|rolling,blue_green,canary,recreate|}
  rollback:
    enabled: true
    automatic: \${3:false}`
  },
  {
    key: 'governance',
    description: 'Governance configuration',
    snippet: `governance:
  ownership:
    team: \${1:engineering}
    contact: \${2:team@example.com}
  approval:
    required: \${3:false}
  change:
    process: \${4|gitops,ticket,manual|}`
  }
];

// ============================================
// YAML Enum Values
// ============================================

export const yamlEnumValues: Record<string, string[]> = {
  // Model providers
  provider: ['anthropic', 'openai', 'google', 'azure', 'local', 'custom'],

  // Identity types
  'identity.type': ['autonomous', 'assistive', 'collaborative', 'supervisory'],

  // Authority levels
  level: ['restricted', 'standard', 'elevated', 'admin'],

  // Memory stores
  store: ['vector', 'graph', 'relational', 'hybrid'],
  indexing: ['semantic', 'keyword', 'hybrid'],

  // Reasoning strategies
  strategy: [
    'chain_of_thought',
    'tree_of_thought',
    'react',
    'reflexion',
    'custom'
  ],

  // Gate types
  'gates.input.type': [
    'content_filter',
    'schema_validation',
    'rate_limit',
    'authentication',
    'custom'
  ],
  'gates.output.type': [
    'content_filter',
    'pii_redaction',
    'format_validation',
    'approval',
    'custom'
  ],
  action: ['block', 'warn', 'log', 'transform'],

  // Communication
  'channels.type': ['http', 'websocket', 'grpc', 'message_queue', 'event_bus'],
  messaging: ['json', 'protobuf', 'msgpack'],
  compression: ['gzip', 'lz4', 'none'],
  encryption: ['tls', 'mtls', 'none'],

  // Learning modes
  mode: ['static', 'online', 'batch', 'reinforcement', 'manual', 'auto', 'scheduled'],
  sources: ['human', 'automated', 'peer', 'outcome'],

  // Security
  method: ['api_key', 'oauth2', 'jwt', 'mtls', 'saml'],
  model: ['rbac', 'abac', 'pbac', 'custom'],

  // Observability
  'logging.level': ['debug', 'info', 'warn', 'error'],
  format: ['json', 'text', 'structured'],
  'metrics.provider': ['prometheus', 'datadog', 'cloudwatch', 'custom'],
  'tracing.provider': ['jaeger', 'zipkin', 'otel', 'xray'],
  severity: ['info', 'warning', 'critical'],

  // Lifecycle
  policy: ['never', 'on_failure', 'always'],

  // Integration
  'apis.type': ['rest', 'graphql', 'soap', 'grpc'],
  'databases.type': ['postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch'],
  'messageQueues.type': ['rabbitmq', 'kafka', 'sqs', 'pubsub'],

  // Scaling
  'loadBalancing.strategy': [
    'round_robin',
    'least_connections',
    'weighted',
    'consistent_hash'
  ],

  // Compliance
  standards: ['SOC2', 'HIPAA', 'GDPR', 'PCI-DSS', 'ISO27001', 'FedRAMP'],
  deletion: ['soft', 'hard'],

  // Deployment
  target: ['kubernetes', 'docker', 'serverless', 'vm', 'bare_metal'],
  'deployment.strategy': ['rolling', 'blue_green', 'canary', 'recreate'],

  // Governance
  process: ['gitops', 'ticket', 'manual']
};

// ============================================
// Hover Documentation
// ============================================

export const hoverDocumentation: Record<
  string,
  { title: string; description: string; type?: string }
> = {
  version: {
    title: 'Schema Version',
    description: 'The version of the agent configuration schema. Required field.',
    type: 'string ("1.0", "1.1", "2.0")'
  },
  metadata: {
    title: 'Agent Metadata',
    description:
      'Contains identifying information about the agent including name, description, version, and tags.',
    type: 'object'
  },
  identity: {
    title: 'Agent Identity',
    description:
      'Defines the agent\'s operational type, role, and persona. Determines how the agent behaves and interacts.',
    type: 'object'
  },
  model: {
    title: 'Model Configuration',
    description:
      'AI model settings including provider, model name, and inference parameters like temperature and max tokens.',
    type: 'object'
  },
  authority: {
    title: 'Authority & Permissions',
    description:
      'Configures what the agent is allowed to do, including permission levels and specific grants/restrictions.',
    type: 'object'
  },
  memory: {
    title: 'Memory Configuration',
    description:
      'Controls short-term, long-term, and episodic memory systems for context retention.',
    type: 'object'
  },
  tools: {
    title: 'Tools & Capabilities',
    description:
      'Defines which built-in and custom tools the agent can use, along with usage restrictions.',
    type: 'object'
  },
  gates: {
    title: 'Gates & Filters',
    description:
      'Input/output processing gates for content filtering, validation, and transformation.',
    type: 'object'
  },
  reasoning: {
    title: 'Reasoning Strategy',
    description:
      'Configures how the agent approaches complex problems, including planning and verification.',
    type: 'object'
  },
  communication: {
    title: 'Communication Channels',
    description:
      'Defines how the agent communicates, including protocols and multi-agent coordination.',
    type: 'object'
  },
  learning: {
    title: 'Learning Mode',
    description:
      'Configures agent learning and adaptation, including feedback sources and evaluation.',
    type: 'object'
  },
  security: {
    title: 'Security Configuration',
    description:
      'Authentication, authorization, encryption, and audit settings for secure operations.',
    type: 'object'
  },
  observability: {
    title: 'Observability',
    description:
      'Logging, metrics, tracing, and alerting configuration for monitoring the agent.',
    type: 'object'
  },
  lifecycle: {
    title: 'Lifecycle Management',
    description:
      'Startup, shutdown, restart policies, and maintenance window configuration.',
    type: 'object'
  },
  integration: {
    title: 'External Integrations',
    description:
      'API, database, message queue, and webhook integrations for external connectivity.',
    type: 'object'
  },
  scaling: {
    title: 'Scaling Configuration',
    description:
      'Horizontal and vertical scaling settings, load balancing, and auto-scaling rules.',
    type: 'object'
  },
  compliance: {
    title: 'Compliance & Regulatory',
    description:
      'Compliance standards, data residency, retention policies, and certifications.',
    type: 'object'
  },
  testing: {
    title: 'Testing Configuration',
    description:
      'Unit, integration, E2E, performance, and chaos testing configuration.',
    type: 'object'
  },
  deployment: {
    title: 'Deployment Configuration',
    description:
      'Deployment target, strategy, environments, and rollback settings.',
    type: 'object'
  },
  governance: {
    title: 'Governance',
    description:
      'Ownership, approval workflows, change management, and documentation requirements.',
    type: 'object'
  },
  // Value documentation
  anthropic: {
    title: 'Anthropic',
    description: 'Anthropic Claude models - Industry-leading AI for safety and capability.'
  },
  openai: {
    title: 'OpenAI',
    description: 'OpenAI GPT models - Widely used generative AI.'
  },
  google: {
    title: 'Google AI',
    description: 'Google Gemini and PaLM models.'
  },
  azure: {
    title: 'Azure OpenAI',
    description: 'Microsoft-hosted OpenAI models with enterprise features.'
  },
  autonomous: {
    title: 'Autonomous Agent',
    description: 'Agent operates independently without human intervention.'
  },
  assistive: {
    title: 'Assistive Agent',
    description: 'Agent assists human operators with tasks and decisions.'
  },
  collaborative: {
    title: 'Collaborative Agent',
    description: 'Agent works alongside other agents in a team.'
  },
  supervisory: {
    title: 'Supervisory Agent',
    description: 'Agent oversees and coordinates other agents.'
  },
  chain_of_thought: {
    title: 'Chain of Thought',
    description: 'Step-by-step reasoning for complex problems.'
  },
  tree_of_thought: {
    title: 'Tree of Thought',
    description: 'Branching exploration of multiple solution paths.'
  },
  react: {
    title: 'ReAct',
    description: 'Reasoning and Acting paradigm for tool use.'
  },
  reflexion: {
    title: 'Reflexion',
    description: 'Self-reflective reasoning with iterative improvement.'
  }
};

// ============================================
// Editor Options Configuration
// ============================================

export function getEditorOptions(settings?: Partial<{
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  readOnly: boolean;
}>): editor.IStandaloneEditorConstructionOptions {
  return {
    // Font settings
    fontSize: settings?.fontSize ?? 14,
    fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
    fontLigatures: true,
    fontWeight: 'normal',

    // Tab settings
    tabSize: settings?.tabSize ?? 2,
    insertSpaces: true,
    detectIndentation: true,

    // Word wrap
    wordWrap: settings?.wordWrap ?? 'on',
    wrappingStrategy: 'advanced',
    wordWrapColumn: 80,

    // Line numbers
    lineNumbers: settings?.lineNumbers ?? 'on',
    lineNumbersMinChars: 4,
    glyphMargin: true,

    // Minimap
    minimap: {
      enabled: settings?.minimap ?? true,
      maxColumn: 80,
      renderCharacters: false,
      showSlider: 'mouseover',
      side: 'right'
    },

    // Folding
    folding: true,
    foldingStrategy: 'indentation',
    foldingHighlight: true,
    showFoldingControls: 'always',
    unfoldOnClickAfterEndOfLine: false,

    // Scrolling
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      useShadows: true,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      arrowSize: 0
    },

    // Cursor
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    cursorStyle: 'line',
    cursorWidth: 2,

    // Rendering
    renderWhitespace: 'selection',
    renderLineHighlight: 'all',
    renderLineHighlightOnlyWhenFocus: false,
    renderControlCharacters: false,

    // Brackets
    bracketPairColorization: {
      enabled: true,
      independentColorPoolPerBracketType: true
    },
    guides: {
      indentation: true,
      bracketPairs: true,
      bracketPairsHorizontal: true,
      highlightActiveIndentation: true,
      highlightActiveBracketPair: true
    },
    matchBrackets: 'always',

    // Suggestions
    suggestOnTriggerCharacters: true,
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true
    },
    acceptSuggestionOnEnter: 'on',
    snippetSuggestions: 'top',
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showClasses: true,
      showFunctions: true,
      showVariables: true,
      showConstants: true,
      preview: true,
      previewMode: 'subwordSmart',
      filterGraceful: true,
      localityBonus: true
    },

    // Auto features
    autoIndent: 'full',
    formatOnPaste: true,
    formatOnType: true,
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoSurround: 'languageDefined',

    // Padding
    padding: {
      top: 16,
      bottom: 16
    },

    // Sticky scroll
    stickyScroll: {
      enabled: true,
      maxLineCount: 5
    },

    // Overview ruler
    overviewRulerLanes: 3,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: false,

    // Other features
    readOnly: settings?.readOnly ?? false,
    contextmenu: true,
    mouseWheelZoom: true,
    links: true,
    colorDecorators: true,
    accessibilitySupport: 'auto',
    inlineSuggest: {
      enabled: true
    },
    unicodeHighlight: {
      ambiguousCharacters: false
    },
    automaticLayout: true,
    dragAndDrop: true,
    copyWithSyntaxHighlighting: true
  };
}

// ============================================
// Exports
// ============================================

export default {
  agentOSDarkTheme,
  agentOSLightTheme,
  getKeybindings,
  yamlRootCompletions,
  yamlEnumValues,
  hoverDocumentation,
  getEditorOptions
};
