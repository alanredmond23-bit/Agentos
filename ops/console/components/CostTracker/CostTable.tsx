/**
 * AgentOS Ops Console - Cost Table Component
 * Detailed cost entries with filtering and drill-down
 */

'use client';

import React, { useState, useMemo } from 'react';
import { cn, formatCurrency, formatDateTime, formatCompactNumber, snakeToTitle } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AgentAvatar } from '@/components/ui/Avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
} from '@/components/ui/Table';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { CostEntry, CostCategory } from './useCostData';

// ============================================
// Types
// ============================================

interface CostTableProps {
  entries: CostEntry[];
  loading?: boolean;
}

type SortField = 'timestamp' | 'amount_usd' | 'tokens_used' | 'agent_name';
type SortDirection = 'asc' | 'desc';

// ============================================
// Category Badge Colors
// ============================================

const categoryVariants: Record<CostCategory, 'info' | 'secondary' | 'success' | 'warning' | 'default'> = {
  tokens: 'info',
  compute: 'secondary',
  storage: 'success',
  api: 'warning',
  other: 'default',
};

// ============================================
// Component
// ============================================

export function CostTable({ entries, loading = false }: CostTableProps) {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const itemsPerPage = 10;

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'amount_usd':
          comparison = a.amount_usd - b.amount_usd;
          break;
        case 'tokens_used':
          comparison = a.tokens_used - b.tokens_used;
          break;
        case 'agent_name':
          comparison = a.agent_name.localeCompare(b.agent_name);
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [entries, sortField, sortDirection]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedEntries.slice(start, start + itemsPerPage);
  }, [sortedEntries, currentPage]);

  const totalPages = Math.ceil(entries.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRow(prev => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Details</CardTitle>
        </CardHeader>
        <CardContent noPadding>
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton h-12 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Details</CardTitle>
        <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
          {entries.length} entries
        </p>
      </CardHeader>
      <CardContent noPadding>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead
                sortable
                sortDirection={sortField === 'timestamp' ? sortDirection : null}
                onSort={() => handleSort('timestamp')}
              >
                Time
              </TableHead>
              <TableHead
                sortable
                sortDirection={sortField === 'agent_name' ? sortDirection : null}
                onSort={() => handleSort('agent_name')}
              >
                Agent
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead
                sortable
                sortDirection={sortField === 'tokens_used' ? sortDirection : null}
                onSort={() => handleSort('tokens_used')}
              >
                Tokens
              </TableHead>
              <TableHead
                sortable
                sortDirection={sortField === 'amount_usd' ? sortDirection : null}
                onSort={() => handleSort('amount_usd')}
              >
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEntries.map(entry => (
              <React.Fragment key={entry.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => toggleRow(entry.id)}
                  selected={expandedRow === entry.id}
                >
                  <TableCell className="w-8">
                    {expandedRow === entry.id ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-dark-text-tertiary">
                    {formatDateTime(entry.timestamp, 'MMM d, HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AgentAvatar pack={entry.pack} size="sm" />
                      <span className="font-medium text-slate-900 dark:text-dark-text-primary">
                        {entry.agent_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={categoryVariants[entry.category]} size="sm">
                      {entry.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-dark-text-secondary">
                    {formatCompactNumber(entry.tokens_used)}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-dark-text-primary">
                    {formatCurrency(entry.amount_usd)}
                  </TableCell>
                </TableRow>
                {expandedRow === entry.id && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-slate-50 dark:bg-dark-bg-tertiary">
                      <ExpandedRowContent entry={entry} />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Expanded Row Content
// ============================================

function ExpandedRowContent({ entry }: { entry: CostEntry }) {
  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-slate-500 dark:text-dark-text-tertiary">Execution ID</p>
          <p className="font-mono text-slate-900 dark:text-dark-text-primary">{entry.execution_id}</p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-dark-text-tertiary">Pack</p>
          <p className="text-slate-900 dark:text-dark-text-primary">{snakeToTitle(entry.pack)}</p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-dark-text-tertiary">Full Timestamp</p>
          <p className="text-slate-900 dark:text-dark-text-primary">
            {formatDateTime(entry.timestamp, 'MMM d, yyyy HH:mm:ss')}
          </p>
        </div>
        <div>
          <p className="text-slate-500 dark:text-dark-text-tertiary">Description</p>
          <p className="text-slate-900 dark:text-dark-text-primary">{entry.description}</p>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button className="text-sm text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
          View Execution <ExternalLink className="w-3 h-3" />
        </button>
        <button className="text-sm text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
          View Agent <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default CostTable;
