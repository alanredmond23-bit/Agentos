/**
 * KillSwitch Component - Nuclear Power Plant-Level Safety UI
 *
 * Emergency control system for AgentOS with multi-level kill capabilities:
 * - Individual agent kills
 * - Pack-level kills
 * - Global system halt
 *
 * Features:
 * - Type-to-confirm dialogs for critical actions
 * - Cooldown displays after kill
 * - Auto-recovery options
 * - Kill history log
 * - Keyboard shortcuts (Ctrl+Shift+K for global)
 * - WebSocket broadcast on kill
 * - Audio alerts
 * - Red zone visual indicators
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  createContext,
  useContext,
} from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type KillSwitchState = 'normal' | 'warning' | 'critical' | 'killed';

export interface Agent {
  id: string;
  name: string;
  packId: string;
  state: KillSwitchState;
  errorRate: number; // 0-100
  lastError?: string;
  lastErrorTime?: string;
  activeRuns: number;
  killedAt?: string;
  killedBy?: string;
  killReason?: string;
}

export interface Pack {
  id: string;
  name: string;
  state: KillSwitchState;
  agents: Agent[];
  errorRate: number;
  activeRuns: number;
  killedAt?: string;
  killedBy?: string;
  killReason?: string;
  cooldownEndsAt?: string;
}

export interface KillHistoryEntry {
  id: string;
  timestamp: string;
  action: 'kill' | 'restore';
  level: 'agent' | 'pack' | 'global';
  targetId: string;
  targetName: string;
  userId: string;
  userName: string;
  reason: string;
  autoRecovery?: boolean;
  recoveryTime?: string;
}

export interface KillSwitchConfig {
  errorThresholdWarning: number;
  errorThresholdCritical: number;
  cooldownDurationMs: number;
  autoRecoveryEnabled: boolean;
  audioAlertsEnabled: boolean;
  confirmationRequired: boolean;
  globalConfirmPhrase: string;
}

// ============================================================================
// Context
// ============================================================================

interface KillSwitchContextType {
  globalState: KillSwitchState;
  packs: Pack[];
  history: KillHistoryEntry[];
  config: KillSwitchConfig;
  killAgent: (agentId: string, reason: string) => Promise<void>;
  killPack: (packId: string, reason: string) => Promise<void>;
  killGlobal: (reason: string) => Promise<void>;
  restoreAgent: (agentId: string) => Promise<void>;
  restorePack: (packId: string) => Promise<void>;
  restoreGlobal: () => Promise<void>;
  setAutoRecovery: (targetId: string, enabled: boolean, delayMs?: number) => void;
}

const KillSwitchContext = createContext<KillSwitchContextType | null>(null);

export const useKillSwitch = () => {
  const context = useContext(KillSwitchContext);
  if (!context) {
    throw new Error('useKillSwitch must be used within KillSwitchProvider');
  }
  return context;
};

// ============================================================================
// WebSocket Service (Mock)
// ============================================================================

class KillSwitchWebSocket {
  private listeners: Set<(event: KillHistoryEntry) => void> = new Set();

  broadcast(event: KillHistoryEntry): void {
    // In production, this would send to WebSocket server
    console.log('[KillSwitch WS] Broadcasting:', event);
    this.listeners.forEach(listener => listener(event));
  }

  subscribe(listener: (event: KillHistoryEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

const wsService = new KillSwitchWebSocket();

// ============================================================================
// Audio Service
// ============================================================================

class AudioAlertService {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return this.audioContext;
  }

  playAlert(type: 'warning' | 'critical' | 'kill'): void {
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Different tones for different alert levels
      const frequencies: Record<string, number[]> = {
        warning: [440, 550],
        critical: [880, 660, 880],
        kill: [220, 440, 220, 440],
      };

      const freqs = frequencies[type];
      let time = ctx.currentTime;

      freqs.forEach((freq, i) => {
        oscillator.frequency.setValueAtTime(freq, time + i * 0.15);
      });

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + freqs.length * 0.15);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + freqs.length * 0.15);
    } catch (e) {
      console.warn('[AudioAlert] Failed to play sound:', e);
    }
  }
}

const audioService = new AudioAlertService();

// ============================================================================
// Helper Components
// ============================================================================

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmPhrase?: string;
  level: 'agent' | 'pack' | 'global';
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmPhrase,
  level,
  onConfirm,
  onCancel,
}) => {
  const [typedPhrase, setTypedPhrase] = useState('');
  const [reason, setReason] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const phraseRequired = level === 'global' || level === 'pack';
  const phraseToType = confirmPhrase || (level === 'global' ? 'KILL ALL AGENTS' : 'CONFIRM KILL');
  const isValid = !phraseRequired || typedPhrase === phraseToType;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setTypedPhrase('');
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const borderColor = level === 'global' ? '#dc2626' : level === 'pack' ? '#f97316' : '#eab308';

  return (
    <div style={styles.dialogOverlay}>
      <div style={{ ...styles.dialogContent, borderColor }}>
        <div style={{ ...styles.dialogHeader, backgroundColor: borderColor }}>
          <span style={styles.dialogIcon}>
            {level === 'global' ? '!!!' : level === 'pack' ? '!!' : '!'}
          </span>
          <h2 style={styles.dialogTitle}>{title}</h2>
        </div>

        <div style={styles.dialogBody}>
          <p style={styles.dialogMessage}>{message}</p>

          {phraseRequired && (
            <div style={styles.confirmSection}>
              <label style={styles.confirmLabel}>
                Type <code style={styles.confirmCode}>{phraseToType}</code> to confirm:
              </label>
              <input
                ref={inputRef}
                type="text"
                value={typedPhrase}
                onChange={(e) => setTypedPhrase(e.target.value)}
                style={{
                  ...styles.confirmInput,
                  borderColor: typedPhrase === phraseToType ? '#16a34a' :
                              typedPhrase.length > 0 ? '#dc2626' : '#e2e8f0',
                }}
                placeholder={phraseToType}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}

          <div style={styles.reasonSection}>
            <label style={styles.confirmLabel}>Reason (required):</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={styles.reasonInput}
              placeholder="Enter reason for kill action..."
              rows={3}
            />
          </div>
        </div>

        <div style={styles.dialogFooter}>
          <button
            onClick={onCancel}
            style={styles.cancelButton}
          >
            Cancel (ESC)
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!isValid || !reason.trim()}
            style={{
              ...styles.confirmButton,
              opacity: isValid && reason.trim() ? 1 : 0.5,
              cursor: isValid && reason.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {level === 'global' ? 'EXECUTE GLOBAL KILL' :
             level === 'pack' ? 'KILL PACK' : 'KILL AGENT'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface CooldownTimerProps {
  endsAt: string;
  onComplete?: () => void;
}

const CooldownTimer: React.FC<CooldownTimerProps> = ({ endsAt, onComplete }) => {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    const endTime = new Date(endsAt).getTime();

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, endTime - now);
      setRemaining(diff);

      if (diff === 0 && onComplete) {
        onComplete();
      }
    };

    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [endsAt, onComplete]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <div style={styles.cooldownTimer}>
      <span style={styles.cooldownIcon}>||</span>
      <span style={styles.cooldownText}>
        Cooldown: {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
};

interface StateIndicatorProps {
  state: KillSwitchState;
  size?: 'small' | 'medium' | 'large';
  pulse?: boolean;
}

const StateIndicator: React.FC<StateIndicatorProps> = ({
  state,
  size = 'medium',
  pulse = true,
}) => {
  const colors: Record<KillSwitchState, string> = {
    normal: '#16a34a',
    warning: '#eab308',
    critical: '#dc2626',
    killed: '#6b7280',
  };

  const sizes: Record<string, number> = {
    small: 8,
    medium: 12,
    large: 16,
  };

  const shouldPulse = pulse && (state === 'warning' || state === 'critical');

  return (
    <span
      style={{
        ...styles.stateIndicator,
        width: sizes[size],
        height: sizes[size],
        backgroundColor: colors[state],
        animation: shouldPulse ? 'pulse 1s infinite' : 'none',
        boxShadow: shouldPulse ? `0 0 ${sizes[size]}px ${colors[state]}` : 'none',
      }}
    />
  );
};

interface KillButtonProps {
  level: 'agent' | 'pack' | 'global';
  disabled?: boolean;
  onClick: () => void;
  size?: 'small' | 'medium' | 'large';
}

const KillButton: React.FC<KillButtonProps> = ({
  level,
  disabled = false,
  onClick,
  size = 'medium',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseSize = size === 'small' ? 32 : size === 'large' ? 64 : 48;
  const bgColor = level === 'global' ? '#7f1d1d' : level === 'pack' ? '#991b1b' : '#b91c1c';
  const hoverColor = level === 'global' ? '#450a0a' : level === 'pack' ? '#7f1d1d' : '#991b1b';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.killButton,
        width: baseSize,
        height: baseSize,
        backgroundColor: disabled ? '#374151' : isHovered ? hoverColor : bgColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: size === 'small' ? 10 : size === 'large' ? 18 : 14,
      }}
      title={`Kill ${level}`}
    >
      X
    </button>
  );
};

interface RestoreButtonProps {
  onClick: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const RestoreButton: React.FC<RestoreButtonProps> = ({
  onClick,
  disabled = false,
  size = 'medium',
}) => {
  const baseSize = size === 'small' ? 32 : size === 'large' ? 64 : 48;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.restoreButton,
        width: baseSize,
        height: baseSize,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: size === 'small' ? 10 : size === 'large' ? 14 : 12,
      }}
      title="Restore"
    >
      O
    </button>
  );
};

// ============================================================================
// Main Components
// ============================================================================

interface AgentCardProps {
  agent: Agent;
  onKill: (agentId: string) => void;
  onRestore: (agentId: string) => void;
  globalKilled: boolean;
  packKilled: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onKill,
  onRestore,
  globalKilled,
  packKilled,
}) => {
  const isKilled = agent.state === 'killed' || globalKilled || packKilled;

  return (
    <div style={{
      ...styles.agentCard,
      borderLeftColor: isKilled ? '#6b7280' :
                       agent.state === 'critical' ? '#dc2626' :
                       agent.state === 'warning' ? '#eab308' : '#16a34a',
      opacity: globalKilled || packKilled ? 0.6 : 1,
    }}>
      <div style={styles.agentHeader}>
        <div style={styles.agentInfo}>
          <StateIndicator state={isKilled ? 'killed' : agent.state} size="small" />
          <span style={styles.agentName}>{agent.name}</span>
        </div>
        <div style={styles.agentActions}>
          {isKilled ? (
            <RestoreButton
              onClick={() => onRestore(agent.id)}
              disabled={globalKilled || packKilled}
              size="small"
            />
          ) : (
            <KillButton
              level="agent"
              onClick={() => onKill(agent.id)}
              disabled={globalKilled || packKilled}
              size="small"
            />
          )}
        </div>
      </div>

      <div style={styles.agentMetrics}>
        <div style={styles.metricItem}>
          <span style={styles.metricLabel}>Error Rate</span>
          <span style={{
            ...styles.metricValue,
            color: agent.errorRate > 50 ? '#dc2626' :
                   agent.errorRate > 25 ? '#eab308' : '#16a34a',
          }}>
            {agent.errorRate.toFixed(1)}%
          </span>
        </div>
        <div style={styles.metricItem}>
          <span style={styles.metricLabel}>Active Runs</span>
          <span style={styles.metricValue}>{agent.activeRuns}</span>
        </div>
      </div>

      {agent.lastError && (
        <div style={styles.lastError}>
          <span style={styles.errorLabel}>Last Error:</span>
          <span style={styles.errorText}>{agent.lastError}</span>
        </div>
      )}

      {agent.killedAt && (
        <div style={styles.killedInfo}>
          Killed at {new Date(agent.killedAt).toLocaleString()}
          {agent.killedBy && ` by ${agent.killedBy}`}
        </div>
      )}
    </div>
  );
};

interface PackCardProps {
  pack: Pack;
  onKillPack: (packId: string) => void;
  onRestorePack: (packId: string) => void;
  onKillAgent: (agentId: string) => void;
  onRestoreAgent: (agentId: string) => void;
  globalKilled: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}

const PackCard: React.FC<PackCardProps> = ({
  pack,
  onKillPack,
  onRestorePack,
  onKillAgent,
  onRestoreAgent,
  globalKilled,
  expanded,
  onToggleExpand,
}) => {
  const isKilled = pack.state === 'killed' || globalKilled;
  const activeAgents = pack.agents.filter(a => a.state !== 'killed').length;
  const criticalAgents = pack.agents.filter(a => a.state === 'critical').length;
  const warningAgents = pack.agents.filter(a => a.state === 'warning').length;

  return (
    <div style={{
      ...styles.packCard,
      borderColor: isKilled ? '#6b7280' :
                   pack.state === 'critical' ? '#dc2626' :
                   pack.state === 'warning' ? '#eab308' : '#e2e8f0',
      opacity: globalKilled ? 0.7 : 1,
    }}>
      <div style={styles.packHeader} onClick={onToggleExpand}>
        <div style={styles.packInfo}>
          <StateIndicator state={isKilled ? 'killed' : pack.state} size="medium" />
          <div>
            <h3 style={styles.packName}>{pack.name}</h3>
            <div style={styles.packStats}>
              <span>{pack.agents.length} agents</span>
              <span style={styles.statDivider}>|</span>
              <span style={{ color: '#16a34a' }}>{activeAgents} active</span>
              {criticalAgents > 0 && (
                <>
                  <span style={styles.statDivider}>|</span>
                  <span style={{ color: '#dc2626' }}>{criticalAgents} critical</span>
                </>
              )}
              {warningAgents > 0 && (
                <>
                  <span style={styles.statDivider}>|</span>
                  <span style={{ color: '#eab308' }}>{warningAgents} warning</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={styles.packActions}>
          <span style={styles.expandIcon}>{expanded ? 'v' : '>'}</span>
          {isKilled ? (
            <>
              {pack.cooldownEndsAt && (
                <CooldownTimer endsAt={pack.cooldownEndsAt} />
              )}
              <RestoreButton
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onRestorePack(pack.id);
                }}
                disabled={globalKilled}
              />
            </>
          ) : (
            <KillButton
              level="pack"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onKillPack(pack.id);
              }}
              disabled={globalKilled}
            />
          )}
        </div>
      </div>

      {pack.killedAt && (
        <div style={styles.packKilledBanner}>
          PACK KILLED at {new Date(pack.killedAt).toLocaleString()}
          {pack.killedBy && ` by ${pack.killedBy}`}
          {pack.killReason && ` - Reason: ${pack.killReason}`}
        </div>
      )}

      {expanded && (
        <div style={styles.agentsContainer}>
          {pack.agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onKill={onKillAgent}
              onRestore={onRestoreAgent}
              globalKilled={globalKilled}
              packKilled={isKilled}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface GlobalKillSwitchProps {
  state: KillSwitchState;
  onKill: () => void;
  onRestore: () => void;
  killedAt?: string;
  killedBy?: string;
  cooldownEndsAt?: string;
}

const GlobalKillSwitch: React.FC<GlobalKillSwitchProps> = ({
  state,
  onKill,
  onRestore,
  killedAt,
  killedBy,
  cooldownEndsAt,
}) => {
  const isKilled = state === 'killed';

  return (
    <div style={{
      ...styles.globalContainer,
      background: isKilled
        ? 'linear-gradient(135deg, #1f2937 0%, #374151 100%)'
        : state === 'critical'
        ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'
        : state === 'warning'
        ? 'linear-gradient(135deg, #78350f 0%, #92400e 100%)'
        : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    }}>
      <div style={styles.globalHeader}>
        <div style={styles.globalTitle}>
          <StateIndicator state={state} size="large" />
          <div>
            <h2 style={styles.globalTitleText}>GLOBAL SYSTEM CONTROL</h2>
            <p style={styles.globalSubtitle}>
              {isKilled
                ? 'ALL AGENTS HALTED'
                : state === 'critical'
                ? 'CRITICAL - Immediate attention required'
                : state === 'warning'
                ? 'WARNING - Elevated error rates detected'
                : 'All systems operational'}
            </p>
          </div>
        </div>

        <div style={styles.globalActions}>
          <div style={styles.keyboardHint}>
            Ctrl+Shift+K
          </div>
          {isKilled ? (
            <>
              {cooldownEndsAt && <CooldownTimer endsAt={cooldownEndsAt} />}
              <RestoreButton onClick={onRestore} size="large" />
            </>
          ) : (
            <KillButton level="global" onClick={onKill} size="large" />
          )}
        </div>
      </div>

      {killedAt && (
        <div style={styles.globalKilledBanner}>
          <span style={styles.killedBannerIcon}>!!!</span>
          <div>
            <strong>GLOBAL KILL ACTIVE</strong>
            <br />
            Activated at {new Date(killedAt).toLocaleString()}
            {killedBy && ` by ${killedBy}`}
          </div>
        </div>
      )}
    </div>
  );
};

interface KillHistoryLogProps {
  history: KillHistoryEntry[];
  maxEntries?: number;
}

const KillHistoryLog: React.FC<KillHistoryLogProps> = ({
  history,
  maxEntries = 50,
}) => {
  const displayHistory = useMemo(() =>
    history.slice(0, maxEntries),
    [history, maxEntries]
  );

  return (
    <div style={styles.historyContainer}>
      <div style={styles.historyHeader}>
        <h3 style={styles.historyTitle}>Kill Switch Activity Log</h3>
        <span style={styles.historyCount}>{history.length} events</span>
      </div>

      <div style={styles.historyTable}>
        <div style={styles.historyTableHeader}>
          <span style={{ width: '180px' }}>Timestamp</span>
          <span style={{ width: '80px' }}>Action</span>
          <span style={{ width: '80px' }}>Level</span>
          <span style={{ width: '150px' }}>Target</span>
          <span style={{ width: '120px' }}>User</span>
          <span style={{ flex: 1 }}>Reason</span>
        </div>

        {displayHistory.length === 0 ? (
          <div style={styles.historyEmpty}>No kill switch activity recorded</div>
        ) : (
          displayHistory.map(entry => (
            <div
              key={entry.id}
              style={{
                ...styles.historyRow,
                backgroundColor: entry.action === 'kill' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(22, 163, 74, 0.1)',
              }}
            >
              <span style={{ ...styles.historyCell, width: '180px', fontFamily: 'monospace' }}>
                {new Date(entry.timestamp).toLocaleString()}
              </span>
              <span style={{ ...styles.historyCell, width: '80px' }}>
                <span style={{
                  ...styles.actionBadge,
                  backgroundColor: entry.action === 'kill' ? '#fee2e2' : '#d1fae5',
                  color: entry.action === 'kill' ? '#991b1b' : '#065f46',
                }}>
                  {entry.action.toUpperCase()}
                </span>
              </span>
              <span style={{ ...styles.historyCell, width: '80px' }}>
                <span style={{
                  ...styles.levelBadge,
                  backgroundColor: entry.level === 'global' ? '#fef3c7' :
                                   entry.level === 'pack' ? '#dbeafe' : '#f3f4f6',
                  color: entry.level === 'global' ? '#92400e' :
                         entry.level === 'pack' ? '#1e40af' : '#374151',
                }}>
                  {entry.level}
                </span>
              </span>
              <span style={{ ...styles.historyCell, width: '150px' }}>
                {entry.targetName}
              </span>
              <span style={{ ...styles.historyCell, width: '120px' }}>
                {entry.userName}
              </span>
              <span style={{ ...styles.historyCell, flex: 1 }}>
                {entry.reason}
                {entry.autoRecovery && (
                  <span style={styles.autoRecoveryBadge}>
                    Auto-recover: {entry.recoveryTime}
                  </span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Main KillSwitch Component
// ============================================================================

interface KillSwitchProps {
  initialPacks?: Pack[];
  config?: Partial<KillSwitchConfig>;
  currentUser?: { id: string; name: string };
  onKillAction?: (entry: KillHistoryEntry) => void;
}

const defaultConfig: KillSwitchConfig = {
  errorThresholdWarning: 25,
  errorThresholdCritical: 50,
  cooldownDurationMs: 300000, // 5 minutes
  autoRecoveryEnabled: true,
  audioAlertsEnabled: true,
  confirmationRequired: true,
  globalConfirmPhrase: 'KILL ALL AGENTS',
};

export const KillSwitch: React.FC<KillSwitchProps> = ({
  initialPacks = [],
  config: configOverrides = {},
  currentUser = { id: 'ops-admin', name: 'Ops Admin' },
  onKillAction,
}) => {
  const config = useMemo(() => ({ ...defaultConfig, ...configOverrides }), [configOverrides]);

  // State
  const [globalState, setGlobalState] = useState<KillSwitchState>('normal');
  const [globalKilledAt, setGlobalKilledAt] = useState<string | undefined>();
  const [globalKilledBy, setGlobalKilledBy] = useState<string | undefined>();
  const [globalCooldownEndsAt, setGlobalCooldownEndsAt] = useState<string | undefined>();
  const [packs, setPacks] = useState<Pack[]>(initialPacks);
  const [history, setHistory] = useState<KillHistoryEntry[]>([]);
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [audioEnabled, setAudioEnabled] = useState(config.audioAlertsEnabled);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    level: 'agent' | 'pack' | 'global';
    targetId: string;
    targetName: string;
    confirmPhrase?: string;
  } | null>(null);

  // Generate mock data if not provided
  useEffect(() => {
    if (initialPacks.length === 0) {
      const mockPacks: Pack[] = [
        {
          id: 'marketing',
          name: 'Marketing Pack',
          state: 'normal',
          errorRate: 5,
          activeRuns: 3,
          agents: [
            { id: 'content-writer', name: 'Content Writer', packId: 'marketing', state: 'normal', errorRate: 2, activeRuns: 1 },
            { id: 'social-poster', name: 'Social Poster', packId: 'marketing', state: 'warning', errorRate: 35, activeRuns: 2, lastError: 'Rate limit exceeded', lastErrorTime: new Date().toISOString() },
          ],
        },
        {
          id: 'engineering',
          name: 'Engineering Pack',
          state: 'warning',
          errorRate: 28,
          activeRuns: 12,
          agents: [
            { id: 'code-reviewer', name: 'Code Reviewer', packId: 'engineering', state: 'normal', errorRate: 5, activeRuns: 4 },
            { id: 'deploy-agent', name: 'Deploy Agent', packId: 'engineering', state: 'warning', errorRate: 30, activeRuns: 2 },
            { id: 'test-runner', name: 'Test Runner', packId: 'engineering', state: 'critical', errorRate: 65, activeRuns: 6, lastError: 'Test infrastructure failure', lastErrorTime: new Date().toISOString() },
          ],
        },
        {
          id: 'finance',
          name: 'Finance Pack',
          state: 'normal',
          errorRate: 1,
          activeRuns: 1,
          agents: [
            { id: 'invoice-processor', name: 'Invoice Processor', packId: 'finance', state: 'normal', errorRate: 0, activeRuns: 1 },
            { id: 'expense-tracker', name: 'Expense Tracker', packId: 'finance', state: 'normal', errorRate: 2, activeRuns: 0 },
          ],
        },
        {
          id: 'devops',
          name: 'DevOps Pack',
          state: 'critical',
          errorRate: 72,
          activeRuns: 0,
          agents: [
            { id: 'infra-agent', name: 'Infrastructure Agent', packId: 'devops', state: 'critical', errorRate: 85, activeRuns: 0, lastError: 'Cloud provider API failure', lastErrorTime: new Date().toISOString() },
            { id: 'monitoring-agent', name: 'Monitoring Agent', packId: 'devops', state: 'critical', errorRate: 60, activeRuns: 0 },
          ],
        },
      ];
      setPacks(mockPacks);
    }
  }, [initialPacks]);

  // Calculate global state based on pack states
  useEffect(() => {
    if (globalState === 'killed') return;

    const hasCritical = packs.some(p => p.state === 'critical');
    const hasWarning = packs.some(p => p.state === 'warning');

    if (hasCritical) {
      setGlobalState('critical');
      if (audioEnabled) audioService.playAlert('critical');
    } else if (hasWarning) {
      setGlobalState('warning');
      if (audioEnabled) audioService.playAlert('warning');
    } else {
      setGlobalState('normal');
    }
  }, [packs, globalState, audioEnabled]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        if (globalState !== 'killed') {
          handleGlobalKillClick();
        }
      }

      if (e.key === 'Escape' && confirmDialog?.isOpen) {
        setConfirmDialog(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalState, confirmDialog]);

  // Add history entry helper
  const addHistoryEntry = useCallback((entry: Omit<KillHistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: KillHistoryEntry = {
      ...entry,
      id: `kill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    setHistory(prev => [newEntry, ...prev]);
    wsService.broadcast(newEntry);
    onKillAction?.(newEntry);

    return newEntry;
  }, [onKillAction]);

  // Kill handlers
  const handleGlobalKillClick = useCallback(() => {
    if (config.confirmationRequired) {
      setConfirmDialog({
        isOpen: true,
        title: 'GLOBAL SYSTEM KILL',
        message: 'This will immediately halt ALL agent execution across the entire system. All running tasks will be terminated. This action cannot be undone automatically.',
        level: 'global',
        targetId: 'global',
        targetName: 'GLOBAL',
        confirmPhrase: config.globalConfirmPhrase,
      });
    } else {
      executeGlobalKill('Emergency stop - no confirmation required');
    }
  }, [config]);

  const executeGlobalKill = useCallback((reason: string) => {
    const now = new Date().toISOString();

    setGlobalState('killed');
    setGlobalKilledAt(now);
    setGlobalKilledBy(currentUser.name);
    setGlobalCooldownEndsAt(new Date(Date.now() + config.cooldownDurationMs).toISOString());

    // Kill all packs
    setPacks(prev => prev.map(pack => ({
      ...pack,
      state: 'killed' as KillSwitchState,
      killedAt: now,
      killedBy: currentUser.name,
      killReason: 'Global kill',
      agents: pack.agents.map(agent => ({
        ...agent,
        state: 'killed' as KillSwitchState,
        killedAt: now,
        killedBy: currentUser.name,
        killReason: 'Global kill',
      })),
    })));

    addHistoryEntry({
      action: 'kill',
      level: 'global',
      targetId: 'global',
      targetName: 'GLOBAL SYSTEM',
      userId: currentUser.id,
      userName: currentUser.name,
      reason,
    });

    if (audioEnabled) audioService.playAlert('kill');
    setConfirmDialog(null);
  }, [currentUser, config.cooldownDurationMs, addHistoryEntry, audioEnabled]);

  const handlePackKillClick = useCallback((packId: string) => {
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;

    if (config.confirmationRequired) {
      setConfirmDialog({
        isOpen: true,
        title: `KILL PACK: ${pack.name}`,
        message: `This will immediately halt all ${pack.agents.length} agents in this pack. ${pack.activeRuns} active runs will be terminated.`,
        level: 'pack',
        targetId: packId,
        targetName: pack.name,
        confirmPhrase: 'CONFIRM KILL',
      });
    } else {
      executePackKill(packId, 'Emergency stop - no confirmation required');
    }
  }, [packs, config]);

  const executePackKill = useCallback((packId: string, reason: string) => {
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;

    const now = new Date().toISOString();

    setPacks(prev => prev.map(p => {
      if (p.id !== packId) return p;
      return {
        ...p,
        state: 'killed' as KillSwitchState,
        killedAt: now,
        killedBy: currentUser.name,
        killReason: reason,
        cooldownEndsAt: new Date(Date.now() + config.cooldownDurationMs).toISOString(),
        agents: p.agents.map(agent => ({
          ...agent,
          state: 'killed' as KillSwitchState,
          killedAt: now,
          killedBy: currentUser.name,
          killReason: 'Pack kill',
        })),
      };
    }));

    addHistoryEntry({
      action: 'kill',
      level: 'pack',
      targetId: packId,
      targetName: pack.name,
      userId: currentUser.id,
      userName: currentUser.name,
      reason,
    });

    if (audioEnabled) audioService.playAlert('kill');
    setConfirmDialog(null);
  }, [packs, currentUser, config.cooldownDurationMs, addHistoryEntry, audioEnabled]);

  const handleAgentKillClick = useCallback((agentId: string) => {
    const agent = packs.flatMap(p => p.agents).find(a => a.id === agentId);
    if (!agent) return;

    if (config.confirmationRequired) {
      setConfirmDialog({
        isOpen: true,
        title: `KILL AGENT: ${agent.name}`,
        message: `This will immediately halt this agent. ${agent.activeRuns} active runs will be terminated.`,
        level: 'agent',
        targetId: agentId,
        targetName: agent.name,
      });
    } else {
      executeAgentKill(agentId, 'Emergency stop - no confirmation required');
    }
  }, [packs, config]);

  const executeAgentKill = useCallback((agentId: string, reason: string) => {
    const agent = packs.flatMap(p => p.agents).find(a => a.id === agentId);
    if (!agent) return;

    const now = new Date().toISOString();

    setPacks(prev => prev.map(pack => ({
      ...pack,
      agents: pack.agents.map(a => {
        if (a.id !== agentId) return a;
        return {
          ...a,
          state: 'killed' as KillSwitchState,
          killedAt: now,
          killedBy: currentUser.name,
          killReason: reason,
        };
      }),
    })));

    addHistoryEntry({
      action: 'kill',
      level: 'agent',
      targetId: agentId,
      targetName: agent.name,
      userId: currentUser.id,
      userName: currentUser.name,
      reason,
    });

    if (audioEnabled) audioService.playAlert('kill');
    setConfirmDialog(null);
  }, [packs, currentUser, addHistoryEntry, audioEnabled]);

  // Restore handlers
  const handleGlobalRestore = useCallback(() => {
    setGlobalState('normal');
    setGlobalKilledAt(undefined);
    setGlobalKilledBy(undefined);
    setGlobalCooldownEndsAt(undefined);

    // Restore all packs to normal
    setPacks(prev => prev.map(pack => ({
      ...pack,
      state: 'normal' as KillSwitchState,
      killedAt: undefined,
      killedBy: undefined,
      killReason: undefined,
      cooldownEndsAt: undefined,
      agents: pack.agents.map(agent => ({
        ...agent,
        state: 'normal' as KillSwitchState,
        killedAt: undefined,
        killedBy: undefined,
        killReason: undefined,
      })),
    })));

    addHistoryEntry({
      action: 'restore',
      level: 'global',
      targetId: 'global',
      targetName: 'GLOBAL SYSTEM',
      userId: currentUser.id,
      userName: currentUser.name,
      reason: 'Manual restoration',
    });
  }, [currentUser, addHistoryEntry]);

  const handlePackRestore = useCallback((packId: string) => {
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;

    setPacks(prev => prev.map(p => {
      if (p.id !== packId) return p;
      return {
        ...p,
        state: 'normal' as KillSwitchState,
        killedAt: undefined,
        killedBy: undefined,
        killReason: undefined,
        cooldownEndsAt: undefined,
        agents: p.agents.map(agent => ({
          ...agent,
          state: 'normal' as KillSwitchState,
          killedAt: undefined,
          killedBy: undefined,
          killReason: undefined,
        })),
      };
    }));

    addHistoryEntry({
      action: 'restore',
      level: 'pack',
      targetId: packId,
      targetName: pack.name,
      userId: currentUser.id,
      userName: currentUser.name,
      reason: 'Manual restoration',
    });
  }, [packs, currentUser, addHistoryEntry]);

  const handleAgentRestore = useCallback((agentId: string) => {
    const agent = packs.flatMap(p => p.agents).find(a => a.id === agentId);
    if (!agent) return;

    setPacks(prev => prev.map(pack => ({
      ...pack,
      agents: pack.agents.map(a => {
        if (a.id !== agentId) return a;
        return {
          ...a,
          state: 'normal' as KillSwitchState,
          killedAt: undefined,
          killedBy: undefined,
          killReason: undefined,
        };
      }),
    })));

    addHistoryEntry({
      action: 'restore',
      level: 'agent',
      targetId: agentId,
      targetName: agent.name,
      userId: currentUser.id,
      userName: currentUser.name,
      reason: 'Manual restoration',
    });
  }, [packs, currentUser, addHistoryEntry]);

  const handleConfirmDialogConfirm = useCallback((reason: string) => {
    if (!confirmDialog) return;

    switch (confirmDialog.level) {
      case 'global':
        executeGlobalKill(reason);
        break;
      case 'pack':
        executePackKill(confirmDialog.targetId, reason);
        break;
      case 'agent':
        executeAgentKill(confirmDialog.targetId, reason);
        break;
    }
  }, [confirmDialog, executeGlobalKill, executePackKill, executeAgentKill]);

  const togglePackExpand = useCallback((packId: string) => {
    setExpandedPacks(prev => {
      const next = new Set(prev);
      if (next.has(packId)) {
        next.delete(packId);
      } else {
        next.add(packId);
      }
      return next;
    });
  }, []);

  return (
    <div style={styles.container}>
      {/* Audio toggle */}
      <div style={styles.audioToggle}>
        <label style={styles.audioLabel}>
          <input
            type="checkbox"
            checked={audioEnabled}
            onChange={(e) => setAudioEnabled(e.target.checked)}
            style={styles.audioCheckbox}
          />
          Audio Alerts
        </label>
      </div>

      {/* Global Kill Switch */}
      <GlobalKillSwitch
        state={globalState}
        onKill={handleGlobalKillClick}
        onRestore={handleGlobalRestore}
        killedAt={globalKilledAt}
        killedBy={globalKilledBy}
        cooldownEndsAt={globalCooldownEndsAt}
      />

      {/* Pack List */}
      <div style={styles.packsSection}>
        <h3 style={styles.sectionTitle}>Pack-Level Controls</h3>
        {packs.map(pack => (
          <PackCard
            key={pack.id}
            pack={pack}
            onKillPack={handlePackKillClick}
            onRestorePack={handlePackRestore}
            onKillAgent={handleAgentKillClick}
            onRestoreAgent={handleAgentRestore}
            globalKilled={globalState === 'killed'}
            expanded={expandedPacks.has(pack.id)}
            onToggleExpand={() => togglePackExpand(pack.id)}
          />
        ))}
      </div>

      {/* Kill History Log */}
      <KillHistoryLog history={history} />

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmPhrase={confirmDialog.confirmPhrase}
          level={confirmDialog.level}
          onConfirm={handleConfirmDialogConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* CSS Animation for pulse */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  audioToggle: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  audioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#64748b',
    cursor: 'pointer',
  },
  audioCheckbox: {
    cursor: 'pointer',
  },
  globalContainer: {
    borderRadius: '8px',
    padding: '1.5rem',
    color: 'white',
  },
  globalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  globalTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  globalTitleText: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: 0,
  },
  globalSubtitle: {
    fontSize: '0.875rem',
    opacity: 0.8,
    margin: '0.25rem 0 0 0',
  },
  globalActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  keyboardHint: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
  },
  globalKilledBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
    border: '2px solid rgba(255, 255, 255, 0.2)',
  },
  killedBannerIcon: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  packsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.5rem 0',
  },
  packCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    overflow: 'hidden',
  },
  packHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    cursor: 'pointer',
  },
  packInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  packName: {
    fontSize: '1rem',
    fontWeight: '600',
    margin: 0,
    color: '#1e293b',
  },
  packStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#64748b',
  },
  statDivider: {
    color: '#cbd5e1',
  },
  packActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  expandIcon: {
    color: '#64748b',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
  },
  packKilledBanner: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  agentsContainer: {
    padding: '1rem',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  agentCard: {
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    borderLeft: '4px solid',
    padding: '0.75rem',
  },
  agentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  agentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  agentName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1e293b',
  },
  agentActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  agentMetrics: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '0.5rem',
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  metricLabel: {
    fontSize: '0.625rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  metricValue: {
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  lastError: {
    fontSize: '0.75rem',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: '0.5rem',
    borderRadius: '4px',
    marginTop: '0.5rem',
  },
  errorLabel: {
    fontWeight: '600',
    marginRight: '0.25rem',
  },
  errorText: {
    fontFamily: 'monospace',
  },
  killedInfo: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.5rem',
    fontStyle: 'italic',
  },
  stateIndicator: {
    display: 'inline-block',
    borderRadius: '50%',
  },
  killButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: '50%',
    color: 'white',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  restoreButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: '50%',
    backgroundColor: '#16a34a',
    color: 'white',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  cooldownTimer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
  cooldownIcon: {
    fontWeight: 'bold',
  },
  cooldownText: {
    fontFamily: 'monospace',
  },
  historyContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    borderBottom: '1px solid #e2e8f0',
  },
  historyTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    margin: 0,
    color: '#1e293b',
  },
  historyCount: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  historyTable: {
    overflowX: 'auto',
  },
  historyTableHeader: {
    display: 'flex',
    padding: '0.75rem 1rem',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  historyRow: {
    display: 'flex',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #f1f5f9',
  },
  historyCell: {
    fontSize: '0.875rem',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
  },
  historyEmpty: {
    padding: '2rem',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.875rem',
  },
  actionBadge: {
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.625rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  levelBadge: {
    padding: '0.125rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.625rem',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  autoRecoveryBadge: {
    marginLeft: '0.5rem',
    padding: '0.125rem 0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '0.625rem',
  },
  dialogOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialogContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '500px',
    border: '3px solid',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  dialogHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    color: 'white',
  },
  dialogIcon: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  dialogTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    margin: 0,
  },
  dialogBody: {
    padding: '1.5rem',
  },
  dialogMessage: {
    fontSize: '0.875rem',
    color: '#374151',
    lineHeight: 1.6,
    marginBottom: '1.5rem',
  },
  confirmSection: {
    marginBottom: '1rem',
  },
  confirmLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  confirmCode: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  confirmInput: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    fontFamily: 'monospace',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  reasonSection: {
    marginBottom: '0.5rem',
  },
  reasonInput: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  dialogFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  },
  cancelButton: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#374151',
    transition: 'background-color 0.2s',
  },
  confirmButton: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    transition: 'opacity 0.2s',
  },
};

export default KillSwitch;
