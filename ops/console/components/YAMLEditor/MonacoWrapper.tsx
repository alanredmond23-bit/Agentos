/**
 * AgentOS Studio - Monaco Editor Wrapper
 * React wrapper for Monaco editor with YAML language support
 */

'use client';

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import Editor, { OnMount, OnChange, useMonaco } from '@monaco-editor/react';
import type { editor, IDisposable, Position } from 'monaco-editor';

import { getMonacoYAMLSchema, agentYAMLJSONSchema } from '@/lib/studio/yamlSchema';
import type { ValidationError } from './YAMLValidation';

// ============================================
// Types
// ============================================

export interface MonacoEditorRef {
  format: () => void;
  undo: () => void;
  redo: () => void;
  openSearch: () => void;
  foldAll: () => void;
  unfoldAll: () => void;
  goToLine: (line: number) => void;
  focus: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
  setMinimap: (enabled: boolean) => void;
}

interface MonacoWrapperProps {
  value: string;
  onChange: (value: string | undefined) => void;
  onCursorChange?: (line: number, column: number) => void;
  onSelectionChange?: (selectedText: string) => void;
  onLineCountChange?: (lineCount: number) => void;
  validationErrors?: ValidationError[];
  theme?: 'light' | 'dark';
  readOnly?: boolean;
  minimapEnabled?: boolean;
  fontSize?: number;
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  showLineNumbers?: boolean;
}

// ============================================
// Custom Theme Definitions
// ============================================

const darkTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'keyword', foreground: '569CD6' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'type', foreground: '4EC9B0' },
    { token: 'variable', foreground: '9CDCFE' },
    { token: 'tag', foreground: '569CD6' },
    { token: 'attribute.name', foreground: '9CDCFE' },
    { token: 'attribute.value', foreground: 'CE9178' },
    // YAML-specific tokens
    { token: 'key', foreground: '9CDCFE' },
    { token: 'string.yaml', foreground: 'CE9178' },
    { token: 'number.yaml', foreground: 'B5CEA8' },
    { token: 'comment.yaml', foreground: '6A9955', fontStyle: 'italic' }
  ],
  colors: {
    'editor.background': '#0a0a0f',
    'editor.foreground': '#D4D4D4',
    'editor.lineHighlightBackground': '#1a1a2e',
    'editor.selectionBackground': '#264F78',
    'editor.inactiveSelectionBackground': '#3A3D41',
    'editorCursor.foreground': '#AEAFAD',
    'editorWhitespace.foreground': '#3B3B3B',
    'editorLineNumber.foreground': '#5A5A5A',
    'editorLineNumber.activeForeground': '#C6C6C6',
    'editorIndentGuide.background': '#404040',
    'editorIndentGuide.activeBackground': '#707070',
    'editor.selectionHighlightBackground': '#3A3D41',
    'editorBracketMatch.background': '#0D3A58',
    'editorBracketMatch.border': '#888888',
    'editorGutter.background': '#0a0a0f',
    'editorOverviewRuler.border': '#1a1a2e',
    'scrollbar.shadow': '#000000',
    'scrollbarSlider.background': '#4A4A4A50',
    'scrollbarSlider.hoverBackground': '#5A5A5A80',
    'scrollbarSlider.activeBackground': '#6A6A6AA0',
    'minimap.background': '#0a0a0f',
    'minimap.selectionHighlight': '#264F78',
    'minimap.findMatchHighlight': '#FFD700',
    'editorError.foreground': '#f44336',
    'editorWarning.foreground': '#ff9800',
    'editorInfo.foreground': '#2196f3'
  }
};

const lightTheme: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    { token: 'keyword', foreground: '0000FF' },
    { token: 'string', foreground: 'A31515' },
    { token: 'number', foreground: '098658' },
    { token: 'type', foreground: '267F99' },
    { token: 'variable', foreground: '001080' },
    // YAML-specific tokens
    { token: 'key', foreground: '001080' },
    { token: 'string.yaml', foreground: 'A31515' },
    { token: 'number.yaml', foreground: '098658' },
    { token: 'comment.yaml', foreground: '008000', fontStyle: 'italic' }
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#000000',
    'editor.lineHighlightBackground': '#F7F7F7',
    'editor.selectionBackground': '#ADD6FF',
    'editorCursor.foreground': '#000000',
    'editorLineNumber.foreground': '#999999',
    'editorLineNumber.activeForeground': '#333333',
    'editorIndentGuide.background': '#D3D3D3',
    'editorIndentGuide.activeBackground': '#939393',
    'editorGutter.background': '#FFFFFF',
    'minimap.background': '#FFFFFF',
    'editorError.foreground': '#d32f2f',
    'editorWarning.foreground': '#f57c00',
    'editorInfo.foreground': '#1976d2'
  }
};

// ============================================
// Monaco Editor Wrapper Component
// ============================================

export const MonacoWrapper = forwardRef<MonacoEditorRef, MonacoWrapperProps>(
  function MonacoWrapper(
    {
      value,
      onChange,
      onCursorChange,
      onSelectionChange,
      onLineCountChange,
      validationErrors = [],
      theme = 'dark',
      readOnly = false,
      minimapEnabled = true,
      fontSize = 14,
      wordWrap = 'on',
      showLineNumbers = true
    },
    ref
  ) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
    const decorationsRef = useRef<string[]>([]);
    const disposablesRef = useRef<IDisposable[]>([]);
    const [internalMinimapEnabled, setInternalMinimapEnabled] = useState(minimapEnabled);
    const monaco = useMonaco();

    // Sync minimap state
    useEffect(() => {
      setInternalMinimapEnabled(minimapEnabled);
    }, [minimapEnabled]);

    // Setup Monaco YAML configuration
    useEffect(() => {
      if (!monaco) return;

      // Define custom themes
      monaco.editor.defineTheme('agentos-dark', darkTheme);
      monaco.editor.defineTheme('agentos-light', lightTheme);

      // Configure YAML language
      monaco.languages.register({ id: 'yaml' });

      // Register completion provider for YAML
      const completionDisposable = monaco.languages.registerCompletionItemProvider('yaml', {
        triggerCharacters: [' ', ':', '-', '\n'],
        provideCompletionItems: (model, position) => {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          });

          const suggestions = generateCompletionItems(
            monaco,
            textUntilPosition,
            position,
            model
          );

          return { suggestions };
        }
      });

      // Register hover provider
      const hoverDisposable = monaco.languages.registerHoverProvider('yaml', {
        provideHover: (model, position) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          const hoverContent = getHoverContent(word.word, model, position);
          if (!hoverContent) return null;

          return {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endLineNumber: position.lineNumber,
              endColumn: word.endColumn
            },
            contents: [{ value: hoverContent }]
          };
        }
      });

      // Register document formatting provider
      const formatDisposable = monaco.languages.registerDocumentFormattingEditProvider('yaml', {
        provideDocumentFormattingEdits: (model) => {
          const text = model.getValue();
          try {
            // Simple YAML formatting: normalize indentation
            const lines = text.split('\n');
            const formattedLines: string[] = [];
            let currentIndent = 0;

            for (const line of lines) {
              const trimmed = line.trim();

              if (!trimmed || trimmed.startsWith('#')) {
                formattedLines.push(line);
                continue;
              }

              // Detect if this line decreases indent (is a key at lower level)
              const match = line.match(/^(\s*)/);
              const lineIndent = match ? match[1].length : 0;

              formattedLines.push(line);
            }

            return [{
              range: model.getFullModelRange(),
              text: formattedLines.join('\n')
            }];
          } catch {
            return [];
          }
        }
      });

      disposablesRef.current.push(completionDisposable, hoverDisposable, formatDisposable);

      return () => {
        disposablesRef.current.forEach(d => d.dispose());
        disposablesRef.current = [];
      };
    }, [monaco]);

    // Update editor decorations for validation errors
    useEffect(() => {
      if (!editorRef.current || !monacoRef.current) return;

      const newDecorations: editor.IModelDeltaDecoration[] = validationErrors.map(error => ({
        range: {
          startLineNumber: error.line,
          startColumn: 1,
          endLineNumber: error.line,
          endColumn: 1000
        },
        options: {
          isWholeLine: true,
          className: error.severity === 'error' ? 'yaml-error-line' : 'yaml-warning-line',
          glyphMarginClassName: error.severity === 'error' ? 'yaml-error-glyph' : 'yaml-warning-glyph',
          glyphMarginHoverMessage: { value: error.message },
          hoverMessage: { value: `**${error.severity.toUpperCase()}**: ${error.message}` },
          overviewRuler: {
            color: error.severity === 'error' ? '#f44336' : '#ff9800',
            position: monacoRef.current.editor.OverviewRulerLane.Right
          },
          minimap: {
            color: error.severity === 'error' ? '#f44336' : '#ff9800',
            position: monacoRef.current.editor.MinimapPosition.Gutter
          }
        }
      }));

      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        newDecorations
      );
    }, [validationErrors]);

    // Update minimap setting
    useEffect(() => {
      if (editorRef.current) {
        editorRef.current.updateOptions({
          minimap: {
            enabled: internalMinimapEnabled,
            maxColumn: 80,
            renderCharacters: false,
            showSlider: 'mouseover'
          }
        });
      }
    }, [internalMinimapEnabled]);

    // Expose editor methods via ref
    useImperativeHandle(ref, () => ({
      format: () => {
        editorRef.current?.getAction('editor.action.formatDocument')?.run();
      },
      undo: () => {
        editorRef.current?.trigger('keyboard', 'undo', null);
      },
      redo: () => {
        editorRef.current?.trigger('keyboard', 'redo', null);
      },
      openSearch: () => {
        editorRef.current?.getAction('actions.find')?.run();
      },
      foldAll: () => {
        editorRef.current?.getAction('editor.foldAll')?.run();
      },
      unfoldAll: () => {
        editorRef.current?.getAction('editor.unfoldAll')?.run();
      },
      goToLine: (line: number) => {
        editorRef.current?.revealLineInCenter(line);
        editorRef.current?.setPosition({ lineNumber: line, column: 1 });
        editorRef.current?.focus();
      },
      focus: () => {
        editorRef.current?.focus();
      },
      getValue: () => {
        return editorRef.current?.getValue() || '';
      },
      setValue: (newValue: string) => {
        editorRef.current?.setValue(newValue);
      },
      setMinimap: (enabled: boolean) => {
        setInternalMinimapEnabled(enabled);
      }
    }), []);

    // Handle editor mount
    const handleEditorMount: OnMount = useCallback((editor, monacoInstance) => {
      editorRef.current = editor;
      monacoRef.current = monacoInstance;

      // Set initial theme
      monacoInstance.editor.setTheme(theme === 'dark' ? 'agentos-dark' : 'agentos-light');

      // Track cursor position
      editor.onDidChangeCursorPosition((e) => {
        onCursorChange?.(e.position.lineNumber, e.position.column);
      });

      // Track selection
      editor.onDidChangeCursorSelection((e) => {
        const selection = editor.getModel()?.getValueInRange(e.selection);
        onSelectionChange?.(selection || '');
      });

      // Track line count
      const model = editor.getModel();
      if (model) {
        onLineCountChange?.(model.getLineCount());
        model.onDidChangeContent(() => {
          onLineCountChange?.(model.getLineCount());
        });
      }

      // Add keyboard shortcuts
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
        // Save command - handled by parent
      });

      editor.addCommand(monacoInstance.KeyMod.Alt | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyF, () => {
        editor.getAction('editor.action.formatDocument')?.run();
      });

      // Go to line shortcut
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyG, () => {
        editor.getAction('editor.action.gotoLine')?.run();
      });

      // Add custom actions
      editor.addAction({
        id: 'agentos.duplicateLine',
        label: 'Duplicate Line',
        keybindings: [
          monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.DownArrow
        ],
        run: (ed) => {
          const selection = ed.getSelection();
          if (!selection) return;

          const model = ed.getModel();
          if (!model) return;

          const line = model.getLineContent(selection.startLineNumber);
          const range = {
            startLineNumber: selection.startLineNumber,
            startColumn: model.getLineMaxColumn(selection.startLineNumber),
            endLineNumber: selection.startLineNumber,
            endColumn: model.getLineMaxColumn(selection.startLineNumber)
          };

          ed.executeEdits('duplicateLine', [{
            range,
            text: '\n' + line
          }]);
        }
      });
    }, [theme, onCursorChange, onSelectionChange, onLineCountChange]);

    // Handle value change
    const handleChange: OnChange = useCallback((newValue) => {
      onChange(newValue);
    }, [onChange]);

    // Update theme when prop changes
    useEffect(() => {
      if (monacoRef.current) {
        monacoRef.current.editor.setTheme(theme === 'dark' ? 'agentos-dark' : 'agentos-light');
      }
    }, [theme]);

    return (
      <>
        <style jsx global>{`
          .yaml-error-line {
            background-color: rgba(244, 67, 54, 0.1) !important;
          }
          .yaml-warning-line {
            background-color: rgba(255, 152, 0, 0.1) !important;
          }
          .yaml-error-glyph {
            background-color: #f44336;
            border-radius: 50%;
            margin-left: 5px;
            width: 8px !important;
            height: 8px !important;
          }
          .yaml-warning-glyph {
            background-color: #ff9800;
            border-radius: 50%;
            margin-left: 5px;
            width: 8px !important;
            height: 8px !important;
          }
          .monaco-editor .suggest-widget {
            border-radius: 8px !important;
            overflow: hidden;
          }
          .monaco-editor .hover-contents {
            border-radius: 6px !important;
          }
          .monaco-editor .parameter-hints-widget {
            border-radius: 6px !important;
          }
        `}</style>
        <Editor
          height="100%"
          language="yaml"
          value={value}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme={theme === 'dark' ? 'agentos-dark' : 'agentos-light'}
          options={{
            readOnly,
            minimap: {
              enabled: internalMinimapEnabled,
              maxColumn: 80,
              renderCharacters: false,
              showSlider: 'mouseover'
            },
            lineNumbers: showLineNumbers ? 'on' : 'off',
            lineNumbersMinChars: 4,
            glyphMargin: true,
            folding: true,
            foldingStrategy: 'indentation',
            foldingHighlight: true,
            showFoldingControls: 'always',
            wordWrap,
            wrappingStrategy: 'advanced',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderWhitespace: 'selection',
            renderLineHighlight: 'all',
            renderLineHighlightOnlyWhenFocus: false,
            bracketPairColorization: {
              enabled: true
            },
            guides: {
              indentation: true,
              bracketPairs: true,
              highlightActiveIndentation: true
            },
            padding: {
              top: 16,
              bottom: 16
            },
            fontSize,
            fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
            fontLigatures: true,
            tabSize: 2,
            insertSpaces: true,
            autoIndent: 'full',
            formatOnPaste: true,
            formatOnType: true,
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
              previewMode: 'subwordSmart'
            },
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: true,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10
            },
            overviewRulerLanes: 3,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: false,
            automaticLayout: true,
            contextmenu: true,
            mouseWheelZoom: true,
            links: true,
            colorDecorators: true,
            accessibilitySupport: 'auto',
            stickyScroll: {
              enabled: true,
              maxLineCount: 5
            },
            inlineSuggest: {
              enabled: true
            },
            unicodeHighlight: {
              ambiguousCharacters: false
            }
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-slate-900">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-slate-400 text-sm">Loading editor...</div>
              </div>
            </div>
          }
        />
      </>
    );
  }
);

// ============================================
// Completion Items Generator
// ============================================

function generateCompletionItems(
  monaco: typeof import('monaco-editor'),
  textUntilPosition: string,
  position: Position,
  model: editor.ITextModel
): editor.languages.CompletionItem[] {
  const suggestions: editor.languages.CompletionItem[] = [];
  const range = {
    startLineNumber: position.lineNumber,
    startColumn: position.column,
    endLineNumber: position.lineNumber,
    endColumn: position.column
  };

  // Determine context from indentation and parent keys
  const lines = textUntilPosition.split('\n');
  const currentLine = lines[lines.length - 1];
  const currentIndent = currentLine.search(/\S|$/);
  const isAfterColon = currentLine.trim().endsWith(':');
  const isNewLine = currentLine.trim() === '';

  // Root level suggestions
  if (currentIndent === 0 || isNewLine) {
    const rootKeys = [
      { key: 'version', desc: 'Schema version (required)', snippet: 'version: "1.0"' },
      { key: 'metadata', desc: 'Agent metadata and identification (required)', snippet: 'metadata:\n  name: ${1:my-agent}\n  description: ${2:Agent description}\n  version: "${3:0.1.0}"' },
      { key: 'identity', desc: 'Agent identity and role definition', snippet: 'identity:\n  type: ${1|autonomous,assistive,collaborative,supervisory|}\n  role: ${2:general_assistant}' },
      { key: 'model', desc: 'AI model configuration', snippet: 'model:\n  provider: ${1|anthropic,openai,google,azure,local,custom|}\n  name: ${2:claude-3-sonnet}\n  parameters:\n    temperature: ${3:0.7}\n    maxTokens: ${4:4096}' },
      { key: 'authority', desc: 'Permission and authority configuration', snippet: 'authority:\n  level: ${1|restricted,standard,elevated,admin|}\n  permissions:\n    - ${2:read:files}' },
      { key: 'memory', desc: 'Memory and context configuration', snippet: 'memory:\n  shortTerm:\n    enabled: true\n    maxTokens: 8000\n  longTerm:\n    enabled: false' },
      { key: 'tools', desc: 'Tool and capability configuration', snippet: 'tools:\n  enabled:\n    - ${1:web_search}\n    - ${2:calculator}' },
      { key: 'gates', desc: 'Input/output gates and filters', snippet: 'gates:\n  input:\n    - name: ${1:content_safety}\n      type: content_filter\n      action: block' },
      { key: 'reasoning', desc: 'Reasoning and planning configuration', snippet: 'reasoning:\n  strategy: ${1|chain_of_thought,tree_of_thought,react,reflexion,custom|}\n  depth: ${2:3}' },
      { key: 'communication', desc: 'Communication and messaging configuration', snippet: 'communication:\n  channels:\n    - type: ${1|http,websocket,grpc,message_queue,event_bus|}' },
      { key: 'learning', desc: 'Learning and adaptation configuration', snippet: 'learning:\n  mode: ${1|static,online,batch,reinforcement|}' },
      { key: 'security', desc: 'Security configuration', snippet: 'security:\n  authentication:\n    method: ${1|api_key,oauth2,jwt,mtls,saml|}\n  encryption:\n    atRest: true\n    inTransit: true' },
      { key: 'observability', desc: 'Monitoring and observability configuration', snippet: 'observability:\n  logging:\n    level: ${1|debug,info,warn,error|}\n    format: json\n  metrics:\n    enabled: true' },
      { key: 'lifecycle', desc: 'Agent lifecycle management', snippet: 'lifecycle:\n  startup:\n    timeout: 30000\n  restart:\n    policy: ${1|never,on_failure,always|}' },
      { key: 'integration', desc: 'External integration configuration', snippet: 'integration:\n  apis:\n    - name: ${1:api_name}\n      type: ${2|rest,graphql,soap,grpc|}' },
      { key: 'scaling', desc: 'Scaling configuration', snippet: 'scaling:\n  mode: ${1|manual,auto,scheduled|}\n  horizontal:\n    minInstances: 1\n    maxInstances: 10' },
      { key: 'compliance', desc: 'Compliance and regulatory configuration', snippet: 'compliance:\n  standards:\n    - ${1|SOC2,HIPAA,GDPR,PCI-DSS|}' },
      { key: 'testing', desc: 'Testing configuration', snippet: 'testing:\n  unit:\n    enabled: true\n    coverage: 80' },
      { key: 'deployment', desc: 'Deployment configuration', snippet: 'deployment:\n  target: ${1|kubernetes,docker,serverless,vm,bare_metal|}\n  strategy: ${2|rolling,blue_green,canary,recreate|}' },
      { key: 'governance', desc: 'Governance configuration', snippet: 'governance:\n  ownership:\n    team: ${1:engineering}' }
    ];

    rootKeys.forEach(({ key, desc, snippet }) => {
      suggestions.push({
        label: key,
        kind: monaco.languages.CompletionItemKind.Property,
        documentation: desc,
        insertText: snippet,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range
      });
    });
  }

  // Context-specific nested suggestions
  const parentContext = findParentContext(lines);
  if (parentContext) {
    const nestedSuggestions = getNestedSuggestions(monaco, parentContext, range);
    suggestions.push(...nestedSuggestions);
  }

  // Add common value suggestions
  const commonValues = {
    provider: ['anthropic', 'openai', 'google', 'azure', 'local', 'custom'],
    type: ['autonomous', 'assistive', 'collaborative', 'supervisory'],
    level: ['restricted', 'standard', 'elevated', 'admin'],
    strategy: ['chain_of_thought', 'tree_of_thought', 'react', 'reflexion', 'custom'],
    target: ['kubernetes', 'docker', 'serverless', 'vm', 'bare_metal'],
    mode: ['static', 'online', 'batch', 'reinforcement', 'manual', 'auto', 'scheduled']
  };

  // Find parent key to provide context-specific suggestions
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^(\w+):/);
      if (match) {
        const parentKey = match[1];
        const values = commonValues[parentKey as keyof typeof commonValues];
        if (values) {
          values.forEach(val => {
            suggestions.push({
              label: val,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: val,
              range
            });
          });
        }
        break;
      }
    }
  }

  return suggestions;
}

// ============================================
// Find Parent Context
// ============================================

function findParentContext(lines: string[]): string | null {
  const indentStack: { key: string; indent: number }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.search(/\S|$/);
    const keyMatch = trimmed.match(/^(\w+):/);

    if (keyMatch) {
      // Pop items from stack that have equal or greater indent
      while (indentStack.length > 0 && indentStack[indentStack.length - 1].indent >= indent) {
        indentStack.pop();
      }
      indentStack.push({ key: keyMatch[1], indent });
    }
  }

  if (indentStack.length > 0) {
    return indentStack.map(item => item.key).join('.');
  }

  return null;
}

// ============================================
// Get Nested Suggestions
// ============================================

function getNestedSuggestions(
  monaco: typeof import('monaco-editor'),
  context: string,
  range: editor.IRange
): editor.languages.CompletionItem[] {
  const suggestions: editor.languages.CompletionItem[] = [];

  const nestedProps: Record<string, Array<{ key: string; desc: string; snippet?: string }>> = {
    'metadata': [
      { key: 'name', desc: 'Unique agent name', snippet: 'name: ${1:my-agent}' },
      { key: 'description', desc: 'Human-readable description', snippet: 'description: ${1:Agent description}' },
      { key: 'version', desc: 'Agent version (semver)', snippet: 'version: "${1:0.1.0}"' },
      { key: 'author', desc: 'Agent author or team', snippet: 'author: ${1:Team Name}' },
      { key: 'tags', desc: 'Classification tags', snippet: 'tags:\n  - ${1:tag1}\n  - ${2:tag2}' }
    ],
    'model': [
      { key: 'provider', desc: 'Model provider', snippet: 'provider: ${1|anthropic,openai,google,azure|}' },
      { key: 'name', desc: 'Model identifier', snippet: 'name: ${1:claude-3-sonnet}' },
      { key: 'parameters', desc: 'Model inference parameters', snippet: 'parameters:\n  temperature: ${1:0.7}\n  maxTokens: ${2:4096}' }
    ],
    'model.parameters': [
      { key: 'temperature', desc: 'Sampling temperature (0-2)', snippet: 'temperature: ${1:0.7}' },
      { key: 'maxTokens', desc: 'Maximum output tokens', snippet: 'maxTokens: ${1:4096}' },
      { key: 'topP', desc: 'Nucleus sampling parameter (0-1)', snippet: 'topP: ${1:1}' },
      { key: 'topK', desc: 'Top-k sampling parameter', snippet: 'topK: ${1:40}' }
    ],
    'observability': [
      { key: 'logging', desc: 'Logging configuration', snippet: 'logging:\n  level: ${1|debug,info,warn,error|}\n  format: ${2|json,text,structured|}' },
      { key: 'metrics', desc: 'Metrics collection', snippet: 'metrics:\n  enabled: true\n  provider: ${1|prometheus,datadog,cloudwatch|}' },
      { key: 'tracing', desc: 'Distributed tracing', snippet: 'tracing:\n  enabled: true\n  provider: ${1|jaeger,zipkin,otel|}' },
      { key: 'alerting', desc: 'Alerting configuration', snippet: 'alerting:\n  enabled: true' }
    ]
  };

  const props = nestedProps[context];
  if (props) {
    props.forEach(({ key, desc, snippet }) => {
      suggestions.push({
        label: key,
        kind: monaco.languages.CompletionItemKind.Property,
        documentation: desc,
        insertText: snippet || `${key}: `,
        insertTextRules: snippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
        range
      });
    });
  }

  return suggestions;
}

// ============================================
// Hover Content Generator
// ============================================

function getHoverContent(
  word: string,
  model: editor.ITextModel,
  position: Position
): string | null {
  const schemaProps = agentYAMLJSONSchema.properties;

  // Check if word is a root property
  if (schemaProps[word as keyof typeof schemaProps]) {
    const prop = schemaProps[word as keyof typeof schemaProps] as { description?: string; type?: string };
    const typeInfo = prop.type ? `\n\n*Type: \`${prop.type}\`*` : '';
    return `**${word}**\n\n${prop.description || 'No description available'}${typeInfo}`;
  }

  // Check common enum values
  const enumDescriptions: Record<string, string> = {
    anthropic: 'Anthropic Claude models - Industry-leading AI models known for safety and capability',
    openai: 'OpenAI GPT models - Widely used generative AI models',
    google: 'Google AI models - Gemini and other Google AI offerings',
    azure: 'Azure OpenAI Service - Microsoft-hosted OpenAI models',
    autonomous: 'Agent operates independently without human intervention',
    assistive: 'Agent assists human operators with tasks and decisions',
    collaborative: 'Agent works alongside other agents in a team',
    supervisory: 'Agent oversees and coordinates other agents',
    chain_of_thought: 'Step-by-step reasoning approach for complex problems',
    tree_of_thought: 'Branching exploration of multiple solution paths',
    react: 'Reasoning and Acting paradigm for tool use',
    reflexion: 'Self-reflective reasoning with iterative improvement',
    restricted: 'Limited permissions for high-security environments',
    standard: 'Default permission level for typical operations',
    elevated: 'Enhanced permissions for privileged operations',
    admin: 'Full administrative access',
    kubernetes: 'Container orchestration on Kubernetes clusters',
    docker: 'Docker container deployment',
    serverless: 'Serverless function deployment (Lambda, Cloud Functions)',
    rolling: 'Gradual rollout with zero downtime',
    blue_green: 'Full environment switch deployment',
    canary: 'Progressive rollout with monitoring'
  };

  if (enumDescriptions[word]) {
    return `**${word}**\n\n${enumDescriptions[word]}`;
  }

  return null;
}

export default MonacoWrapper;
