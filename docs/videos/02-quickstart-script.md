# Video 02: Quick Start Walkthrough

## Metadata

- **Duration:** 5 minutes
- **Audience:** Beginner developers
- **Prerequisites:** Node.js 18+ installed, Git installed
- **Goal:** Get AgentOS running locally in under 5 minutes

---

## Scene Breakdown

### Scene 1: Introduction (0:00 - 0:20)

**Visuals:** Split screen: presenter in corner, terminal in main view.

**Narration:**
"Welcome to AgentOS. In this video, we will go from zero to a running AgentOS environment in under five minutes. You will need Node.js 18 or higher and Git installed. Let us get started."

**Actions:** Show versions in terminal:
```bash
node --version
git --version
```

---

### Scene 2: Clone the Repository (0:20 - 0:50)

**Visuals:** Full-screen terminal.

**Narration:**
"First, clone the AgentOS repository from GitHub. We will use HTTPS, but SSH works too if you have it configured."

**Actions:** Type and execute:
```bash
git clone https://github.com/alanredmond23-bit/Agentos.git
cd Agentos
```

**Narration (continued):**
"Once cloned, navigate into the Agentos directory. You will see the core structure: agents and their packs, the runtime engine, ops console, evaluations, and documentation."

**Actions:** Run `ls -la` to show directory structure

---

### Scene 3: Install Dependencies (0:50 - 1:30)

**Visuals:** Terminal with npm install output.

**Narration:**
"Now install the dependencies with npm. This pulls in TypeScript, the runtime libraries, and development tools."

**Actions:** Type and execute:
```bash
npm install
```

**Narration (continued):**
"While this runs, let me explain what is being installed. The runtime includes adapters for multiple LLM providers, security utilities for PII redaction and secrets, and the orchestration engine. The ops console is a React application built with Vite."

**Actions:** Show package.json briefly while npm runs

---

### Scene 4: Bootstrap the Environment (1:30 - 2:15)

**Visuals:** Terminal showing bootstrap script.

**Narration:**
"AgentOS includes a bootstrap script that sets up your local environment. It creates necessary directories, copies environment templates, and validates your configuration."

**Actions:** Type and execute:
```bash
./scripts/bootstrap_repo.sh
```

**Narration (continued):**
"The bootstrap script checks for required tools, creates an .env file from the template, and prepares the workspace. If you see any warnings, follow the suggestions to resolve them."

**Actions:** Show successful bootstrap output

---

### Scene 5: Start Development Server (2:15 - 3:00)

**Visuals:** Split terminal view - main server and ops console.

**Narration:**
"Now we will start the development server. This runs the AgentOS runtime in development mode with hot reload enabled."

**Actions:** Type and execute in first terminal:
```bash
npm run dev
```

**Narration (continued):**
"In a second terminal, start the Ops Console. This is your command center for managing agents."

**Actions:** Type and execute in second terminal:
```bash
cd ops/console
npm install
npm run dev
```

**Narration (continued):**
"The console starts on port 3001. Open your browser to localhost:3001."

---

### Scene 6: Explore the Ops Console (3:00 - 4:00)

**Visuals:** Browser showing Ops Console.

**Narration:**
"Here is the Ops Console. Let us take a quick tour. The dashboard shows active runs, pending approvals, and system health. The Kill Switch page lets you enable or disable agent packs. The Approvals page shows actions waiting for human review. And the Audit Explorer lets you search through all agent activity."

**Actions:** Click through each section:
1. Dashboard - hover over stats
2. Kill Switch - show pack toggles
3. Approvals - show pending list
4. Audit Explorer - show filters

---

### Scene 7: Run Your First Agent (4:00 - 4:40)

**Visuals:** Terminal with demo script.

**Narration:**
"Let us run a demo agent to see everything in action. AgentOS includes a demo script that executes a simple task."

**Actions:** Type and execute:
```bash
npm run demo
```

**Narration (continued):**
"Watch the console as the agent runs. You can see it loading the YAML configuration, routing to the model provider, and completing the task. The Ops Console updates in real-time showing the run status."

**Actions:** Switch to browser to show run appearing in dashboard

---

### Scene 8: Next Steps (4:40 - 5:00)

**Visuals:** Split screen: terminal and documentation site.

**Narration:**
"Congratulations, you now have AgentOS running locally. From here, explore the agent packs in the agents directory, check out the YAML schemas for creating your own agents, or dive into the architecture documentation. In the next video, we will create a custom agent from scratch."

**Actions:**
- Show file browser highlighting `agents/packs/`
- Show documentation in browser

---

## B-Roll Suggestions

- Close-up of keyboard typing
- Terminal text scrolling
- Browser refresh animations
- Success checkmarks appearing

## Graphics Needed

1. Node.js and Git version requirement card
2. Directory structure diagram overlay
3. Port numbers callout (3001 for console)
4. Progress indicator (Step 1/5, etc.)
5. Success confirmation animation
6. "What's Next" options card

## Call to Action

- **Primary:** Create your first custom agent (Video 03)
- **Secondary:** Explore the agent packs documentation
- **Tertiary:** Join the community Discord

## Technical Notes

- Ensure terminal font is large enough (14pt minimum)
- Use a clean terminal theme (light or dark with good contrast)
- Pre-stage all commands to avoid typos during recording
- Have npm cache warmed to speed up install demonstration

## Troubleshooting Callouts

Include brief "If you see..." cards for common issues:
- "Permission denied" - chmod +x the script
- "Port in use" - change port in vite.config.ts
- "Node version" - use nvm to switch versions
