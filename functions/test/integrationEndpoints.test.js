/* eslint-disable @typescript-eslint/no-var-requires, require-jsdoc */

const assert = require("node:assert/strict");
const test = require("node:test");

const projectId = "guarderia-dev";
const functionsBaseUrl =
  `http://127.0.0.1:5001/${projectId}/us-central1`;
const authBaseUrl =
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`;
}

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await response.json();
  }

  return await response.text();
}

async function request(path, options = {}) {
  const response = await fetch(`${functionsBaseUrl}${path}`, options);
  const body = await readResponse(response);

  return {
    status: response.status,
    body,
  };
}

async function registerUser(email, displayName) {
  const response = await request("/registerUser", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      email,
      password: "integration123",
      displayName,
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.email, email);

  return response.body;
}

async function setUserRole(uid, role) {
  const response = await request("/setUserRole", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({uid, role}),
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.role, role);
}

async function loginUser(email) {
  const response = await fetch(
    `${authBaseUrl}/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        email,
        password: "integration123",
        returnSecureToken: true,
      }),
    }
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(body.idToken);

  return body.idToken;
}

function authHeaders(token, extraHeaders = {}) {
  return {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  };
}

test("protected endpoints enforce owner and admin auth", async () => {
  const userEmail = uniqueEmail("integration-user");
  const otherEmail = uniqueEmail("integration-other");
  const adminEmail = uniqueEmail("integration-admin");

  const user = await registerUser(userEmail, "Integration User");
  const otherUser = await registerUser(otherEmail, "Integration Other");
  const admin = await registerUser(adminEmail, "Integration Admin");

  await setUserRole(user.uid, "user");
  await setUserRole(otherUser.uid, "user");
  await setUserRole(admin.uid, "admin");

  const userToken = await loginUser(userEmail);
  const otherToken = await loginUser(otherEmail);
  const adminToken = await loginUser(adminEmail);

  const unauthenticatedResponse = await request("/getAllItems");
  assert.equal(unauthenticatedResponse.status, 401);

  const createItemResponse = await request("/createItem", {
    method: "POST",
    headers: authHeaders(userToken, {"Content-Type": "application/json"}),
    body: JSON.stringify({
      name: "Integration item",
      done: false,
    }),
  });

  assert.equal(createItemResponse.status, 201);
  assert.equal(createItemResponse.body.ownerId, user.uid);

  const itemId = createItemResponse.body.id;

  const ownerReadResponse = await request(`/getItemById?id=${itemId}`, {
    headers: authHeaders(userToken),
  });
  assert.equal(ownerReadResponse.status, 200);
  assert.equal(ownerReadResponse.body.id, itemId);

  const crossUserReadResponse = await request(`/getItemById?id=${itemId}`, {
    headers: authHeaders(otherToken),
  });
  assert.equal(crossUserReadResponse.status, 404);

  const adminReadResponse = await request(`/getItemById?id=${itemId}`, {
    headers: authHeaders(adminToken),
  });
  assert.equal(adminReadResponse.status, 200);
  assert.equal(adminReadResponse.body.ownerId, user.uid);

  const crossUserUpdateResponse = await request(`/updateItem?id=${itemId}`, {
    method: "PUT",
    headers: authHeaders(otherToken, {"Content-Type": "application/json"}),
    body: JSON.stringify({done: true}),
  });
  assert.equal(crossUserUpdateResponse.status, 404);

  const adminUpdateResponse = await request(`/updateItem?id=${itemId}`, {
    method: "PUT",
    headers: authHeaders(adminToken, {"Content-Type": "application/json"}),
    body: JSON.stringify({
      name: "Updated by admin",
      done: true,
      ownerId: admin.uid,
    }),
  });
  assert.equal(adminUpdateResponse.status, 200);
  assert.equal(adminUpdateResponse.body.name, "Updated by admin");
  assert.equal(adminUpdateResponse.body.done, true);
  assert.equal(adminUpdateResponse.body.ownerId, user.uid);

  const userListResponse = await request("/getAllItems?limit=10&offset=0", {
    headers: authHeaders(userToken),
  });
  assert.equal(userListResponse.status, 200);
  assert.ok(
    userListResponse.body.data.every((item) => item.ownerId === user.uid)
  );

  const adminListResponse = await request("/getAllItems?limit=10&offset=0", {
    headers: authHeaders(adminToken),
  });
  assert.equal(adminListResponse.status, 200);
  assert.ok(
    adminListResponse.body.data.some((item) => item.id === itemId)
  );

  const filename = `integration-${Date.now()}.txt`;
  const fileContent = "Storage integration content";
  const uploadResponse = await request(`/uploadFile?filename=${filename}`, {
    method: "POST",
    headers: authHeaders(userToken, {"Content-Type": "text/plain"}),
    body: fileContent,
  });

  assert.equal(uploadResponse.status, 201);
  assert.equal(uploadResponse.body.path, `users/${user.uid}/${filename}`);

  const ownerFilesResponse = await request("/listFiles", {
    headers: authHeaders(userToken),
  });
  assert.equal(ownerFilesResponse.status, 200);
  assert.ok(
    ownerFilesResponse.body.files.some((file) => file.name ===
      `users/${user.uid}/${filename}`)
  );

  const otherDownloadResponse = await request(
    `/downloadFile?filename=${filename}`,
    {headers: authHeaders(otherToken)}
  );
  assert.equal(otherDownloadResponse.status, 404);

  const adminFilesResponse = await request("/listFiles", {
    headers: authHeaders(adminToken),
  });
  assert.equal(adminFilesResponse.status, 200);
  assert.ok(
    adminFilesResponse.body.files.some((file) => file.name ===
      `users/${user.uid}/${filename}`)
  );

  const adminDownloadResponse = await request(
    `/downloadFile?filename=users/${user.uid}/${filename}`,
    {headers: authHeaders(adminToken)}
  );
  assert.equal(adminDownloadResponse.status, 200);
  assert.equal(adminDownloadResponse.body, fileContent);
});
