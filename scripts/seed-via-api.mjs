import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(new URL('..', import.meta.url).pathname);
const normalizedRoot = process.platform === 'win32' && rootDir.startsWith('/') ? rootDir.slice(1) : rootDir;

const baseUrl = process.env.SEED_API_BASE_URL || 'http://localhost:4000';
const testDataDir = path.join(normalizedRoot, 'test-data');

const usersPath = path.join(testDataDir, 'users.json');
const spacesPath = path.join(testDataDir, 'spaces.json');
const tasksPath = path.join(testDataDir, 'tasks.json');

if (!fs.existsSync(usersPath) || !fs.existsSync(spacesPath) || !fs.existsSync(tasksPath)) {
  console.error('Missing test-data files. Run `pnpm run create:data` first.');
  process.exit(1);
}

const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
const spaces = JSON.parse(fs.readFileSync(spacesPath, 'utf8'));
const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);

  let body = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    const message = body?.message || `${response.status} ${response.statusText}`;
    throw new Error(`${pathname} [${response.status}] ${message}`);
  }

  return body;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function ensureUser(user) {
  const payload = {
    firstName: user.firstName,
    lastName: user.lastName,
    gender: user.gender,
    email: user.email,
    password: user.password
  };

  try {
    const registered = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return { token: registered.token, user: registered.user };
  } catch (error) {
    // Some server states return generic register errors for existing users.
    // Try login as fallback before failing hard.
    try {
      const logged = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: user.password })
      });
      return { token: logged.token, user: logged.user };
    } catch (loginError) {
      const registerMessage = String(error?.message || 'unknown');
      const loginMessage = String(loginError?.message || 'unknown');
      const staleHandlePattern =
        registerMessage.toLowerCase().includes('failed to create user') &&
        loginMessage.toLowerCase().includes('invalid credentials');

      if (staleHandlePattern) {
        throw new Error(
          `User bootstrap failed for ${user.email}. register='${registerMessage}', login='${loginMessage}'. ` +
            `Likely causes: (1) API server kept a stale SQLite handle after DB cleanup, or (2) this email exists with another password. ` +
            `Recovery: stop server -> pnpm run create:data -> start server -> pnpm run data:seed`
        );
      }

      throw new Error(
        `User bootstrap failed for ${user.email}. register='${registerMessage}', login='${loginMessage}'`
      );
    }
  }
}

function makeAliasEmail(email, suffix) {
  const at = email.indexOf('@');
  if (at === -1) {
    return `${email}+${suffix}@example.com`;
  }
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local}+${suffix}@${domain}`;
}

async function bootstrapUser(user, suffixBase) {
  try {
    return await ensureUser(user);
  } catch (baseError) {
    let lastError = baseError;

    // Retry with alias emails to avoid collisions with unknown existing accounts.
    for (let i = 1; i <= 5; i += 1) {
      const aliasEmail = makeAliasEmail(user.email, `${suffixBase}-${user.id}-${i}`);
      const aliasUser = { ...user, email: aliasEmail };
      try {
        const auth = await ensureUser(aliasUser);
        console.warn(
          `Fixture user ${user.email} could not be reused; created alias ${aliasEmail}`
        );
        return auth;
      } catch (aliasError) {
        lastError = aliasError;
      }
    }

    throw new Error(
      `User bootstrap failed for ${user.email}. Last error: ${lastError?.message || "unknown"}`
    );
  }
}

async function main() {
  console.log(`Seeding data via API at ${baseUrl}`);

  const authByUserId = new Map();
  const seedSuffix = `seed${Date.now()}`;

  for (const user of users) {
    const auth = await bootstrapUser(user, seedSuffix);
    authByUserId.set(user.id, auth);
  }

  console.log(`Users ready: ${authByUserId.size}`);

  const fixtureAdmins = users.filter((user) => Number(user.isAdmin || 0) === 1);
  const bootstrapAdminAuth = Array.from(authByUserId.values()).find(
    (auth) => Number(auth?.user?.isAdmin || 0) === 1
  );

  if (fixtureAdmins.length > 0 && bootstrapAdminAuth) {
    for (const fixtureUser of fixtureAdmins) {
      const targetAuth = authByUserId.get(fixtureUser.id);
      if (!targetAuth) {
        throw new Error(`Target auth missing for fixture userId ${fixtureUser.id}`);
      }

      try {
        await request(`/api/admin/users/${targetAuth.user.id}`, {
          method: 'PATCH',
          headers: authHeaders(bootstrapAdminAuth.token),
          body: JSON.stringify({ isAdmin: true })
        });
      } catch (error) {
        const message = String(error?.message || "");
        if (message.includes("[403]")) {
          console.warn(
            `Admin promotion skipped for user ${targetAuth.user.email}: ${message}`
          );
          continue;
        }
        throw error;
      }
    }
  } else if (fixtureAdmins.length > 0) {
    console.warn("No admin token available; skipping admin promotion for fixture users.");
  }

  const spaceIdByFixtureId = new Map();

  for (const fixtureSpace of spaces) {
    const ownerAuth = authByUserId.get(fixtureSpace.ownerUserId);
    if (!ownerAuth) {
      throw new Error(`Owner auth missing for ownerUserId ${fixtureSpace.ownerUserId}`);
    }

    const created = await request('/api/spaces', {
      method: 'POST',
      headers: authHeaders(ownerAuth.token),
      body: JSON.stringify({
        name: fixtureSpace.name,
        description: fixtureSpace.description
      })
    });

    spaceIdByFixtureId.set(fixtureSpace.id, created.id);
  }

  console.log(`Spaces created: ${spaceIdByFixtureId.size}`);

  for (const fixtureSpace of spaces) {
    const createdSpaceId = spaceIdByFixtureId.get(fixtureSpace.id);
    const ownerAuth = authByUserId.get(fixtureSpace.ownerUserId);
    if (!ownerAuth) {
      throw new Error(`Owner auth missing for ownerUserId ${fixtureSpace.ownerUserId}`);
    }

    for (const member of fixtureSpace.members) {
      if (member.role === 'owner') {
        continue;
      }

      const invitee = users.find((u) => u.id === member.userId);
      if (!invitee) {
        throw new Error(`Invitee not found for userId ${member.userId}`);
      }
      const inviteeAuth = authByUserId.get(invitee.id);
      if (!inviteeAuth) {
        throw new Error(`Invitee auth missing for userId ${invitee.id}`);
      }

      try {
        await request(`/api/spaces/${createdSpaceId}/invites`, {
          method: 'POST',
          headers: authHeaders(ownerAuth.token),
          body: JSON.stringify({ email: inviteeAuth.user.email })
        });
      } catch (error) {
        const message = String(error?.message || '').toLowerCase();
        if (!message.includes('already')) {
          throw error;
        }
      }

      const inviteList = await request('/api/invites', {
        headers: {
          Authorization: `Bearer ${inviteeAuth.token}`
        }
      });

      const matchingInvite = (inviteList || []).find(
        (invite) => invite.spaceName === fixtureSpace.name && invite.status === 'pending'
      );

      if (matchingInvite) {
        await request(`/api/invites/${matchingInvite.id}/accept`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${inviteeAuth.token}`
          }
        });
      }
    }
  }

  console.log('Membership invites processed');

  let createdTasks = 0;
  for (const task of tasks) {
    const createdSpaceId = spaceIdByFixtureId.get(task.spaceId);
    if (!createdSpaceId) {
      throw new Error(`Mapped space not found for fixture spaceId ${task.spaceId}`);
    }

    const creatorAuth = authByUserId.get(task.createdByUserId);
    if (!creatorAuth) {
      throw new Error(`Creator auth not found for userId: ${task.createdByUserId}`);
    }

    const assigneeAuth = task.assigneeUserId ? authByUserId.get(task.assigneeUserId) : null;

    await request(`/api/spaces/${createdSpaceId}/todos`, {
      method: 'POST',
      headers: authHeaders(creatorAuth.token),
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        status: task.status,
        assigneeUserId: assigneeAuth?.user?.id ?? null
      })
    });

    createdTasks += 1;
  }

  console.log(`Tasks created: ${createdTasks}`);
  console.log('Seed completed successfully.');
}

main().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
