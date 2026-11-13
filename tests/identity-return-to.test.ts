import assert from "node:assert/strict";
import { test } from "node:test";
import {
  identityErrorDestination,
  sanitizeIdentityReturnTo
} from "../lib/identity-return-to";

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
