import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedEmail, isAllowedGoogleAccount, safeReturnPath } from "../src/lib/auth-policy";

const owner = "owner@example.com";

test("only the exact verified Google account is admitted", () => {
  assert.equal(isAllowedGoogleAccount("google", owner, true, owner), true);
  assert.equal(isAllowedGoogleAccount("google", "OWNER@example.com", true, owner), true);
  for (const [provider, email, verified] of [
    ["google", "other@example.com", true],
    ["google", "owner@example.com.evil.test", true],
    ["google", owner, false],
    ["google", owner, "true"],
    ["google", undefined, true],
    ["github", owner, true],
  ]) assert.equal(isAllowedGoogleAccount(provider, email, verified, owner), false);
  assert.equal(isAllowedEmail(owner, ""), false);
  assert.equal(isAllowedEmail(owner, "   "), false);
  assert.equal(isAllowedEmail(owner, "new-owner@example.com"), false);
});

test("return URLs stay within application pages", () => {
  assert.equal(safeReturnPath("/katalog?op=%C4%8CD"), "/katalog?op=%C4%8CD");
  assert.equal(safeReturnPath("/soupravy/1"), "/soupravy/1");
  for (const value of [undefined, [], "https://evil.test", "//evil.test", "/\\evil.test", "/api/auth/signout", "/prihlaseni", "/x/../api/vozidla"])
    assert.equal(safeReturnPath(value), "/soupravy");
});
