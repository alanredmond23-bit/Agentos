/**
 * AgentOS Studio - Agent Creation Wizard
 * Multi-step wizard for creating new agents
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { WizardStep, type WizardStepInfo } from './WizardStep';
import { WizardProgress } from './WizardProgress';
import { TemplateStep } from './steps/TemplateStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { PackSelectionStep } from './steps/PackSelectionStep';
import { CapabilitiesStep } from './steps/CapabilitiesStep';
import { ReviewStep } from './steps/ReviewStep';
import {
  type WizardFormData,
  type AgentTemplate,
  createEmptyFormData,
  createFormDataFromTemplate,
} from '@/lib/studio/templates';
import {
  Sparkles,
  User,
  Package,
  Settings,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface AgentWizardProps {
  initialTemplate?: AgentTemplate;
  onCancel?: () => void;
  onComplete?: (data: WizardFormData) => Promise<void>;
}

type WizardStepId = 'template' | 'basic' | 'pack' | 'capabilities' | 'review';

// ============================================
// Step Configuration
// ============================================

const WIZARD_STEPS: WizardStepInfo[] = [
  {
    id: 'template',
    title: 'Start',
    description: 'Choose how to start: scratch, template, or import',
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: 'basic',
    title: 'Basic Info',
    description: 'Define the agent name, role, and description',
    icon: <User className="w-5 h-5" />,
  },
  {
    id: 'pack',
    title: 'Select Pack',
    description: 'Choose a pack or start from a template',
    icon: <Package className="w-5 h-5" />,
  },
  {
    id: 'capabilities',
    title: 'Capabilities',
    description: 'Configure tools, authority level, and zones',
    icon: <Settings className="w-5 h-5" />,
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Review configuration and create agent',
    icon: <CheckCircle className="w-5 h-5" />,
  },
];

// ============================================
// Agent Wizard Component
// ============================================

export function AgentWizard({
  initialTemplate,
  onCancel,
  onComplete,
}: AgentWizardProps) {
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<WizardFormData>(() =>
    initialTemplate
      ? createFormDataFromTemplate(initialTemplate)
      : createEmptyFormData()
  );

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ============================================
  // Form Data Handlers
  // ============================================

  const updateFormData = useCallback(
    (updates: Partial<WizardFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
      // Clear related errors when field is updated
      const updatedFields = Object.keys(updates);
      setErrors((prev) => {
        const next = { ...prev };
        updatedFields.forEach((field) => delete next[field]);
        return next;
      });
    },
    []
  );

  const handleTemplateSelect = useCallback((template: AgentTemplate) => {
    const templateData = createFormDataFromTemplate(template);
    setFormData((prev) => ({
      ...prev,
      ...templateData,
      name: prev.name, // Preserve user-entered name
    }));
  }, []);

  // ============================================
  // Validation
  // ============================================

  const validateStep = useCallback(
    (stepIndex: number): boolean => {
      const newErrors: Record<string, string> = {};

      switch (stepIndex) {
        case 0: // Template Selection
          // No required fields for template step - user can proceed without selecting
          break;

        case 1: // Basic Info
          if (!formData.name.trim()) {
            newErrors.name = 'Agent name is required';
          } else if (formData.name.length < 3) {
            newErrors.name = 'Agent name must be at least 3 characters';
          } else if (formData.name.length > 50) {
            newErrors.name = 'Agent name must be less than 50 characters';
          }
          if (!formData.role.trim()) {
            newErrors.role = 'Agent role is required';
          }
          break;

        case 2: // Pack Selection
          if (!formData.pack) {
            newErrors.pack = 'Please select a pack';
          }
          break;

        case 3: // Capabilities
          if (formData.enabledTools.length === 0) {
            newErrors.tools = 'Please enable at least one tool';
          }
          if (formData.zones.length === 0) {
            newErrors.zones = 'Please select at least one zone';
          }
          break;

        case 4: // Review
          // Final validation of all fields
          if (!formData.name.trim()) {
            newErrors.name = 'Agent name is required';
          }
          if (!formData.pack) {
            newErrors.pack = 'Pack is required';
          }
          break;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData]
  );

  // ============================================
  // Navigation
  // ============================================

  const canGoNext = useMemo(() => {
    return currentStep < WIZARD_STEPS.length - 1;
  }, [currentStep]);

  const canGoPrev = useMemo(() => {
    return currentStep > 0;
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCompletedSteps((prev) => {
        if (!prev.includes(currentStep)) {
          return [...prev, currentStep];
        }
        return prev;
      });
      setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  }, [currentStep, validateStep]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleStepClick = useCallback(
    (stepIndex: number) => {
      // Only allow navigation to completed steps or the current step
      if (stepIndex <= currentStep || completedSteps.includes(stepIndex - 1)) {
        setCurrentStep(stepIndex);
      }
    },
    [currentStep, completedSteps]
  );

  // ============================================
  // Submission
  // ============================================

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      if (onComplete) {
        await onComplete(formData);
      } else {
        // Default behavior: simulate API call and redirect
        await new Promise((resolve) => setTimeout(resolve, 1500));
        router.push('/studio/agents');
      }
    } catch (error) {
      console.error('Failed to create agent:', error);
      setErrors({ submit: 'Failed to create agent. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentStep, validateStep, formData, onComplete, router]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/studio/agents');
    }
  }, [onCancel, router]);

  // ============================================
  // Render
  // ============================================

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary">
            Create New Agent
          </h1>
          <p className="text-sm text-slate-600 dark:text-dark-text-secondary mt-1">
            Configure your agent step by step
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          leftIcon={<X className="w-4 h-4" />}
        >
          Cancel
        </Button>
      </div>

      {/* Progress Indicator */}
      <WizardProgress
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Step Content */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {/* Template Step */}
          <WizardStep
            step={WIZARD_STEPS[0]}
            stepNumber={1}
            totalSteps={WIZARD_STEPS.length}
            isActive={currentStep === 0}
            isCompleted={completedSteps.includes(0)}
          >
            <TemplateStep
              formData={formData}
              errors={errors}
              onUpdate={updateFormData}
              onTemplateSelect={handleTemplateSelect}
            />
          </WizardStep>

          {/* Basic Info Step */}
          <WizardStep
            step={WIZARD_STEPS[1]}
            stepNumber={2}
            totalSteps={WIZARD_STEPS.length}
            isActive={currentStep === 1}
            isCompleted={completedSteps.includes(1)}
          >
            <BasicInfoStep
              formData={formData}
              errors={errors}
              onUpdate={updateFormData}
            />
          </WizardStep>

          {/* Pack Selection Step */}
          <WizardStep
            step={WIZARD_STEPS[2]}
            stepNumber={3}
            totalSteps={WIZARD_STEPS.length}
            isActive={currentStep === 2}
            isCompleted={completedSteps.includes(2)}
          >
            <PackSelectionStep
              formData={formData}
              errors={errors}
              onUpdate={updateFormData}
              onTemplateSelect={handleTemplateSelect}
            />
          </WizardStep>

          {/* Capabilities Step */}
          <WizardStep
            step={WIZARD_STEPS[3]}
            stepNumber={4}
            totalSteps={WIZARD_STEPS.length}
            isActive={currentStep === 3}
            isCompleted={completedSteps.includes(3)}
          >
            <CapabilitiesStep
              formData={formData}
              errors={errors}
              onUpdate={updateFormData}
            />
          </WizardStep>

          {/* Review Step */}
          <WizardStep
            step={WIZARD_STEPS[4]}
            stepNumber={5}
            totalSteps={WIZARD_STEPS.length}
            isActive={currentStep === 4}
            isCompleted={completedSteps.includes(4)}
          >
            <ReviewStep
              formData={formData}
              errors={errors}
              onEdit={setCurrentStep}
            />
          </WizardStep>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={handlePrev}
          disabled={!canGoPrev || isSubmitting}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {/* Error Message */}
          {errors.submit && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.submit}
            </p>
          )}

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={handleSubmit}
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText="Creating Agent..."
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Create Agent
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgentWizard;
