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
    headers: response.headers,
    body,
  };
}

async function callableRequest(path, token, data = {}) {
  const response = await request(path, {
    method: "POST",
    headers: authHeaders(token, {"Content-Type": "application/json"}),
    body: JSON.stringify({data}),
  });

  assert.equal(response.status, 200);
  assert.ok(response.body.result);

  return response.body.result;
}

async function createActivationCode(email) {
  const response = await request("/createActivationCode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-payment-secret": "demo-payment-secret",
    },
    body: JSON.stringify({email}),
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.email, email);
  assert.equal(response.body.role, "admin");
  assert.ok(response.body.code);

  return response.body.code;
}

async function registerUser(email, displayName, activationCode) {
  const response = await request("/registerUser", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      email,
      password: "integration123",
      displayName,
      activationCode,
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.email, email);

  return response.body;
}

async function setUserRole(uid, role, adminToken) {
  const response = await request("/setUserRole", {
    method: "POST",
    headers: authHeaders(adminToken, {"Content-Type": "application/json"}),
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

test("functions expose configured CORS headers", async () => {
  const allowedOrigin = "http://localhost:5173";
  const allowedHttpHeaders = new Headers();
  allowedHttpHeaders.set("Origin", allowedOrigin);
  allowedHttpHeaders.set("Access-Control-Request-Method", "GET");

  const allowedCallableHeaders = new Headers();
  allowedCallableHeaders.set("Origin", allowedOrigin);
  allowedCallableHeaders.set("Access-Control-Request-Method", "POST");

  const allowedHttpResponse = await request("/helloHttp", {
    method: "OPTIONS",
    headers: allowedHttpHeaders,
  });
  assert.equal(allowedHttpResponse.status, 204);
  assert.equal(
    allowedHttpResponse.headers.get("access-control-allow-origin"),
    allowedOrigin
  );

  const allowedCallableResponse = await request("/helloCall", {
    method: "OPTIONS",
    headers: allowedCallableHeaders,
  });
  assert.equal(allowedCallableResponse.status, 204);
  assert.equal(
    allowedCallableResponse.headers.get("access-control-allow-origin"),
    allowedOrigin
  );
});

test("protected endpoints enforce owner and admin auth", async () => {
  const userEmail = uniqueEmail("integration-user");
  const otherEmail = uniqueEmail("integration-other");
  const adminEmail = uniqueEmail("integration-admin");
  const activationCode = await createActivationCode(adminEmail);

  const admin = await registerUser(
    adminEmail,
    "Integration Admin",
    activationCode
  );
  const user = await registerUser(userEmail, "Integration User");
  const otherUser = await registerUser(otherEmail, "Integration Other");

  assert.equal(admin.role, "admin");
  assert.equal(user.status, "pending");
  assert.equal(otherUser.status, "pending");

  const adminToken = await loginUser(adminEmail);
  const pendingUserToken = await loginUser(userEmail);

  const unauthenticatedResponse = await request("/getAllItems");
  assert.equal(unauthenticatedResponse.status, 401);

  const pendingUserResponse = await request("/getAllItems", {
    headers: authHeaders(pendingUserToken),
  });
  assert.equal(pendingUserResponse.status, 403);

  const regularUserSetRoleResponse = await request("/setUserRole", {
    method: "POST",
    headers: authHeaders(
      pendingUserToken,
      {"Content-Type": "application/json"}
    ),
    body: JSON.stringify({uid: user.uid, role: "user"}),
  });
  assert.equal(regularUserSetRoleResponse.status, 403);

  const pendingUsersResponse = await request("/listPendingUsers", {
    headers: authHeaders(adminToken),
  });
  assert.equal(pendingUsersResponse.status, 200);
  assert.ok(
    pendingUsersResponse.body.users.some((pendingUser) =>
      pendingUser.uid === user.uid
    )
  );

  const reuseCodeResponse = await request("/registerUser", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      email: uniqueEmail("integration-admin-reuse"),
      password: "integration123",
      displayName: "Integration Admin Reuse",
      activationCode,
    }),
  });
  assert.equal(reuseCodeResponse.status, 400);

  await setUserRole(user.uid, "user", adminToken);
  await setUserRole(otherUser.uid, "user", adminToken);

  const userToken = await loginUser(userEmail);
  const otherToken = await loginUser(otherEmail);

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

  const invalidCreateResponse = await request("/createItem", {
    method: "POST",
    headers: authHeaders(userToken, {"Content-Type": "application/json"}),
    body: JSON.stringify({
      name: "Invalid item",
      done: false,
      ownerId: user.uid,
    }),
  });
  assert.equal(invalidCreateResponse.status, 400);

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
    }),
  });
  assert.equal(adminUpdateResponse.status, 200);
  assert.equal(adminUpdateResponse.body.name, "Updated by admin");
  assert.equal(adminUpdateResponse.body.done, true);
  assert.equal(adminUpdateResponse.body.ownerId, user.uid);

  const invalidUpdateResponse = await request(`/updateItem?id=${itemId}`, {
    method: "PUT",
    headers: authHeaders(adminToken, {"Content-Type": "application/json"}),
    body: JSON.stringify({ownerId: admin.uid}),
  });
  assert.equal(invalidUpdateResponse.status, 400);

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

  const callableItem = await callableRequest("/createItemCall", userToken, {
    name: "Callable integration item",
    done: false,
  });
  assert.equal(callableItem.ownerId, user.uid);

  const callableReadItem = await callableRequest(
    "/getItemByIdCall",
    userToken,
    {id: callableItem.id}
  );
  assert.equal(callableReadItem.id, callableItem.id);

  const callableUpdatedItem = await callableRequest(
    "/updateItemCall",
    userToken,
    {
      id: callableItem.id,
      done: true,
    }
  );
  assert.equal(callableUpdatedItem.done, true);

  const callableList = await callableRequest("/getAllItemsCall", userToken, {
    limit: 10,
    offset: 0,
  });
  assert.ok(
    callableList.data.some((item) => item.id === callableItem.id)
  );

  const callableDelete = await callableRequest(
    "/deleteItemCall",
    userToken,
    {id: callableItem.id}
  );
  assert.equal(callableDelete.id, callableItem.id);

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
