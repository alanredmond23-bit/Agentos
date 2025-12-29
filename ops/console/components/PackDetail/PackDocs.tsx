/**
 * AgentOS Ops Console - Pack Documentation Component
 * Renders markdown documentation with syntax highlighting
 */

'use client';

import React, { useMemo } from 'react';
import {
  FileText,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

// ============================================
// Type Definitions
// ============================================

interface PackDocsProps {
  documentation?: string;
  packName: string;
}

// ============================================
// Simple Markdown Parser
// ============================================

function parseMarkdown(markdown: string): React.ReactNode[] {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';
  let inTable = false;
  let tableRows: string[][] = [];
  let listItems: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType;
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={cn(
            'my-4 space-y-2',
            listType === 'ol' ? 'list-decimal list-inside' : 'list-disc list-inside'
          )}
        >
          {listItems}
        </ListTag>
      );
      listItems = [];
      listType = null;
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const [header, ...body] = tableRows;
      elements.push(
        <div key={`table-${elements.length}`} className="my-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-dark-border-primary">
            <thead className="bg-slate-50 dark:bg-dark-bg-tertiary">
              <tr>
                {header.map((cell, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-dark-text-primary"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-dark-border-secondary">
              {body.filter((row) => !row.every((cell) => cell.match(/^[-|:]+$/))).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="px-4 py-3 text-sm text-slate-700 dark:text-dark-text-secondary"
                    >
                      {parseInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  const parseInlineMarkdown = (text: string): React.ReactNode => {
    // Handle inline code
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 bg-slate-100 dark:bg-dark-bg-tertiary text-brand-600 dark:text-brand-400 rounded text-sm font-mono"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      // Handle bold
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((boldPart, j) => {
        if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
          return (
            <strong key={`${i}-${j}`} className="font-semibold">
              {boldPart.slice(2, -2)}
            </strong>
          );
        }
        // Handle links
        const linkMatch = boldPart.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          return (
            <a
              key={`${i}-${j}`}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 dark:text-brand-400 hover:underline"
            >
              {linkMatch[1]}
            </a>
          );
        }
        return boldPart;
      });
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <CodeBlock
            key={`code-${elements.length}`}
            code={codeBlockContent.join('\n')}
            language={codeBlockLang}
          />
        );
        codeBlockContent = [];
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Handle tables
    if (line.includes('|')) {
      flushList();
      inTable = true;
      const cells = line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell !== '');
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Handle headers
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1
          key={`h1-${elements.length}`}
          className="text-3xl font-bold text-slate-900 dark:text-dark-text-primary mt-8 mb-4 first:mt-0"
        >
          {line.slice(2)}
        </h1>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary mt-8 mb-4"
        >
          {line.slice(3)}
        </h2>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          className="text-xl font-semibold text-slate-900 dark:text-dark-text-primary mt-6 mb-3"
        >
          {line.slice(4)}
        </h3>
      );
      continue;
    }

    // Handle unordered lists
    if (line.match(/^[-*]\s/)) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(
        <li key={`li-${listItems.length}`} className="text-slate-700 dark:text-dark-text-secondary">
          {parseInlineMarkdown(line.slice(2))}
        </li>
      );
      continue;
    }

    // Handle ordered lists
    if (line.match(/^\d+\.\s/)) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(
        <li key={`li-${listItems.length}`} className="text-slate-700 dark:text-dark-text-secondary">
          {parseInlineMarkdown(line.replace(/^\d+\.\s/, ''))}
        </li>
      );
      continue;
    }

    // Handle empty lines
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p
        key={`p-${elements.length}`}
        className="text-slate-700 dark:text-dark-text-secondary my-4 leading-relaxed"
      >
        {parseInlineMarkdown(line)}
      </p>
    );
  }

  // Flush remaining items
  flushList();
  flushTable();

  return elements;
}

// ============================================
// Code Block Component
// ============================================

interface CodeBlockProps {
  code: string;
  language: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative my-6 rounded-lg overflow-hidden border border-slate-200 dark:border-dark-border-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-dark-bg-tertiary border-b border-slate-200 dark:border-dark-border-primary">
        <span className="text-xs font-medium text-slate-500 dark:text-dark-text-tertiary uppercase">
          {language || 'code'}
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={handleCopy}
          leftIcon={copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      {/* Code */}
      <pre className="p-4 bg-slate-50 dark:bg-dark-bg-primary overflow-x-auto">
        <code className="text-sm font-mono text-slate-800 dark:text-dark-text-primary whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}

// ============================================
// Pack Docs Component
// ============================================

export function PackDocs({ documentation, packName }: PackDocsProps) {
  const renderedContent = useMemo(() => {
    if (!documentation) return null;
    return parseMarkdown(documentation);
  }, [documentation]);

  if (!documentation) {
    return (
      <EmptyState
        title="No documentation available"
        description={`Documentation for ${packName} has not been added yet.`}
        icon={<BookOpen className="w-16 h-16 text-slate-300 dark:text-zinc-600" />}
        action={{
          label: 'Request Documentation',
          onClick: () => console.log('Request docs'),
          variant: 'secondary',
        }}
      />
    );
  }

  return (
    <div className="max-w-4xl">
      <Card>
        <CardContent className="p-8">
          <article className="prose prose-slate dark:prose-invert max-w-none">
            {renderedContent}
          </article>
        </CardContent>
      </Card>
    </div>
  );
}

export default PackDocs;
