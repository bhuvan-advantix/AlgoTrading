
---

## 🧭 2️⃣ Revised Plan Document  
**Path:** `/docs/plans/plan-upwork-job-response.md`

```markdown
# Plan: Upwork Job Response Automation (n8n Workflow)
**Linked Spec:** [../specs/spec-upwork-job-response.md](../specs/spec-upwork-job-response.md)  
**Repo:** AI-Solutions  
**Area:** n8n  
**Org Project:** n8n-automations  
**Status:** In Progress  
**Owner:** @sabrish  
**Priority:** P1  

---

## Milestones

| Phase | Deliverable | ETA | Responsible |
|-------|--------------|-----|--------------|
| Phase 1 | Gmail IMAP setup + parsing logic | Day 1 | @developer1 |
| Phase 2 | Skill matching & scoring logic | Day 2 | @developer2 |
| Phase 3 | Proposal generation using OpenAI API | Day 3 | @developer3 |
| Phase 4 | Sheets / Notion integration + Slack notifications | Day 4 | @developer1 |
| Phase 5 | Testing, deployment & n8n export | Day 5 | @team |

---

## Risks / Mitigation
| Risk | Mitigation |
|------|-------------|
| Gmail rate limit | Add delay node or IMAP polling interval |
| OpenAI quota or token limit | Configure API retries + fallback |
| Parsing HTML variations | Use regex fail-safe and fallback text parsing |
| Workflow crash on error | Use `Error Trigger` node to handle gracefully |

---

## Tools & Environment
- n8n Cloud or self-hosted (on Advantix VPS)  
- Gmail API connection  
- OpenAI / Gemini API  
- Google Sheets or Notion API integration  

---

## Notes
All environment variables stored securely via n8n credentials.  
Proposals are saved as drafts — no direct submission to Upwork.

---

## Tracking
**GitHub Project:** [n8n-automations](https://github.com/orgs/AdvantixAGI-Tech/projects/YOUR_PROJECT_NUMBER)  
**Label:** `area:n8n`  
**Related Tasks Folder:** [../tasks/](../tasks/)
