/**
 * AgentOS Studio - YAML Editor Components
 * Export all YAML editor related components
 */

export { YAMLEditor, type YAMLEditorProps } from './YAMLEditor';
export { MonacoWrapper, type MonacoEditorRef } from './MonacoWrapper';
export { YAMLToolbar, type YAMLToolbarProps } from './YAMLToolbar';
export { YAMLValidation, type ValidationError, type YAMLValidationProps } from './YAMLValidation';
export {
  EditorSettings,
  defaultEditorSettings,
  type EditorSettings as EditorSettingsType,
  type EditorSettingsProps
} from './EditorSettings';

// Re-export schema utilities
export {
  agentYAMLJSONSchema,
  defaultAgentYAML,
  getMonacoYAMLSchema
} from '@/lib/studio/yamlSchema';

// Re-export Monaco configuration
export {
  agentOSDarkTheme,
  agentOSLightTheme,
  getKeybindings,
  yamlRootCompletions,
  yamlEnumValues,
  hoverDocumentation,
  getEditorOptions
} from '@/lib/studio/monacoConfig';
