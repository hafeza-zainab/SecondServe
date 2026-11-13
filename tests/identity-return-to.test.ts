import assert from "node:assert/strict";
import { test } from "node:test";
import {
  identityErrorDestination,
  sanitizeIdentityReturnTo
} from "../lib/identity-return-to";
import { isValidEntityId, MAX_ENTITY_ID_LENGTH } from "../lib/input-limits";

test("identity return paths are limited to the six navigation routes", () => {
  for (const route of ["/", "/donate", "/listings", "/dashboard", "/model", "/about"]) {
    assert.equal(sanitizeIdentityReturnTo(route), route);
  }
  assert.equal(sanitizeIdentityReturnTo("/other"), "/");
});

test("identity return paths reject backslash and protocol-relative inputs", () => {
  assert.equal(sanitizeIdentityReturnTo("/\\evil.example"), "/");
  assert.equal(sanitizeIdentityReturnTo("//evil.example/path"), "/");
});

test("identity errors append to an existing query string", () => {
  assert.equal(
    identityErrorDestination("/listings?message=claimed"),
    "/listings?message=claimed&identity=invalid"
  );
});

test("entity identifiers and identity return text have explicit length limits", () => {
  assert.equal(isValidEntityId("i".repeat(MAX_ENTITY_ID_LENGTH)), true);
  assert.equal(isValidEntityId("i".repeat(MAX_ENTITY_ID_LENGTH + 1)), false);
  assert.equal(isValidEntityId(""), false);
  assert.equal(sanitizeIdentityReturnTo("/about?x=" + "x".repeat(600)), "/");
});
