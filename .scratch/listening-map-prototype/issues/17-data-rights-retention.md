# 17: Data rights and retention

**What to build:** Guests and account holders can download their data (settings, attempts with support usage, skill states, reports they wrote) and delete it immediately. Guest data is deleted after 30 days of inactivity.

**Blocked by:** 14 Problem reports

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] New matrix row ME-04 for download (protected; owner approval in Comments); owner-scoped
- [ ] Delete is immediate and signs the learner out
- [ ] Retention job deletes inactive guest data per D11; testable through the test-support clock and job routes
- [ ] Logs contain no learner personal data

## Comments
