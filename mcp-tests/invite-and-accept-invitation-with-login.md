
Important rules:

- Use Playwright MCP browser automation tools.
- Do NOT generate Playwright test files.
- Do NOT write Playwright code.
- Perform the actions directly in the browser session.
- Treat this as a live UI automation task.

# AI Agent Workflow: Multi-User Invitation Flow (Admin → User → Admin Verification)

This document defines a deterministic browser automation workflow executed by an AI agent using Playwright MCP and login credentials.

The workflow is split into **three independent phases** to avoid uncontrolled exploration and ensure deterministic behavior.

Each phase runs in **its own browser session**.

---

# Environment

## Application URL

http://217.160.34.25:8081

## Admin account

playwright.admin.1773312256562@example.com

## Invited user account

playwright.user.4f03710e-d8d1-4328-a8b1-cf1b48d0cb1c@example.com

## Shared password

Read the password from the local environment variable:

E2E_PASSWORD

Important:

- Use `E2E_PASSWORD` for both accounts.
- Do not ask the user for the password.
- Do not print the password in the final answer.
- Do not echo the password into logs or summaries.
- Use the `login_with_env_credentials` tool for login instead of typing the password manually.
- After calling `login_with_env_credentials`, inspect the tool result and confirm that submission actually happened before proceeding.

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

Log in as the admin user with:

- email: `playwright.admin.1773312256562@example.com`
- password: read from `E2E_PASSWORD`

## Goal

Invite the second user to the target space.

## Steps

1. Open http://217.160.34.25:8081
2. Log in as the admin user with `login_with_env_credentials`.
3. Navigate to the space: **Quarterly Ops Launch 2026-03-14 1545**
4. Open the **Invite people / Members** interface.
5. Invite this user:

   `playwright.user.4f03710e-d8d1-4328-a8b1-cf1b48d0cb1c@example.com`

6. Verify the invited user appears in the members list as:

   - invited  
   - pending  

   or equivalent state.

7. Capture evidence (trace or screenshot).
8. Close the browser session.

## Expected Output

Invitation sent: yes/no  
User state in members list: pending/invited  
Issues encountered  
Artifact paths

---

# Phase 2 — Invited User Accepts Invitation

## Context

Log in as the invited user with:

- email: `playwright.user.4f03710e-d8d1-4328-a8b1-cf1b48d0cb1c@example.com`
- password: read from `E2E_PASSWORD`

## Goal

Accept the invitation to the target space.

## Steps

1. Open http://217.160.34.25:8081
2. Log in as the invited user with `login_with_env_credentials`.
3. Navigate through the UI to locate **pending invitations**.

Possible locations include:

- dashboard
- notifications
- invitations section
- spaces list

4. Locate invitation for space:

   **Quarterly Ops Launch 2026-03-14 1545**

5. Accept the invitation.
6. Verify that the space now appears in the user's accessible spaces.
7. Open the space to confirm access.
8. Capture evidence (trace or screenshot).
9. Close the browser session.

## Expected Output

Invitation accepted: yes/no  
Space visible after acceptance: yes/no  
Issues encountered  
Artifact paths

---

# Phase 3 — Admin Verifies Membership

## Context

Log in as the admin user again with:

- email: `playwright.admin.1773312256562@example.com`
- password: read from `E2E_PASSWORD`

## Goal

Verify that the invited user has successfully joined the space.

## Steps

1. Open http://217.160.34.25:8081
2. Log in as the admin user with `login_with_env_credentials`.
3. Navigate to the space:

   **Quarterly Ops Launch 2026-03-14 1545**

4. Open the **Members / Invite / Access management** section.
5. Locate the invited user.
6. Verify the user state is now:

   - member  
   - accepted  
   - active  

   instead of:

   - pending  
   - invited  

7. Capture evidence (trace or screenshot).
8. Close the browser session.

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
