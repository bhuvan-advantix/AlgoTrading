# Spec: Automated Upwork Job Response Generator
**Spec ID:** SPEC-N8N-001  
**Repo:** AI-Solutions  
**Area:** n8n  
**Org Project:** n8n-automations  
**Status:** Draft  
**Owner:** @sabrish  
**Priority:** P1  
**Linked Plan:** [../plans/plan-upwork-job-response.md](../plans/plan-upwork-job-response.md)

---

## 1. Problem Statement
Upwork sends new job notifications via email, but manually reviewing and crafting proposals is time-consuming.  
This automation, built in **n8n**, should parse new job alerts, calculate a fit score, and generate draft responses for top-matching opportunities.

---

## 2. Objective
- Automate job opportunity triage from Upwork notification emails.  
- Identify high-fit projects based on keywords, categories, and skills.
- Draft personalized proposal text using OpenAI within n8n.
- Store shortlisted opportunities in Google Sheets or Notion. 

---

## 3. Functional Overview
| Stage | Description | Tool / Node |
|--------|--------------|-------------|
| **1. Email Ingestion** | Read new “Upwork job match” emails using Gmail IMAP node | `n8n Gmail` |
| **2. Parsing & Extraction** | Extract job title, skills, and match % using regex / HTML parse | `n8n Code` (JS) |
| **3. Scoring Logic** | Match extracted skills with Advantix AGI service tags | `n8n Function` |
| **4. Shortlisting** | Retain jobs with score > 70% | `n8n Filter` |
| **5. Proposal Generation** | Generate proposal using OpenAI API (GPT-4 / Gemini) | `n8n HTTP Request` |
| **6. Output Storage** | Save responses to Google Sheets / Notion | `n8n Sheets` / `n8n Notion` |
| **7. Notification** | Notify Advantix team via Slack or Telegram | `n8n Messaging` |

---

## 4. Architecture Flow
```mermaid
graph TD
A[Upwork Email Notification] --> B[Gmail Trigger Node]
B --> C[Extract Job Info via Code Node]
C --> D[Skill Match Scoring]
D --> E{Score > 70%?}
E -->|Yes| F[Generate Proposal via OpenAI]
E -->|No| G[Log & Skip]
F --> H[Save Draft to Sheets / Notion]
H --> I[Send Slack/Telegram Notification] 
