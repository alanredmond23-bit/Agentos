import { useState, useMemo } from 'react';
import Table from '../components/Table';
import { mockAuditEvents, type AuditEvent } from '../api/mock';

function AuditExplorer() {
  const [events] = useState<AuditEvent[]>(mockAuditEvents);
  const [packFilter, setPackFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Get unique packs and agents for filters
  const packs = useMemo(() => [...new Set(events.map(e => e.pack))], [events]);
  const agents = useMemo(() => [...new Set(events.map(e => e.agent))], [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[timeRange] || Infinity;

    return events.filter(event => {
      // Pack filter
      if (packFilter !== 'all' && event.pack !== packFilter) return false;

      // Agent filter
      if (agentFilter !== 'all' && event.agent !== agentFilter) return false;

      // Level filter
      if (levelFilter !== 'all' && event.level !== levelFilter) return false;

      // Time range filter
      const eventTime = new Date(event.timestamp).getTime();
      if (now.getTime() - eventTime > timeRangeMs) return false;

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          event.message.toLowerCase().includes(query) ||
          event.eventType.toLowerCase().includes(query) ||
          event.runId.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [events, packFilter, agentFilter, levelFilter, timeRange, searchQuery]);

  const columns = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (e: AuditEvent) => (
        <span className="font-mono text-xs">{new Date(e.timestamp).toLocaleString()}</span>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      render: (e: AuditEvent) => (
        <span className={`badge badge-${e.level === 'error' ? 'error' : e.level === 'warn' ? 'warning' : 'info'}`}>
          {e.level}
        </span>
      ),
    },
    { key: 'pack', header: 'Pack' },
    { key: 'agent', header: 'Agent' },
    { key: 'eventType', header: 'Event Type' },
    {
      key: 'runId',
      header: 'Run ID',
      render: (e: AuditEvent) => <span className="font-mono text-xs">{e.runId.slice(0, 12)}...</span>,
    },
    { key: 'message', header: 'Message' },
    {
      key: 'metadata',
      header: 'Details',
      render: (e: AuditEvent) =>
        e.metadata ? (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => alert(JSON.stringify(e.metadata, null, 2))}
          >
            View
          </button>
        ) : (
          <span className="text-muted">-</span>
        ),
    },
  ];

  // Calculate stats
  const stats = useMemo(() => ({
    total: filteredEvents.length,
    errors: filteredEvents.filter(e => e.level === 'error').length,
    warnings: filteredEvents.filter(e => e.level === 'warn').length,
    info: filteredEvents.filter(e => e.level === 'info').length,
  }), [filteredEvents]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Explorer</h1>
        <p className="page-description">
          Search and filter audit events across all agent packs and runs.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <div className="badge badge-info">{stats.total} total events</div>
          <div className="badge badge-error">{stats.errors} errors</div>
          <div className="badge badge-warning">{stats.warnings} warnings</div>
          <div className="badge" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>{stats.info} info</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="filters">
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search messages, types, run IDs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '250px' }}
            />
          </div>
          <div className="filter-group">
            <label>Pack</label>
            <select
              className="form-select"
              value={packFilter}
              onChange={e => setPackFilter(e.target.value)}
              style={{ width: '150px' }}
            >
              <option value="all">All Packs</option>
              {packs.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Agent</label>
            <select
              className="form-select"
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              style={{ width: '150px' }}
            >
              <option value="all">All Agents</option>
              {agents.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Level</label>
            <select
              className="form-select"
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              style={{ width: '120px' }}
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Time Range</label>
            <select
              className="form-select"
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              style={{ width: '120px' }}
            >
              <option value="1h">Last 1 hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>

        <Table
          data={filteredEvents}
          columns={columns}
          emptyMessage="No audit events match your filters"
        />
      </div>
    </div>
  );
}

export default AuditExplorer;
