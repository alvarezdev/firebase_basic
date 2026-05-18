/* eslint-disable @typescript-eslint/no-var-requires, require-jsdoc */

const fs = require("fs");
const path = require("path");
const test = require("node:test");

const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} = require("firebase/firestore");
const {
  deleteObject,
  getBytes,
  ref,
  uploadString,
} = require("firebase/storage");

const projectId = "guarderia-dev";
const bucket = `${projectId}.appspot.com`;

let testEnv;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: fs.readFileSync(
        path.resolve(__dirname, "../../firestore.rules"),
        "utf8"
      ),
    },
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: fs.readFileSync(
        path.resolve(__dirname, "../../storage.rules"),
        "utf8"
      ),
    },
  });
});

test.after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    const storage = context.storage(bucket);

    await setDoc(doc(firestore, "items/user-item"), {
      name: "User item",
      done: false,
      ownerId: "user-uid",
    });

    await setDoc(doc(firestore, "items/admin-item"), {
      name: "Admin item",
      done: false,
      ownerId: "admin-uid",
    });

    await setDoc(doc(firestore, "users/pending-uid"), {
      uid: "pending-uid",
      email: "pending@example.com",
      role: "pending",
      status: "pending",
    });

    await setDoc(doc(firestore, "activationCodes/SUB-TEST"), {
      code: "SUB-TEST",
      role: "admin",
      used: false,
    });

    await uploadString(
      ref(storage, "users/user-uid/file.txt"),
      "User file"
    );

    await uploadString(
      ref(storage, "users/admin-uid/file.txt"),
      "Admin file"
    );
  });
});

function firestoreFor(auth) {
  return auth ?
    testEnv.authenticatedContext(auth.uid, auth.claims).firestore() :
    testEnv.unauthenticatedContext().firestore();
}

function storageFor(auth) {
  return auth ?
    testEnv.authenticatedContext(auth.uid, auth.claims).storage(bucket) :
    testEnv.unauthenticatedContext().storage(bucket);
}

test("Firestore blocks unauthenticated item access", async () => {
  const firestore = firestoreFor(null);

  await assertFails(getDoc(doc(firestore, "items/user-item")));
  await assertFails(setDoc(doc(firestore, "items/new-item"), {
    name: "New item",
    done: false,
    ownerId: "user-uid",
  }));
});

test("Firestore allows owners and blocks cross-user access", async () => {
  const ownerDb = firestoreFor({uid: "user-uid", claims: {role: "user"}});
  const otherDb = firestoreFor({uid: "other-uid", claims: {role: "user"}});

  await assertSucceeds(getDoc(doc(ownerDb, "items/user-item")));
  await assertSucceeds(updateDoc(doc(ownerDb, "items/user-item"), {
    done: true,
  }));
  await assertFails(getDoc(doc(otherDb, "items/user-item")));
  await assertFails(deleteDoc(doc(otherDb, "items/user-item")));
});

test("Firestore allows admins to access other users items", async () => {
  const adminDb = firestoreFor({uid: "admin-uid", claims: {role: "admin"}});

  await assertSucceeds(getDoc(doc(adminDb, "items/user-item")));
  await assertSucceeds(updateDoc(doc(adminDb, "items/user-item"), {
    done: true,
  }));
  await assertSucceeds(deleteDoc(doc(adminDb, "items/user-item")));
});

test("Firestore blocks pending users from protected items", async () => {
  const pendingDb = firestoreFor({
    uid: "pending-uid",
    claims: {role: "pending"},
  });

  await assertSucceeds(getDoc(doc(pendingDb, "users/pending-uid")));
  await assertFails(setDoc(doc(pendingDb, "items/pending-item"), {
    name: "Pending item",
    done: false,
    ownerId: "pending-uid",
  }));
});

test("Firestore blocks direct access to activation codes", async () => {
  const adminDb = firestoreFor({uid: "admin-uid", claims: {role: "admin"}});

  await assertFails(getDoc(doc(adminDb, "activationCodes/SUB-TEST")));
});

test("Storage blocks unauthenticated file access", async () => {
  const storage = storageFor(null);

  await assertFails(getBytes(ref(storage, "users/user-uid/file.txt")));
  await assertFails(uploadString(
    ref(storage, "users/user-uid/new-file.txt"),
    "New file"
  ));
});

test("Storage allows owners and blocks cross-user access", async () => {
  const ownerStorage = storageFor({
    uid: "user-uid",
    claims: {role: "user"},
  });
  const otherStorage = storageFor({
    uid: "other-uid",
    claims: {role: "user"},
  });

  await assertSucceeds(getBytes(
    ref(ownerStorage, "users/user-uid/file.txt")
  ));
  await assertSucceeds(uploadString(
    ref(ownerStorage, "users/user-uid/new-file.txt"),
    "New file"
  ));
  await assertFails(getBytes(
    ref(otherStorage, "users/user-uid/file.txt")
  ));
  await assertFails(deleteObject(
    ref(otherStorage, "users/user-uid/file.txt")
  ));
});

test("Storage allows admins to access other users files", async () => {
  const adminStorage = storageFor({
    uid: "admin-uid",
    claims: {role: "admin"},
  });

  await assertSucceeds(getBytes(
    ref(adminStorage, "users/user-uid/file.txt")
  ));
  await assertSucceeds(deleteObject(
    ref(adminStorage, "users/user-uid/file.txt")
  ));
});

test("Storage blocks pending users from user folders", async () => {
  const pendingStorage = storageFor({
    uid: "pending-uid",
    claims: {role: "pending"},
  });

  await assertFails(uploadString(
    ref(pendingStorage, "users/pending-uid/file.txt"),
    "Pending file"
  ));
});
