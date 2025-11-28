# Task: Proposal Generator
**Linked Plan:** [../plans/plan-upwork-job-response.md](../plans/plan-upwork-job-response.md)  
**Area:** n8n  
**Org Project:** n8n-automations  
**Owner:** @augustin
**Status:** To Do  

---

## Objective
Use OpenAI API to generate personalized draft proposals for shortlisted jobs.

---

## Steps
1. Connect to OpenAI / Gemini API using API key credentials.
2. Feed job description and skills into prompt.
3. Generate concise, contextual proposal text.
4. Store output in Sheets or Notion.
5. Send summary notification to Slack.

---

## Acceptance Criteria
- Generated text matches job tone and scope.
- Output properly formatted in Sheets / Notion.
- Proposal generation time < 5 seconds per job. 
