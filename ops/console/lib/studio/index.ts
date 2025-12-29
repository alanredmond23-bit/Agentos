/**
 * AgentOS Studio - Library Exports
 */

export { studioStorage } from './storage';
export type { StudioStorage } from './storage';

export { yamlParser } from './yamlParser';
export type { YAMLParser } from './yamlParser';

export { schemaValidator } from './schemaValidator';
export type { SchemaValidator } from './schemaValidator';

export { virtualFileSystem } from './fileSystem';
export type { VirtualFileSystem } from './fileSystem';

// Form/YAML Bidirectional Sync
export {
  FormYamlSyncManager,
  useFormYamlSync,
  formToYaml,
  yamlToForm,
  formToJson,
  validateFormData,
  validateYamlSyntax,
  detectConflicts,
  DEFAULT_FORM_DATA,
} from './formYamlSync';
export type {
  AgentFormData,
  ToolConfig,
  CapabilityConfig,
  RateLimitConfig,
  RetryPolicyConfig,
  ValidationError,
  ValidationResult,
  SyncState,
  SyncConflict,
  SyncCallback,
} from './formYamlSync';

// YAML Schema
export {
  agentYAMLJSONSchema,
  defaultAgentYAML,
  getMonacoYAMLSchema,
} from './yamlSchema';
export type {
  AgentYAMLSchema,
} from './yamlSchema';

// Monaco Configuration
export {
  agentOSDarkTheme,
  agentOSLightTheme,
  getKeybindings,
  yamlRootCompletions,
  yamlEnumValues,
  hoverDocumentation,
  getEditorOptions,
} from './monacoConfig';
export type {
  MonacoThemeData,
  KeybindingConfig,
  CompletionItemConfig,
} from './monacoConfig';

// Graph Builder Utilities
export {
  buildDependencyGraph,
  detectConflicts as detectGraphConflicts,
  layoutGraph,
  highlightPath,
  searchNodes,
  filterByPack,
  filterEdges,
  exportGraphAsJson,
  exportGraphAsDot,
} from './graphBuilder';
export type {
  Pack,
  Agent,
  PackDependency,
  GraphNode,
  GraphEdge,
  PackNodeData,
  AgentNodeData,
  AgentInfo,
  EdgeData,
  Position,
  DependencyGraphResult,
  Conflict,
  GraphStats,
  LayoutType,
  LayoutOptions,
} from './graphBuilder';
