/**
 * AgentOS Ops Console - Budget Manager Component
 * Create, edit, and delete cost budgets
 */

'use client';

import React, { useState } from 'react';
import { cn, formatCurrency, formatPercentage, snakeToTitle } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Spinner';
import { Plus, Edit2, Trash2, X, Check, AlertTriangle } from 'lucide-react';
import type { Budget, CostCategory } from './useCostData';
import type { AgentPack } from '@/types';

// ============================================
// Types
// ============================================

interface BudgetManagerProps {
  budgets: Budget[];
  onCreateBudget?: (budget: Omit<Budget, 'id' | 'created_at' | 'spent'>) => void;
  onUpdateBudget?: (id: string, updates: Partial<Budget>) => void;
  onDeleteBudget?: (id: string) => void;
  loading?: boolean;
}

interface BudgetFormData {
  name: string;
  amount: string;
  period: 'daily' | 'weekly' | 'monthly';
  alert_threshold: string;
  category?: CostCategory;
  pack?: AgentPack;
}

// ============================================
// Component
// ============================================

export function BudgetManager({
  budgets,
  onCreateBudget,
  onUpdateBudget,
  onDeleteBudget,
  loading = false,
}: BudgetManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        action={
          !isCreating && (
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreating(true)}>
              Add Budget
            </Button>
          )
        }
      >
        <CardTitle>Budget Manager</CardTitle>
        <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
          Set spending limits and alerts
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isCreating && (
            <BudgetForm
              onSubmit={(data) => {
                onCreateBudget?.(data);
                setIsCreating(false);
              }}
              onCancel={() => setIsCreating(false)}
            />
          )}

          {budgets.map(budget => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              isEditing={editingId === budget.id}
              onEdit={() => setEditingId(budget.id)}
              onCancelEdit={() => setEditingId(null)}
              onUpdate={(updates) => {
                onUpdateBudget?.(budget.id, updates);
                setEditingId(null);
              }}
              onDelete={() => onDeleteBudget?.(budget.id)}
            />
          ))}

          {budgets.length === 0 && !isCreating && (
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-dark-text-tertiary mb-4">
                No budgets configured yet
              </p>
              <Button variant="outline" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreating(true)}>
                Create Your First Budget
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Budget Card
// ============================================

interface BudgetCardProps {
  budget: Budget;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (updates: Partial<Budget>) => void;
  onDelete: () => void;
}

function BudgetCard({ budget, isEditing, onEdit, onCancelEdit, onUpdate, onDelete }: BudgetCardProps) {
  const spentPercentage = (budget.spent / budget.amount) * 100;
  const isOverThreshold = spentPercentage >= budget.alert_threshold;
  const isOverBudget = spentPercentage >= 100;

  if (isEditing) {
    return (
      <BudgetForm
        initialData={{
          name: budget.name,
          amount: String(budget.amount),
          period: budget.period,
          alert_threshold: String(budget.alert_threshold),
          category: budget.category,
          pack: budget.pack,
        }}
        onSubmit={(data) => onUpdate(data)}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <div className="p-4 rounded-lg border border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-elevated">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">{budget.name}</h4>
            {isOverBudget && (
              <Badge variant="error" size="sm" dot dotColor="error">
                Over Budget
              </Badge>
            )}
            {isOverThreshold && !isOverBudget && (
              <Badge variant="warning" size="sm" dot dotColor="warning">
                Alert
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" size="sm">
              {budget.period}
            </Badge>
            {budget.category && (
              <Badge variant="info" size="sm">
                {budget.category}
              </Badge>
            )}
            {budget.pack && (
              <Badge variant="secondary" size="sm">
                {snakeToTitle(budget.pack)}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-dark-text-secondary rounded hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-600 dark:text-dark-text-secondary">
            {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)}
          </span>
          <span
            className={cn(
              'font-medium',
              isOverBudget
                ? 'text-red-600 dark:text-red-400'
                : isOverThreshold
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-900 dark:text-dark-text-primary'
            )}
          >
            {formatPercentage(spentPercentage)}
          </span>
        </div>
        <ProgressBar
          value={Math.min(spentPercentage, 100)}
          variant={isOverBudget ? 'error' : isOverThreshold ? 'warning' : 'default'}
          size="sm"
        />
      </div>

      <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
        Alert at {budget.alert_threshold}% | Remaining: {formatCurrency(Math.max(0, budget.amount - budget.spent))}
      </p>
    </div>
  );
}

// ============================================
// Budget Form
// ============================================

interface BudgetFormProps {
  initialData?: BudgetFormData;
  onSubmit: (data: Omit<Budget, 'id' | 'created_at' | 'spent'>) => void;
  onCancel: () => void;
}

function BudgetForm({ initialData, onSubmit, onCancel }: BudgetFormProps) {
  const [formData, setFormData] = useState<BudgetFormData>(
    initialData || {
      name: '',
      amount: '',
      period: 'monthly',
      alert_threshold: '80',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      amount: parseFloat(formData.amount) || 0,
      period: formData.period,
      alert_threshold: parseFloat(formData.alert_threshold) || 80,
      category: formData.category,
      pack: formData.pack,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 rounded-lg border-2 border-dashed border-brand-300 dark:border-brand-600 bg-brand-50/50 dark:bg-brand-500/5"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Input
          label="Budget Name"
          placeholder="e.g., Monthly Total"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
        <Input
          label="Amount (USD)"
          type="number"
          placeholder="1000"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
          required
          leftAddon="$"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
            Period
          </label>
          <select
            value={formData.period}
            onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value as Budget['period'] }))}
            className="input"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <Input
          label="Alert Threshold (%)"
          type="number"
          placeholder="80"
          value={formData.alert_threshold}
          onChange={(e) => setFormData(prev => ({ ...prev, alert_threshold: e.target.value }))}
          rightAddon="%"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" leftIcon={<Check className="w-4 h-4" />}>
          {initialData ? 'Update' : 'Create'} Budget
        </Button>
      </div>
    </form>
  );
}

export default BudgetManager;
