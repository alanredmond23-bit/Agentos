import { useState } from 'react';
import { mockPackStatus, type PackStatus } from '../api/mock';

function KillSwitch() {
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [packs, setPacks] = useState<PackStatus[]>(mockPackStatus);
  const [confirmGlobal, setConfirmGlobal] = useState(false);

  const handleGlobalToggle = () => {
    if (globalEnabled && !confirmGlobal) {
      setConfirmGlobal(true);
      return;
    }
    setGlobalEnabled(!globalEnabled);
    setConfirmGlobal(false);

    // When global is disabled, disable all packs
    if (globalEnabled) {
      setPacks(prev => prev.map(p => ({ ...p, enabled: false })));
    }
  };

  const handlePackToggle = (packId: string) => {
    if (!globalEnabled) return; // Can't enable packs if global is off

    setPacks(prev =>
      prev.map(p =>
        p.id === packId ? { ...p, enabled: !p.enabled } : p
      )
    );
  };

  const handleEnableAll = () => {
    if (!globalEnabled) return;
    setPacks(prev => prev.map(p => ({ ...p, enabled: true })));
  };

  const handleDisableAll = () => {
    setPacks(prev => prev.map(p => ({ ...p, enabled: false })));
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Kill Switch Controls</h1>
        <p className="page-description">
          Emergency controls to disable agent execution globally or per pack.
        </p>
      </div>

      <div className="kill-switch-container">
        {/* Global Kill Switch */}
        <div className="kill-switch-global">
          <h3>Global Agent Execution</h3>
          <p className="text-sm mb-2" style={{ opacity: 0.8 }}>
            {globalEnabled
              ? 'All agent packs are allowed to execute. Toggle to disable all agents immediately.'
              : 'All agent execution is DISABLED. Toggle to restore operations.'}
          </p>
          <div className="kill-switch-toggle">
            <div
              className={`toggle ${globalEnabled ? 'active' : 'danger'}`}
              onClick={handleGlobalToggle}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleGlobalToggle()}
            />
            <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              {globalEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
            {confirmGlobal && (
              <div className="flex items-center gap-2" style={{ marginLeft: '1rem' }}>
                <span style={{ color: '#fbbf24' }}>Confirm disable?</span>
                <button className="btn btn-danger btn-sm" onClick={handleGlobalToggle}>
                  Yes, Disable All
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => setConfirmGlobal(false)} style={{ color: 'white' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pack Controls */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pack-Level Controls</h3>
            <div className="btn-group">
              <button
                className="btn btn-success btn-sm"
                onClick={handleEnableAll}
                disabled={!globalEnabled}
              >
                Enable All
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDisableAll}>
                Disable All
              </button>
            </div>
          </div>

          {!globalEnabled && (
            <div className="badge badge-error mb-2" style={{ display: 'block', textAlign: 'center', padding: '0.75rem' }}>
              Global execution is disabled. Enable it first to control individual packs.
            </div>
          )}

          <div className="pack-controls">
            {packs.map(pack => (
              <div key={pack.id} className="pack-card">
                <div className="pack-info">
                  <h4>{pack.name}</h4>
                  <p>{pack.agentCount} agents | {pack.activeRuns} active runs</p>
                  {pack.lastActivity && (
                    <p className="text-xs text-muted mt-1">
                      Last activity: {new Date(pack.lastActivity).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${pack.enabled ? 'badge-active' : 'badge-disabled'}`}>
                    {pack.enabled ? 'Active' : 'Disabled'}
                  </span>
                  <div
                    className={`toggle ${pack.enabled ? 'active' : ''}`}
                    onClick={() => handlePackToggle(pack.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handlePackToggle(pack.id)}
                    style={{
                      width: '44px',
                      height: '24px',
                      opacity: globalEnabled ? 1 : 0.5,
                      cursor: globalEnabled ? 'pointer' : 'not-allowed'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Kill Switch Activity</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>User</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-mono text-xs">2024-12-28 14:32:15</td>
                  <td><span className="badge badge-active">Enabled</span></td>
                  <td>marketing-pack</td>
                  <td>ops-admin</td>
                  <td>Restored after maintenance</td>
                </tr>
                <tr>
                  <td className="font-mono text-xs">2024-12-28 14:00:00</td>
                  <td><span className="badge badge-error">Disabled</span></td>
                  <td>marketing-pack</td>
                  <td>ops-admin</td>
                  <td>Scheduled maintenance</td>
                </tr>
                <tr>
                  <td className="font-mono text-xs">2024-12-27 09:15:22</td>
                  <td><span className="badge badge-error">Disabled</span></td>
                  <td>GLOBAL</td>
                  <td>incident-responder</td>
                  <td>Security incident INC-2024-1227</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KillSwitch;
