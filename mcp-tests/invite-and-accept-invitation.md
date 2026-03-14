
Important rules:

- Use Playwright MCP browser automation tools.
- Do NOT generate Playwright test files.
- Do NOT write Playwright code.
- Perform the actions directly in the browser session.
- Treat this as a live UI automation task.

# AI Agent Workflow: Multi-User Invitation Flow (Admin → User → Admin Verification)

This document defines a deterministic browser automation workflow executed by an AI agent using Playwright MCP and stored authentication sessions.

The workflow is split into **three independent phases** to avoid uncontrolled exploration and ensure deterministic behavior.

Each phase runs in **its own browser session**.

---

# Environment

## Application URL

http://217.160.34.25:8081

## Admin session

/Users/mustafamasetic/git/todo/.playwright/auth/mustafa-masetic-example-com-dbc13f6a.json

## Invited user session

/Users/mustafamasetic/git/todo/.playwright/auth/playwright-tasks-example-com-00185157.json

## Target space

Quarterly Ops Launch 2026-03-14 1545

---

# Evidence Collection Requirements

If supported by the Playwright MCP environment:

- Enable **Playwright trace recording**
- Save trace artifacts for each phase

If trace recording is not available:

Capture **screenshots** at key verification points.

Each phase must return:

- execution summary
- artifact locations (trace or screenshots)

---

# Phase 1 — Admin Sends Invitation

## Context

Use admin authentication session.

/Users/mustafamasetic/git/todo/.playwright/auth/mustafa-masetic-example-com-dbc13f6a.json

## Goal

Invite the second user to the target space.

## Steps

1. Open http://217.160.34.25:8081
2. Navigate to the space: **Quarterly Ops Launch 2026-03-14 1545**
3. Open the **Invite people / Members** interface.
4. Invite the user associated with session:

   /Users/mustafamasetic/git/todo/.playwright/auth/playwright-tasks-example-com-00185157.json

5. Verify the invited user appears in the members list as:

   - invited  
   - pending  

   or equivalent state.

6. Capture evidence (trace or screenshot).
7. Close the browser session.

## Expected Output

Invitation sent: yes/no  
User state in members list: pending/invited  
Issues encountered  
Artifact paths

---

# Phase 2 — Invited User Accepts Invitation

## Context

Use invited user session.

/Users/mustafamasetic/git/todo/.playwright/auth/playwright-tasks-example-com-00185157.json

## Goal

Accept the invitation to the target space.

## Steps

1. Open http://217.160.34.25:8081
2. Navigate through the UI to locate **pending invitations**.

Possible locations include:

- dashboard
- notifications
- invitations section
- spaces list

3. Locate invitation for space:

   **Quarterly Ops Launch 2026-03-14 1545**

4. Accept the invitation.
5. Verify that the space now appears in the user's accessible spaces.
6. Open the space to confirm access.
7. Capture evidence (trace or screenshot).
8. Close the browser session.

## Expected Output

Invitation accepted: yes/no  
Space visible after acceptance: yes/no  
Issues encountered  
Artifact paths

---

# Phase 3 — Admin Verifies Membership

## Context

Use admin authentication session again.

/Users/mustafamasetic/git/todo/.playwright/auth/mustafa-masetic-example-com-dbc13f6a.json

## Goal

Verify that the invited user has successfully joined the space.

## Steps

1. Open http://217.160.34.25:8081
2. Navigate to the space:

   **Quarterly Ops Launch 2026-03-14 1545**

3. Open the **Members / Invite / Access management** section.
4. Locate the invited user.
5. Verify the user state is now:

   - member  
   - accepted  
   - active  

   instead of:

   - pending  
   - invited  

6. Capture evidence (trace or screenshot).
7. Close the browser session.

## Expected Output

User membership state: accepted/member  
Verification successful: yes/no  
Issues encountered  
Artifact paths

---

# Execution Notes

Agent should:

- prefer **visible UI elements**
- avoid brittle selectors
- adapt to minor UI differences
- avoid modifying unrelated spaces or data

If the expected UI element cannot be found:

- inspect alternative navigation paths
- refresh the page if needed
- report findings clearly

---

# Expected Final Outcome

The workflow should confirm:

1. Admin invites user
2. User accepts invitation
3. Admin verifies user membership

All actions should produce **trace artifacts or screenshots** for inspection.
