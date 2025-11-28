
---

### Example 2: `/docs/tasks/task-job-scoring-logic.md`
```markdown
# Task: Job Fit Scoring Logic
**Linked Plan:** [../plans/plan-upwork-job-response.md](../plans/plan-upwork-job-response.md)  
**Area:** n8n  
**Org Project:** n8n-automations  
**Owner:** @augustin
**Status:** To Do  

---

## Objective
Compute job fit score based on skill keyword match between job data and Advantix service capabilities.

---

## Steps
1. Fetch extracted skills from previous node.
2. Compare against a pre-defined Advantix skills list.
3. Compute score as a percentage match.
4. Send only jobs with score > 70% to the proposal generation node.

---

## Acceptance Criteria
- Scoring accuracy validated against test dataset.
- Only shortlisted jobs proceed downstream. 
