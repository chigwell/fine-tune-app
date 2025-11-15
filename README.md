# fine-tune.app

![status](https://img.shields.io/badge/status-work_in_progress-yellow)
![hackathon](https://img.shields.io/badge/hackathon-Gemini%20Vibe%20Code%20London-blue)

fine-tune.app is a fine-tuning platform for small LLMs (≈270M parameters), built from scratch during the  
[Gemini Vibe Code Hackathon – London](https://cerebralvalley.ai/e/vibe-code-gemini-london).

This repository is the meta / coordination repo for the project.  
All code will be developed only after the official hackathon start.

---

## Owner

- GitHub: [github.com/chigwell](https://github.com/chigwell)  
- LinkedIn: [Eugene Evstafev](https://www.linkedin.com/in/eugene-evstafev-716669181/)

---

## Planned repo structure

- [`fine-tune-app`](https://github.com/chigwell/fine-tune-app) — meta / planning (this repo)
- [`fine-tune-app-landing`](https://github.com/chigwell/fine-tune-app-landing) — public landing page: https://fine-tune.app/
- [`fine-tune-app-dashboard`](https://github.com/chigwell/fine-tune-app-dashboard) — web UI dashboard: https://dash.fine-tune.app/
- [`fine-tune-app-api`](https://github.com/chigwell/fine-tune-app-api) — backend + workers: TBD

---

## Hackathon checklist

### 1. Landing

- [x] Register domain for fine-tune.app (or suitable alternative)
- [ ] Implement one-page landing with a strong “wow” effect
- [ ] Deploy landing:
  - [ ] GitHub Pages **or**
  - [ ] Vercel **or**
  - [ ] Cloudflare Pages
- [ ] Add concise README to `fine-tune-app-landing`

---

### 2. Dashboard UI

- [ ] Implement frontend dashboard:
  - [ ] Auth, login, and registration via Google OAuth
  - [ ] Task listing (table / cards)
  - [ ] “New task” flow:
    - [ ] “+” button
    - [ ] Popup/modal for creating draft fine-tuning task
  - [ ] File upload:
    - [ ] Drag-and-drop upload for user files
    - [ ] List of uploaded files
    - [ ] Ability to delete files
  - [ ] Start dataset preparation job:
    - [ ] Trigger JSONL preparation job
    - [ ] Poll job status
    - [ ] Show progress/status in popup
  - [ ] Start fine-tuning job:
    - [ ] Popup for configuration (model, epochs, LR, etc.)
    - [ ] Polling and monitoring of training status
  - [ ] Start “publish to Ollama” job:
    - [ ] Popup for publish action
    - [ ] Polling and monitoring of publish status
- [ ] Optional extras:
  - [ ] Store credentials / API keys via UI (encrypted)
  - [ ] Basic benchmarking (latency / quality / cost metrics)
  - [ ] Simple JSONL editor in browser
- [ ] Deploy dashboard:
  - [ ] GitHub Pages **or**
  - [ ] Vercel **or**
  - [ ] Cloudflare Pages
- [ ] Add README to `fine-tune-app-dashboard`

---

### 3. API / Backend

- [ ] Prepare `Dockerfile` and `docker-compose.yaml`
- [ ] Implement FastAPI application:
  - [ ] Endpoints to support all dashboard flows:
    - [ ] Auth integration with Google OAuth (token verification / session)
    - [ ] CRUD for tasks
    - [ ] File upload + storage
    - [ ] Dataset preparation job trigger + status
    - [ ] Fine-tuning job trigger + status
    - [ ] Publish-to-Ollama job trigger + status
- [x] Confirm Gemini API credits from hackathon organisers
- [ ] Create dedicated GCP project for fine-tune.app
- [ ] Deploy API:
  - [ ] GCP (Cloud Run / GCE / GKE) **or**
  - [ ] Cloudflare Tunnel from local machine
- [ ] Create dedicated accounts:
  - [ ] Hugging Face (project-specific)
  - [ ] Ollama (project-specific / namespace)
- [ ] Prepare test datasets and run several small fine-tuning jobs end-to-end
- [ ] Add README to `fine-tune-app-api`

---

### 4. Demo & Submission

- [ ] Draft bullet-point demo script (what to show in 3 minutes)
- [ ] Record screen demo of the full flow:
  - [ ] Create task
  - [ ] Upload data
  - [ ] Prepare JSONL
  - [ ] Run fine-tune
  - [ ] Publish to Ollama
  - [ ] Use the resulting model
- [ ] Record and add voice-over (English)
- [ ] Upload demo video to YouTube (unlisted or public)
- [ ] Prepare text for submission form (problem statement fit, impact, tech stack)
- [ ] Submit project via official form:  
      https://cerebralvalley.ai/e/vibe-code-gemini-london/hackathon/submit
- [ ] Prepare short live pitch script for on-stage / judge demo

---

### 5. Win the hackathon 🎯

- [ ] Deliver a stable, working end-to-end demo

---

## 15 November 2025 – Working timeline

**Hackathon schedule (London time)**  
- ~~10:00 — Welcome kick-off~~
- 17:00 — Submissions due (target: **submit by 16:50**) 

**Internal plan (target start: 10:15, deadline: 16:50)**

- **10:15–11:00**
  - ~~Finalise idea and repo structure~~
  - Create GCP project, Hugging Face account, Ollama namespace
  - Skeleton ~~`fine-tune-app-landing`~~, `fine-tune-app-dashboard`, `fine-tune-app-api`

- **11:00–12:00**
  - Core API scaffolding (FastAPI + Docker)
  - Define task, file, and job models
  - Basic endpoints for tasks and file upload

- **12:00–12:30**
  - Quick landing v1 with clear explanation + hackathon context
  - Deploy first version of landing (GitHub Pages / Vercel / Cloudflare)

- **12:30–13:30**
  - Dashboard:
    - Google OAuth wiring
    - Task listing + “New task” popup
    - File upload + listing + delete

- **13:30–14:30**
  - Backend jobs:
    - Dataset preparation → JSONL
    - Fine-tuning job wiring (stubbed then real)
    - Basic status polling from UI

- **14:30–15:15**
  - Publish-to-Ollama flow (API + UI)
  - Run at least one small real fine-tuning end-to-end

- **15:15–16:00**
  - Stabilise demo path (happy path only)
  - Minimal benchmarking / stats if time allows
  - Tighten copy on landing and dashboard

- **16:00–16:30**
  - Record demo video (screen + voice)
  - Upload to YouTube
  - Write submission text (impact, tech, creativity)

- **16:30–16:50**
  - Submit project via official form
  - Final README and checklist updates
  - Quick rehearsal for live demo

---
