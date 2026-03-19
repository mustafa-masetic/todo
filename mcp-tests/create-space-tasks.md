Open http://217.160.34.25:8081

Use the existing Playwright storage session from:
/Users/mustafamasetic/git/todo/.playwright/auth/mustafa-masetic-example-com-dbc13f6a.json

Assume this is an authenticated admin session.

Your task:
1. Create one new space with realistic generated test data.
2. Inside that space, create 10 tasks with varied realistic titles and descriptions.
3. Distribute task statuses across:
   - some "Just created"
   - some "In progress"
   - some "Done"
4. Assign some of the tasks to different available users in the UI.
5. Generate the test data yourself. Do not ask me for names, titles, or descriptions unless the UI blocks progress.
6. After completion, summarize:
   - created space name
   - all 10 task names
   - each task status
   - which tasks were assigned and to whom
7. If any step fails, inspect the UI, adapt, and continue.
8. Do not stop after opening the page. Complete the full workflow.

Important:
- Reuse the provided stored session instead of logging in manually.
- Prefer interacting through visible UI elements and stable selectors.
- If there are existing spaces or tasks, avoid modifying old data unless necessary.
- Use a unique generated space name so repeated runs do not collide.