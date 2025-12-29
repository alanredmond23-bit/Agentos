# Video Production Notes

**Technical specifications and recording guidelines for AgentOS video tutorials.**

---

## Technical Specifications

### Video Format

| Setting | Value |
|---------|-------|
| Resolution | 1920x1080 (1080p) |
| Frame Rate | 30 fps |
| Aspect Ratio | 16:9 |
| Format | MP4 (H.264) |
| Bitrate | 8-12 Mbps |

### Audio Format

| Setting | Value |
|---------|-------|
| Sample Rate | 48 kHz |
| Bit Depth | 24-bit |
| Channels | Mono or Stereo |
| Format | AAC or WAV |
| Loudness | -16 LUFS (streaming standard) |

### Screen Recording

| Setting | Value |
|---------|-------|
| Capture Area | Full screen 1920x1080 |
| Cursor Highlight | Subtle yellow or blue ring |
| Click Highlight | Brief flash on click |
| Keystroke Display | Show for terminal commands |

---

## Recording Environment

### Terminal Setup

```bash
# Recommended terminal configuration

# Font: JetBrains Mono or Source Code Pro
# Font size: 14pt minimum, 16pt preferred

# Theme: Either:
# - Dark: Dracula, One Dark, or GitHub Dark
# - Light: GitHub Light or Solarized Light

# Window size: 120 columns x 30 rows
# Padding: 10-15px all sides

# Prompt: Simple and clean
export PS1='$ '
```

### Editor Setup

```json
// VS Code recommended settings
{
  "editor.fontSize": 16,
  "editor.lineHeight": 24,
  "editor.fontFamily": "JetBrains Mono",
  "editor.minimap.enabled": false,
  "editor.wordWrap": "on",
  "workbench.colorTheme": "GitHub Dark Default"
}
```

### Browser Setup

- Browser: Chrome or Firefox (latest)
- Zoom: 100% or 110%
- Extensions: Disable all non-essential
- Bookmarks bar: Hidden
- DevTools: Closed unless demonstrating
- Clear history and autofill before recording

---

## Demo Environment Preparation

### Before Each Recording Session

```bash
# 1. Fresh clone of the repository
git clone https://github.com/alanredmond23-bit/Agentos.git demo-agentos
cd demo-agentos

# 2. Install dependencies
npm install
cd ops/console && npm install && cd ../..

# 3. Run bootstrap
./scripts/bootstrap_repo.sh

# 4. Start services
npm run dev &
cd ops/console && npm run dev &

# 5. Seed demo data
npm run seed:demo

# 6. Verify everything works
npm run health:all
```

### Demo Data Requirements

| Video | Data Needed |
|-------|-------------|
| 01-intro | None |
| 02-quickstart | Clean environment |
| 03-agent-creation | Empty pack directory |
| 04-pack-management | 2-3 populated packs |
| 05-ops-console | 5+ pending approvals, 20+ audit events |
| 06-security | PII test data, mock credentials |
| 07-troubleshooting | Failing agent scenarios |

---

## Recording Workflow

### Pre-Recording Checklist

- [ ] Script printed/on second monitor
- [ ] Demo environment verified working
- [ ] Notifications disabled (system, Slack, email)
- [ ] Phone on silent
- [ ] Microphone levels tested
- [ ] Screen recording software ready
- [ ] Backup recording started (OBS)
- [ ] Water nearby
- [ ] Clock/timer visible

### Recording Tips

1. **Pacing**
   - Speak slightly slower than natural conversation
   - Pause 1-2 seconds between major points
   - Wait 2 seconds after clicking before narrating result

2. **Navigation**
   - Move mouse smoothly, not jerkily
   - Hover before clicking to show target
   - Use keyboard shortcuts when possible

3. **Errors During Recording**
   - Pause, take a breath
   - Re-record the section from last natural break
   - Note timestamp for easier editing

4. **Terminal Commands**
   - Type at moderate speed (not too fast)
   - Wait for command output before continuing
   - Keep commands on screen for 3-5 seconds

### Post-Recording Checklist

- [ ] Review full recording for errors
- [ ] Note sections needing re-recording
- [ ] Export in correct format
- [ ] Backup raw footage
- [ ] Update script with any improvised changes

---

## Narration Guidelines

### Voice Style

- **Tone:** Professional but approachable
- **Energy:** Engaged but not hyperactive
- **Speed:** 140-160 words per minute
- **Emphasis:** Stress key terms and concepts

### Language Guidelines

- Use "we" for collaborative tasks ("Let us configure...")
- Use "you" for viewer actions ("You will see...")
- Avoid jargon without explanation
- Define acronyms on first use
- No filler words (um, uh, like, you know)

### Script Deviations

- Minor wording changes are acceptable
- Major structural changes require review
- Improvised explanations should be noted
- Update script after recording if improved

---

## Post-Production Guidelines

### Editing Workflow

1. **Rough Cut**
   - Remove obvious errors
   - Trim dead air
   - Align audio and video

2. **Fine Cut**
   - Smooth transitions
   - Match pacing to narration
   - Add zoom effects for detail views

3. **Graphics Pass**
   - Insert lower thirds
   - Add callout graphics
   - Insert diagrams and charts

4. **Audio Pass**
   - Normalize audio levels
   - Remove background noise
   - Add subtle background music

5. **Final Review**
   - Technical accuracy check
   - Brand compliance check
   - Accessibility compliance check

### Transition Guidelines

| Transition | Use For |
|------------|---------|
| Cut | Most transitions |
| Cross-dissolve | Major topic changes (1 second) |
| Fade to black | Beginning/end only |
| Zoom | Highlighting specific UI elements |

### Music Guidelines

- Use royalty-free or licensed music
- Keep level at -20dB during narration
- Brief swells between major sections
- Fade out smoothly at end
- No lyrics

---

## Accessibility Requirements

### Captions

- Closed captions required for all videos
- Auto-generated captions must be reviewed and corrected
- Speaker identification not needed (single speaker)
- Sound effects described [keyboard typing] [mouse click]

### Visual Accessibility

- Color contrast ratio: 4.5:1 minimum for text
- No information conveyed by color alone
- No rapidly flashing content (photosensitivity)
- Text on screen for 3+ seconds

### Audio Accessibility

- Clear audio, minimal background noise
- Consistent volume throughout
- Audio description available for key visuals
- Transcript available for download

---

## File Naming Convention

```
agentos-video-[##]-[slug]-[version].[ext]

Examples:
agentos-video-01-intro-v1.mp4
agentos-video-02-quickstart-v1.mp4
agentos-video-02-quickstart-v2.mp4  (revision)
```

### Asset Naming

```
assets/
  graphics/
    [video-number]-[description].png
    01-architecture-diagram.png
    01-feature-icons.svg
  audio/
    background-music-tech.mp3
    transition-whoosh.mp3
  b-roll/
    terminal-typing-01.mp4
    dashboard-refresh-01.mp4
```

---

## Quality Assurance Checklist

### Technical Review

- [ ] Video plays without artifacts
- [ ] Audio is clear and properly leveled
- [ ] Captions are accurate
- [ ] All graphics are crisp (not blurry)
- [ ] Transitions are smooth

### Content Review

- [ ] All commands shown work correctly
- [ ] UI matches current AgentOS version
- [ ] No typos in on-screen text
- [ ] Links and URLs are correct
- [ ] Version numbers are accurate

### Brand Review

- [ ] Logo used correctly
- [ ] Color palette consistent
- [ ] Tone matches brand guidelines
- [ ] Call to action is clear

---

## Distribution

### Primary Platforms

- Documentation site (embedded)
- YouTube (public)
- Internal LMS (if applicable)

### Video Descriptions

Include in every video description:
- Brief summary (2-3 sentences)
- Table of contents with timestamps
- Links to documentation
- Links to related videos
- Command reference (copy-paste ready)

### Thumbnail Guidelines

- 1280x720 resolution
- Video number visible
- Clear title text
- AgentOS branding
- Consistent style across series
