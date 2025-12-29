# Video 05: Ops Console Tour

## Metadata

- **Duration:** 8 minutes
- **Audience:** Operators, DevOps engineers, team leads
- **Prerequisites:** AgentOS running locally (Video 02)
- **Goal:** Master the Ops Console for agent management and monitoring

---

## Scene Breakdown

### Scene 1: Introduction (0:00 - 0:30)

**Visuals:** Ops Console dashboard overview.

**Narration:**
"The AgentOS Ops Console is your command center for managing AI agents in production. From here, you can monitor active runs, approve high-risk actions, investigate issues, and control agent execution. Let us take a comprehensive tour of every feature."

**Actions:** Show console loading, then quick pan across main sections

---

### Scene 2: Dashboard Overview (0:30 - 1:30)

**Visuals:** Dashboard page with metrics.

**Narration:**
"The Dashboard is your first stop. It shows real-time system health at a glance."

**Actions:** Walk through each section:

**Narration (continued):**
"At the top, you see active run counts. These update in real-time as agents start and complete. Below that, pending approvals requiring your attention. These are high-risk actions waiting for human review."

**Actions:** Hover over active runs counter

**Narration (continued):**
"The system health indicators show the status of core components: orchestrator, workers, queue, and artifact storage. Green means healthy. Yellow indicates degraded performance. Red signals an outage."

**Actions:** Point to each health indicator

**Narration (continued):**
"The recent activity feed shows the latest events: runs starting, completing, failing, or requiring approval. Click any entry to see full details."

**Actions:** Click an activity entry to show details panel

---

### Scene 3: Approvals Page (1:30 - 3:00)

**Visuals:** Approvals page with pending items.

**Narration:**
"The Approvals page is where governance happens. AgentOS routes high-risk actions here for human review before execution."

**Actions:** Navigate to /approvals

**Narration (continued):**
"Each approval request shows the agent making the request, the action it wants to take, the target resource, and the risk level. High-risk actions are highlighted in red."

**Actions:** Point to each column in the approval list

**Narration (continued):**
"Let us look at a specific request. This agent wants to deploy a preview to Vercel. Click View to see the full context."

**Actions:** Click View on a pending approval

**Narration (continued):**
"The detail view shows the complete request: input parameters, agent configuration, and any relevant history. You can see exactly what will happen if you approve."

**Actions:** Scroll through detail view

**Narration (continued):**
"To approve, click the green Approve button. To reject, click Reject. Both actions require confirmation and are logged to the audit trail."

**Actions:** Demonstrate approve flow (with confirmation modal)

**Narration (continued):**
"Filter approvals by status, risk level, or agent pack. The Quick Stats section shows counts at a glance."

**Actions:** Use filters to show different views

---

### Scene 4: Kill Switch Page (3:00 - 4:15)

**Visuals:** Kill Switch page with toggles.

**Narration:**
"The Kill Switch page provides emergency controls. When something goes wrong, you need to stop it fast."

**Actions:** Navigate to /killswitch

**Narration (continued):**
"At the top is the Global Kill Switch. This is the big red button. Toggling it off immediately stops all agent execution across every pack. Use this for security incidents, widespread failures, or compliance holds."

**Actions:** Hover over global toggle (do not click)

**Narration (continued):**
"Below are pack-level controls. You can disable individual packs while keeping others running. This is useful for targeted maintenance or isolating problems."

**Actions:** Show pack toggles, demonstrate disabling one

**Narration (continued):**
"Every kill switch action is logged in the Activity Log. You can see who made the change, when, and why. This audit trail is critical for incident review."

**Actions:** Scroll to Activity Log section

**Narration (continued):**
"When re-enabling packs after an incident, do it one at a time. Monitor each pack for five minutes before enabling the next. This prevents cascading failures."

**Actions:** Show re-enable flow

---

### Scene 5: Audit Explorer (4:15 - 5:45)

**Visuals:** Audit Explorer with filters and results.

**Narration:**
"The Audit Explorer lets you search and analyze all agent activity. This is essential for debugging, compliance, and understanding agent behavior."

**Actions:** Navigate to /audit

**Narration (continued):**
"Start with the filters. You can filter by pack, agent, severity level, and time range. The time range options go from one hour up to thirty days."

**Actions:** Demonstrate each filter:
1. Select pack: marketing
2. Select level: error
3. Select time: 24h

**Narration (continued):**
"The search box supports full-text search across event messages and run IDs. If you have a run ID from an incident report, paste it here to find all related events."

**Actions:** Paste a run ID into search

**Narration (continued):**
"Results show the event timeline with timestamps, severity, and message. Click any event to expand the full metadata. This includes input hashes, output hashes, model used, and cost information."

**Actions:** Click to expand an event, show metadata

**Narration (continued):**
"Use the statistics panel to see patterns. High error counts in a short period might indicate a systemic issue. Cost spikes might reveal a runaway agent."

**Actions:** Hover over statistics charts

---

### Scene 6: Real-Time Monitoring (5:45 - 6:30)

**Visuals:** Console with WebSocket updates.

**Narration:**
"The Ops Console uses WebSocket connections for real-time updates. You do not need to refresh to see changes."

**Actions:** Show dashboard updating in real-time

**Narration (continued):**
"Watch what happens when we trigger a new agent run from the terminal."

**Actions:** Switch to terminal, run:
```bash
npm run demo
```

**Narration (continued):**
"Back in the console, the run appears immediately in the activity feed. The active runs counter increments. When it completes, the status updates."

**Actions:** Show real-time updates in console

**Narration (continued):**
"If the agent requires approval, the pending count updates and a notification appears. You can approve directly from the notification or navigate to the Approvals page."

**Actions:** Demonstrate approval notification (if applicable)

---

### Scene 7: Configuration and Access (6:30 - 7:15)

**Visuals:** Environment configuration.

**Narration:**
"Let us cover some operational details. The console runs on port 3001 by default. You can change this in the Vite configuration."

**Actions:** Show vite.config.ts briefly

**Narration (continued):**
"Environment variables control feature flags. VITE_ENABLE_AUDIT_EXPORT enables exporting audit logs. VITE_ENABLE_BULK_ACTIONS enables bulk approval and rejection."

**Actions:** Show .env file with variables

**Narration (continued):**
"In production, ensure authentication is configured. The console supports role-based access control. Different roles see different capabilities."

**Actions:** Show mock role selector if available, otherwise mention it

**Narration (continued):**
"All console actions are themselves logged. The system maintains an audit trail of who did what and when."

---

### Scene 8: Best Practices (7:15 - 8:00)

**Visuals:** Best practices checklist on screen.

**Narration:**
"Here are the best practices for operating the console. First, review pending approvals regularly. Do not let them pile up. Set up notifications if possible."

**Actions:** Show checklist item 1

**Narration (continued):**
"Second, test the kill switch monthly. Know it works before you need it in an emergency."

**Actions:** Show checklist item 2

**Narration (continued):**
"Third, monitor the audit explorer for anomalies. Look for spikes in errors, costs, or specific patterns that indicate problems."

**Actions:** Show checklist item 3

**Narration (continued):**
"Fourth, document your incident response procedures. Know who can activate the kill switch and under what circumstances."

**Actions:** Show checklist item 4

**Narration (continued):**
"Finally, keep the console updated with the rest of AgentOS. New features and security patches roll out regularly."

**Actions:** Show checklist item 5, then close with console overview

---

## B-Roll Suggestions

- Control room imagery
- Dashboard screens refreshing
- Alert notifications appearing
- Operator clicking approve/reject

## Graphics Needed

1. Console navigation diagram
2. Health indicator legend (green/yellow/red)
3. Approval workflow flowchart
4. Kill switch hierarchy diagram
5. Filter combination examples
6. Best practices checklist graphic

## Call to Action

- **Primary:** Learn about security features (Video 06)
- **Secondary:** Read the ops_console.md runbook
- **Tertiary:** Set up production authentication

## Demo Data Preparation

Before recording, populate the console with:
- 3-5 pending approvals at different risk levels
- 10+ recent audit events across packs
- Mix of successful and failed runs
- Active runs if possible

## Keyboard Shortcuts to Mention

- None currently defined (note for future feature)

## Screen Resolution

Record at 1920x1080 for optimal visibility of all UI elements.
