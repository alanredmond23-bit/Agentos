import { useState } from 'react';
import Table from '../components/Table';
import { mockApprovals, type Approval } from '../api/mock';

function Approvals() {
  const [approvals, setApprovals] = useState<Approval[]>(mockApprovals);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const handleApprove = (id: string) => {
    setApprovals(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, status: 'approved' as const, reviewedAt: new Date().toISOString(), reviewedBy: 'ops-user' }
          : a
      )
    );
  };

  const handleReject = (id: string) => {
    setApprovals(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, status: 'rejected' as const, reviewedAt: new Date().toISOString(), reviewedBy: 'ops-user' }
          : a
      )
    );
  };

  const filteredApprovals = approvals.filter(a => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const columns = [
    { key: 'id', header: 'ID', render: (a: Approval) => <span className="font-mono text-xs">{a.id}</span> },
    { key: 'pack', header: 'Pack' },
    { key: 'agent', header: 'Agent' },
    { key: 'action', header: 'Action' },
    {
      key: 'risk',
      header: 'Risk Level',
      render: (a: Approval) => (
        <span className={`badge badge-${a.riskLevel === 'high' ? 'error' : a.riskLevel === 'medium' ? 'warning' : 'info'}`}>
          {a.riskLevel}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (a: Approval) => (
        <span className={`badge badge-${a.status}`}>{a.status}</span>
      ),
    },
    { key: 'requestedAt', header: 'Requested', render: (a: Approval) => new Date(a.requestedAt).toLocaleString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (a: Approval) =>
        a.status === 'pending' ? (
          <div className="btn-group">
            <button className="btn btn-success btn-sm" onClick={() => handleApprove(a.id)}>
              Approve
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => handleReject(a.id)}>
              Reject
            </button>
          </div>
        ) : (
          <span className="text-muted text-xs">
            {a.reviewedBy && `by ${a.reviewedBy}`}
          </span>
        ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pending Approvals</h1>
        <p className="page-description">
          Review and approve agent actions that require human oversight.
        </p>
      </div>

      <div className="card">
        <div className="filters">
          <div className="filter-group">
            <label>Status Filter</label>
            <select
              className="form-select"
              value={filter}
              onChange={e => setFilter(e.target.value as typeof filter)}
              style={{ width: '150px' }}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Quick Stats</label>
            <div className="flex gap-2">
              <span className="badge badge-pending">
                {approvals.filter(a => a.status === 'pending').length} pending
              </span>
              <span className="badge badge-approved">
                {approvals.filter(a => a.status === 'approved').length} approved
              </span>
              <span className="badge badge-rejected">
                {approvals.filter(a => a.status === 'rejected').length} rejected
              </span>
            </div>
          </div>
        </div>

        <Table data={filteredApprovals} columns={columns} emptyMessage="No approvals to display" />
      </div>
    </div>
  );
}

export default Approvals;
