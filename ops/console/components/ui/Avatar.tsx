/**
 * AgentOS Ops Console - Avatar Component
 * User and entity avatar display
 */

import React from 'react';
import Image from 'next/image';
import { cn, getInitials, stringToColor } from '@/lib/utils';

// ============================================
// Avatar Types
// ============================================

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  status?: 'online' | 'offline' | 'busy' | 'away';
  border?: boolean;
  fallbackColor?: string;
}

// ============================================
// Avatar Component
// ============================================

export function Avatar({
  className,
  src,
  alt,
  name,
  size = 'md',
  status,
  border = false,
  fallbackColor,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const sizeStyles: Record<AvatarSize, { container: string; text: string; status: string }> = {
    xs: { container: 'w-6 h-6', text: 'text-2xs', status: 'w-1.5 h-1.5 border' },
    sm: { container: 'w-8 h-8', text: 'text-xs', status: 'w-2 h-2 border-2' },
    md: { container: 'w-10 h-10', text: 'text-sm', status: 'w-2.5 h-2.5 border-2' },
    lg: { container: 'w-12 h-12', text: 'text-base', status: 'w-3 h-3 border-2' },
    xl: { container: 'w-16 h-16', text: 'text-lg', status: 'w-3.5 h-3.5 border-2' },
    '2xl': { container: 'w-24 h-24', text: 'text-2xl', status: 'w-4 h-4 border-2' },
  };

  const statusColors = {
    online: 'bg-emerald-500',
    offline: 'bg-slate-400 dark:bg-zinc-500',
    busy: 'bg-red-500',
    away: 'bg-amber-500',
  };

  const showImage = src && !imageError;
  const initials = name ? getInitials(name) : '?';
  const bgColor = fallbackColor || (name ? stringToColor(name) : '#6366f1');

  return (
    <div className={cn('relative inline-flex', className)} {...props}>
      <div
        className={cn(
          'avatar',
          sizeStyles[size].container,
          border && 'ring-2 ring-white dark:ring-dark-bg-primary'
        )}
        style={{ backgroundColor: showImage ? undefined : bgColor }}
      >
        {showImage ? (
          <Image
            src={src}
            alt={alt || name || 'Avatar'}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span
            className={cn(
              'font-medium text-white select-none',
              sizeStyles[size].text
            )}
          >
            {initials}
          </span>
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-white dark:border-dark-bg-primary',
            sizeStyles[size].status,
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

// ============================================
// Avatar Group Component
// ============================================

interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  avatars: Array<{
    src?: string | null;
    name?: string;
    alt?: string;
  }>;
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup({
  className,
  avatars,
  max = 4,
  size = 'md',
  ...props
}: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  const overlapStyles: Record<AvatarSize, string> = {
    xs: '-ml-1.5',
    sm: '-ml-2',
    md: '-ml-2.5',
    lg: '-ml-3',
    xl: '-ml-4',
    '2xl': '-ml-6',
  };

  const sizeStyles: Record<AvatarSize, string> = {
    xs: 'w-6 h-6 text-2xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl',
  };

  return (
    <div className={cn('flex items-center', className)} {...props}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          name={avatar.name}
          alt={avatar.alt}
          size={size}
          border
          className={index > 0 ? overlapStyles[size] : ''}
        />
      ))}

      {remainingCount > 0 && (
        <div
          className={cn(
            'avatar flex items-center justify-center',
            'bg-slate-200 dark:bg-zinc-600',
            'ring-2 ring-white dark:ring-dark-bg-primary',
            sizeStyles[size],
            overlapStyles[size]
          )}
        >
          <span className="font-medium text-slate-600 dark:text-zinc-200">
            +{remainingCount}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Agent Avatar Component
// ============================================

import { Bot } from 'lucide-react';
import type { AgentPack } from '@/types';

interface AgentAvatarProps {
  pack: AgentPack;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const packColors: Record<AgentPack, string> = {
  devops: 'from-orange-500 to-red-500',
  qa: 'from-green-500 to-emerald-500',
  legal: 'from-slate-500 to-zinc-600',
  mobile: 'from-purple-500 to-violet-500',
  research: 'from-blue-500 to-cyan-500',
  planning: 'from-amber-500 to-yellow-500',
  analytics: 'from-pink-500 to-rose-500',
  orchestration: 'from-indigo-500 to-blue-500',
  error_predictor: 'from-red-500 to-orange-500',
  product: 'from-teal-500 to-green-500',
  marketing: 'from-fuchsia-500 to-pink-500',
  supabase: 'from-emerald-500 to-teal-500',
  design: 'from-violet-500 to-purple-500',
  engineering: 'from-sky-500 to-blue-500',
};

export function AgentAvatar({
  pack,
  name,
  size = 'md',
  className,
}: AgentAvatarProps) {
  const sizeStyles: Record<AvatarSize, { container: string; icon: string }> = {
    xs: { container: 'w-6 h-6', icon: 'w-3 h-3' },
    sm: { container: 'w-8 h-8', icon: 'w-4 h-4' },
    md: { container: 'w-10 h-10', icon: 'w-5 h-5' },
    lg: { container: 'w-12 h-12', icon: 'w-6 h-6' },
    xl: { container: 'w-16 h-16', icon: 'w-8 h-8' },
    '2xl': { container: 'w-24 h-24', icon: 'w-12 h-12' },
  };

  return (
    <div
      className={cn(
        'rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg',
        packColors[pack],
        sizeStyles[size].container,
        className
      )}
      title={name || pack}
    >
      <Bot className={cn('text-white', sizeStyles[size].icon)} />
    </div>
  );
}

export default Avatar;
