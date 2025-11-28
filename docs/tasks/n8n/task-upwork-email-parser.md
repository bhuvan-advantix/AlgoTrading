# Task: Email Parsing Workflow
**Linked Plan:** [../plans/plan-upwork-job-response.md](../plans/plan-upwork-job-response.md)  
**Repo:** AI-Solutions  
**Area:** n8n  
**Org Project:** n8n-automations  
**Owner:** @augustin 
**Status:** To Do  

---

## Objective
Develop the Gmail IMAP trigger and extract job metadata (title, description, skills) from Upwork job emails.

---

## Steps
1. Configure Gmail IMAP node in n8n. 
2. Use Code node to parse job description and extract keywords.
3. Output structured JSON:
   ```json
   { "job_title": "", "skills": [], "match_percent": 0 }
