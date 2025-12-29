/**
 * AgentOS Ops Console - Pack Detail Page
 * Dynamic page for viewing and managing individual agent packs
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PackDetail } from '@/components/PackDetail/PackDetail';
import { PageLoading } from '@/components/ui/Spinner';

// ============================================
// Metadata Generation
// ============================================

interface PackPageParams {
  params: Promise<{
    'pack-id': string;
  }>;
}

export async function generateMetadata({
  params,
}: PackPageParams): Promise<Metadata> {
  const { 'pack-id': packId } = await params;

  // In production, fetch pack data for dynamic metadata
  const packName = packId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${packName} Pack`,
    description: `Manage and configure the ${packName} agent pack`,
  };
}

// ============================================
// Mock Pack Data Fetcher
// ============================================

interface PackData {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  lifecycle: 'stable' | 'beta' | 'alpha' | 'deprecated';
  author: {
    name: string;
    email: string;
    avatar?: string;
  };
  repository?: string;
  homepage?: string;
  license: string;
  createdAt: string;
  updatedAt: string;
  installedAt?: string;
  totalAgents: number;
  activeAgents: number;
  totalExecutions: number;
  successRate: number;
  documentation?: string;
  agents: PackAgent[];
  dependencies: PackDependency[];
  tags: string[];
}

interface PackAgent {
  id: string;
  name: string;
  slug: string;
  role: string;
  description: string;
  authorityLevel: 'read' | 'write' | 'admin' | 'system';
  status: 'active' | 'paused' | 'stopped' | 'error';
  version: string;
  executionCount: number;
  successRate: number;
}

interface PackDependency {
  id: string;
  name: string;
  version: string;
  type: 'required' | 'optional' | 'peer';
  installed: boolean;
  compatible: boolean;
  children?: PackDependency[];
}

async function getPackData(packId: string): Promise<PackData | null> {
  // Mock data - in production, fetch from API
  const mockPacks: Record<string, PackData> = {
    devops: {
      id: 'pack-devops-001',
      name: 'DevOps Pack',
      slug: 'devops',
      description:
        'Comprehensive DevOps automation pack for CI/CD pipelines, infrastructure management, deployment orchestration, and monitoring. Includes agents for Kubernetes, Docker, Terraform, and major cloud providers.',
      version: '2.4.1',
      lifecycle: 'stable',
      author: {
        name: 'AgentOS Core Team',
        email: 'core@agentos.dev',
      },
      repository: 'https://github.com/agentos/pack-devops',
      homepage: 'https://agentos.dev/packs/devops',
      license: 'Apache-2.0',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-12-27T14:30:00Z',
      installedAt: '2024-02-01T09:00:00Z',
      totalAgents: 8,
      activeAgents: 6,
      totalExecutions: 15234,
      successRate: 98.4,
      documentation: `# DevOps Pack

## Overview

The DevOps Pack provides comprehensive automation for modern software development and operations workflows. It includes specialized agents for each major DevOps concern.

## Features

- **CI/CD Automation**: Automated pipeline management, build triggers, and deployment workflows
- **Infrastructure as Code**: Terraform, Pulumi, and CloudFormation integration
- **Container Orchestration**: Kubernetes and Docker management
- **Monitoring & Alerting**: Integration with Prometheus, Grafana, and PagerDuty
- **Security Scanning**: Automated vulnerability scanning and compliance checks

## Quick Start

\`\`\`bash
agentos pack install devops
agentos agent deploy devops-automation
\`\`\`

## Configuration

The pack supports the following environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| \`CLOUD_PROVIDER\` | Primary cloud provider (aws, gcp, azure) | Yes |
| \`K8S_CONTEXT\` | Kubernetes cluster context | No |
| \`TERRAFORM_STATE_BUCKET\` | S3/GCS bucket for Terraform state | No |

## Agents

### DevOps Automation
Primary orchestrator for all DevOps workflows. Coordinates with other agents for complex multi-step operations.

### Infrastructure Manager
Manages cloud infrastructure using IaC tools. Supports drift detection and automatic remediation.

### Container Orchestrator
Handles Kubernetes deployments, scaling, and maintenance operations.

## Best Practices

1. Always use staging environments for testing new configurations
2. Enable approval workflows for production deployments
3. Set up proper RBAC for cloud provider credentials
4. Configure rate limits to prevent API throttling

## Changelog

### v2.4.1 (2024-12-27)
- Fixed: Kubernetes namespace handling in multi-cluster setups
- Improved: Terraform plan parsing accuracy
- Added: Support for AWS EKS Pod Identity

### v2.4.0 (2024-12-15)
- Added: Azure Container Apps support
- Added: GitHub Actions workflow generator
- Improved: Deployment rollback mechanisms
`,
      agents: [
        {
          id: 'agent-devops-001',
          name: 'DevOps Automation',
          slug: 'devops-automation',
          role: 'orchestrator',
          description: 'Primary orchestrator for CI/CD and deployment workflows',
          authorityLevel: 'admin',
          status: 'active',
          version: '2.1.0',
          executionCount: 4521,
          successRate: 98.7,
        },
        {
          id: 'agent-devops-002',
          name: 'Infrastructure Manager',
          slug: 'infrastructure-manager',
          role: 'executor',
          description: 'Manages cloud infrastructure using Terraform and Pulumi',
          authorityLevel: 'write',
          status: 'active',
          version: '1.8.2',
          executionCount: 2341,
          successRate: 99.1,
        },
        {
          id: 'agent-devops-003',
          name: 'Container Orchestrator',
          slug: 'container-orchestrator',
          role: 'executor',
          description: 'Kubernetes and Docker container management',
          authorityLevel: 'write',
          status: 'active',
          version: '2.0.0',
          executionCount: 3892,
          successRate: 97.8,
        },
        {
          id: 'agent-devops-004',
          name: 'Pipeline Monitor',
          slug: 'pipeline-monitor',
          role: 'observer',
          description: 'Monitors CI/CD pipelines and reports status',
          authorityLevel: 'read',
          status: 'active',
          version: '1.5.0',
          executionCount: 8912,
          successRate: 99.9,
        },
        {
          id: 'agent-devops-005',
          name: 'Security Scanner',
          slug: 'security-scanner',
          role: 'analyzer',
          description: 'Automated vulnerability scanning and compliance checks',
          authorityLevel: 'read',
          status: 'active',
          version: '1.3.1',
          executionCount: 1245,
          successRate: 98.2,
        },
        {
          id: 'agent-devops-006',
          name: 'Deployment Coordinator',
          slug: 'deployment-coordinator',
          role: 'executor',
          description: 'Coordinates multi-service deployments and rollbacks',
          authorityLevel: 'admin',
          status: 'active',
          version: '2.2.0',
          executionCount: 987,
          successRate: 97.5,
        },
        {
          id: 'agent-devops-007',
          name: 'Log Aggregator',
          slug: 'log-aggregator',
          role: 'collector',
          description: 'Collects and processes logs from all services',
          authorityLevel: 'read',
          status: 'paused',
          version: '1.1.0',
          executionCount: 2156,
          successRate: 99.4,
        },
        {
          id: 'agent-devops-008',
          name: 'Cost Optimizer',
          slug: 'cost-optimizer',
          role: 'advisor',
          description: 'Analyzes and optimizes cloud resource costs',
          authorityLevel: 'read',
          status: 'stopped',
          version: '0.9.5',
          executionCount: 423,
          successRate: 94.8,
        },
      ],
      dependencies: [
        {
          id: 'dep-core',
          name: '@agentos/core',
          version: '^3.0.0',
          type: 'required',
          installed: true,
          compatible: true,
        },
        {
          id: 'dep-cloud',
          name: '@agentos/cloud-providers',
          version: '^2.1.0',
          type: 'required',
          installed: true,
          compatible: true,
          children: [
            {
              id: 'dep-aws',
              name: '@aws-sdk/client-ecs',
              version: '^3.400.0',
              type: 'required',
              installed: true,
              compatible: true,
            },
            {
              id: 'dep-gcp',
              name: '@google-cloud/container',
              version: '^5.0.0',
              type: 'optional',
              installed: true,
              compatible: true,
            },
            {
              id: 'dep-azure',
              name: '@azure/arm-containerservice',
              version: '^19.0.0',
              type: 'optional',
              installed: false,
              compatible: true,
            },
          ],
        },
        {
          id: 'dep-k8s',
          name: '@kubernetes/client-node',
          version: '^0.20.0',
          type: 'required',
          installed: true,
          compatible: true,
        },
        {
          id: 'dep-terraform',
          name: '@cdktf/provider-aws',
          version: '^18.0.0',
          type: 'optional',
          installed: true,
          compatible: true,
        },
        {
          id: 'dep-monitoring',
          name: '@agentos/monitoring',
          version: '^1.5.0',
          type: 'peer',
          installed: true,
          compatible: true,
          children: [
            {
              id: 'dep-prom',
              name: 'prom-client',
              version: '^15.0.0',
              type: 'required',
              installed: true,
              compatible: true,
            },
          ],
        },
      ],
      tags: ['devops', 'ci-cd', 'kubernetes', 'terraform', 'automation', 'infrastructure'],
    },
  };

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return mockPacks[packId] || null;
}

// ============================================
// Pack Detail Page Component
// ============================================

export default async function PackDetailPage({ params }: PackPageParams) {
  const { 'pack-id': packId } = await params;
  const packData = await getPackData(packId);

  if (!packData) {
    notFound();
  }

  return (
    <Suspense fallback={<PageLoading text="Loading pack details..." />}>
      <PackDetail pack={packData} />
    </Suspense>
  );
}
