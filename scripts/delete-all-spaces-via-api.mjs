import process from "node:process";

const baseUrl = (process.env.DELETE_ALL_SPACES_API_BASE_URL ||
  process.env.SEED_API_BASE_URL ||
  "http://localhost:4000").replace(/\/$/, "");

const email =
  process.env.DELETE_ALL_SPACES_EMAIL || process.env.E2E_EMAIL || "";
const password =
  process.env.DELETE_ALL_SPACES_PASSWORD || process.env.E2E_PASSWORD || "";

if (!email || !password) {
  console.error(
    "Missing credentials. Set DELETE_ALL_SPACES_EMAIL/DELETE_ALL_SPACES_PASSWORD or E2E_EMAIL/E2E_PASSWORD."
  );
  process.exit(1);
}

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
    const error = new Error(`${pathname} [${response.status}] ${message}`);
    error.status = response.status;
    throw error;
  }

  return body;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
}

async function login() {
  const auth = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  return auth.token;
}

async function deleteViaAdminApi(token) {
  const spaces = await request("/api/admin/spaces", {
    headers: authHeaders(token)
  });

  if (!Array.isArray(spaces) || spaces.length === 0) {
    console.log("No spaces found through admin API.");
    return true;
  }

  for (const space of spaces) {
    await request(`/api/admin/spaces/${space.id}`, {
      method: "DELETE",
      headers: authHeaders(token)
    });
    console.log(`Deleted space via admin API: ${space.name} (#${space.id})`);
  }

  console.log(`Deleted ${spaces.length} spaces via admin API.`);
  return true;
}

async function deleteNonAdminUsersViaAdminApi(token) {
  const users = await request("/api/admin/users", {
    headers: authHeaders(token)
  });

  if (!Array.isArray(users) || users.length === 0) {
    console.log("No users found through admin API.");
    return true;
  }

  const deletableUserIds = users
    .filter((user) => Number(user.isAdmin || 0) !== 1)
    .map((user) => user.id);

  if (deletableUserIds.length === 0) {
    console.log("No non-admin users to delete.");
    return true;
  }

  await request("/api/admin/users/bulk", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      action: "delete",
      userIds: deletableUserIds
    })
  });

  console.log(`Deleted ${deletableUserIds.length} non-admin users via admin API.`);
  return true;
}

async function deleteOwnedSpaces(token) {
  const spaces = await request("/api/spaces", {
    headers: authHeaders(token)
  });

  if (!Array.isArray(spaces) || spaces.length === 0) {
    console.log("No spaces found for current user.");
    return;
  }

  const ownedSpaces = spaces.filter((space) => space.role === "owner");
  const skippedSpaces = spaces.filter((space) => space.role !== "owner");

  for (const space of ownedSpaces) {
    await request(`/api/spaces/${space.id}`, {
      method: "DELETE",
      headers: authHeaders(token)
    });
    console.log(`Deleted owned space: ${space.name} (#${space.id})`);
  }

  if (skippedSpaces.length > 0) {
    console.log(
      `Skipped ${skippedSpaces.length} spaces where the authenticated user is not the owner.`
    );
  }

  console.log(`Deleted ${ownedSpaces.length} owned spaces.`);
}

async function main() {
  console.log(`Deleting spaces and non-admin users via API at ${baseUrl}`);
  const token = await login();

  try {
    await deleteViaAdminApi(token);
    await deleteNonAdminUsersViaAdminApi(token);
  } catch (error) {
    if (error?.status === 403) {
      console.log(
        "Admin API not available for this user. Falling back to owned spaces only."
      );
      await deleteOwnedSpaces(token);
      return;
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
