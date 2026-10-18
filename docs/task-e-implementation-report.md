# Task E implementation report

## A. Root cause analysis

The existing form already called preventDefault(), awaited POST /api/auth/password/change through AuthContext/authService, disabled its submit button, and attempted to show an inline success banner. It did not explicitly navigate or reload the page.

The problem was the global loading flag in AuthContext.changePassword. PrivateRoute replaces its children with the authentication loading screen whenever that flag is true. Consequently, submitting a password change unmounted Profile, discarded its local pending/input/tab state, and prevented the old component's success/error notification from being displayed reliably. When global loading ended, a fresh Profile mounted on its default information tab.

The form also lacked an immediate duplicate-request guard independent of React's next render. Visibility buttons were excluded from the keyboard tab order and did not have accessible names. Success/error banners had no live-region roles.

## B. Implemented changes

All paths are relative to rehome-frontend/.

| File | Component | Modification |
|---|---|---|
| src/context/AuthContext.jsx | AuthProvider.changePassword | Removed global authentication loading updates for this operation only. Existing payload normalization and service call remain. |
| src/features/auth/pages/ProfilePage.jsx | Change Password form | Added a synchronous pending ref and unmount guard; retained local loading through the real promise; disabled password inputs/toggles while pending; added accessible, dismissible success notification and alert errors; clear/remask fields only after success. |
| src/features/auth/styles/profile-password.css | Profile password form | Scoped native Edge reveal suppression to Profile's password form. |
| tests/profile-password.browser.mjs | Profile integration fixture | Tests the actual AuthProvider, PrivateRoute, Profile and UI with a deferred service mock and synthetic session storage. |
| tests/admin-ui.browser.mjs | Task D regression fixture | Added CSS-import handling because Profile now imports a scoped stylesheet; the fixture continues using the production build's CSS. |
| docs/task-e-implementation-report.md | Report | Documents behavior, compatibility, verification and remaining limits. |

No dependency was installed. No backend, endpoint, route, role, recovery/login form, or financial/configuration implementation was changed. Earlier label cleanup and Profile footer removal are preserved. No commit or push was made.

## C. Password change flow and API compatibility

1. Native required fields and the existing frontend validators check the current password, minimum six-character new password, and matching confirmation. Their rules are unchanged.
2. A synchronous ref prevents repeated submissions before React renders the disabled button.
3. Profile owns the pending state. It stays mounted, shows the existing spinner with "Đang cập nhật mật khẩu...", exposes aria-busy, and disables the password fields, reveal controls and submit action.
4. AuthContext delegates to the existing service, which sends POST /api/auth/password/change with oldPassword, newPassword and newPasswordRepeat. Success follows resolution of the existing service promise; the service rejects non-successful HTTP requests.
5. After confirmed success, Profile shows "Mật khẩu đã được thay đổi thành công." in a dismissible role=status notification, clears all three password values and restores masked inputs. The notification stays until dismissed or the next attempt; no notification timer can clear a later result.
6. On failure, the existing formatted service error appears with role=alert, loading stops, and the form becomes usable. No success notification appears. Existing backend error messages include wrong current password, mismatched confirmation, missing password, and new password matching the old password, all defined as HTTP 400.
7. Genuine session expiry still follows the existing AuthContext event handler, PrivateRoute and API interceptor behavior. The page does not suppress expiry or restore an invalid session. Late responses after unmount cannot display success.

Backend inspection: AuthServiceImpl.changePassword validates confirmation/current password/new-versus-old password, saves the hash, and revokes all account refresh tokens. The controller returns a success string and does not issue replacement tokens. This frontend change preserves that policy and the existing refresh/401 handling; it does not introduce a forced logout, silently refresh revoked tokens, or claim an indefinitely valid session.

Password visibility retains the existing two controls: current password, and new/confirmation together. The controls now have accessible names, aria-controls/aria-pressed, keyboard focus and visible focus outlines. Autocomplete hints identify current and new passwords. Native reveal suppression applies only to this Profile form.

## D. Test results

Headless Chrome: 42/42 checks passed. Headless Edge: 42/42 checks passed.

The fixture uses the actual AuthProvider, PrivateRoute and Profile. Authentication/profile services and storage are mocked; no real password was changed and no real account or token was used. The deferred mock response allows pending state, repeated same-tick submissions and late responses to be inspected explicitly.

| Test ID | Result | Evidence and limits |
|---|---|---|
| TC-E-001 | PASS | Profile renders for the fixture account with existing account information. |
| TC-E-002 | PASS | Empty native form is invalid; submit handler blocks empty data without a request. |
| TC-E-003 | PASS | Short and mismatched passwords produce errors and no request. |
| TC-E-004 | PASS | Valid input initiates the service with the unchanged three-field contract. |
| TC-E-005 | PASS | Actual route guard retains Profile; global auth loading remains false; local spinner, label and disabled/busy state visible. |
| TC-E-006 | PASS | Five synchronous submit events cause exactly one service request. Native submit default is prevented. |
| TC-E-007 | PASS | No success before resolution; confirmed service resolution shows the accessible success notification. |
| TC-E-008 | PASS | All three values cleared, inputs remasked, stale errors cleared, loading ended. |
| TC-E-009 | PASS | Mock wrong-current-password error displayed without success; retry remains available. |
| TC-E-010 | PASS | Mock network/server/rate-limit failures stop loading and leave usable fields; retry can succeed. These are service-layer failure simulations, not live HTTP tests. |
| TC-E-011 | PASS | Actual auth:expired handler and route guard clear/deny the fixture session. A subsequent late success response cannot restore Profile or show success. Real 401/refresh HTTP handling was not exercised. |
| TC-E-012 | PASS | Both custom visibility controls toggle the expected inputs and expose pressed state. Scoped Edge CSS and control count checked. Native eye-icon appearance during trusted typing remains a manual visual check. |
| TC-E-013 | NOT RUN | Native Tab/Shift+Tab/Enter traversal and screen-reader testing were not performed. Buttons passed programmatic focusability/accessibility-attribute checks. |
| TC-E-014 | PASS | Mock remount and full fixture-document reload restore the expected account view without stale password state or notification. Real token validity after a password change remains unverified. |
| TC-E-015 | PASS | Functional headless checks pass in both Chrome and Edge; no page overflow at 375/768/1280/1440px. |
| TC-E-016 | PASS | Account information remains unchanged after the password operation; information and session tabs remain available. Unchanged Profile save logic was verified by source comparison; no live profile update was attempted. |

Additional checks:

- Production build: PASS, 269 modules. Existing bundle-size warning remains.
- Task A/B automated tests: PASS, 16/16.
- Task D Chrome fixture: PASS, 154/154.
- Source integrity: PASS. login, loginWithGoogle, logout, refreshAuth, updateProfile, handleSaveProfile, avatar presets and password validation remain unchanged.
- git diff --check: PASS.
- Lint: NOT RUN; no configured script.
- Type checking: NOT RUN; no configured script/TypeScript setup.
- Live backend integration/manual browser testing: NOT RUN.

Reproduction commands from rehome-frontend/:

```text
npm run build
node tests/profile-password.browser.mjs chrome
node tests/profile-password.browser.mjs edge
node tests/admin-ui.browser.mjs chrome
node --test tests/auth-recovery.test.mjs tests/role-navigation.test.mjs
```

## E. Regression assessment

- Profile/account information: layout, data and save logic preserved; the scoped form now survives password submission.
- Validation: existing rules and field identifiers preserved; new autocomplete hints do not change validation.
- Visibility: original two-control behavior preserved, with keyboard access and scoped native-reveal suppression.
- Session: only request-loading ownership changed. Auth expiry, token refresh, login, OAuth, logout and authorization code were not rewritten.
- Login/recovery/navigation: existing automated tests pass; source unaffected.
- Other Profile actions: information/session tabs tested; profile save implementation unchanged. Live profile updates and logout were not tested in this fixture.
- Task D cleanup: Profile footer remains absent and internal labels remain clean; its Chrome regression fixture passes.

## F. Remaining issues

- The referenced Bug Definition PDF was unavailable. The supplied Task E description was used; exact screenshot styling was not verified.
- The success UI is an accessible notification using Profile's existing banner style; no new global toast system or modal library was introduced.
- No real authenticated password change, refresh-token revocation, subsequent old/new password login, or access-token expiry was tested. Those require a disposable backend test account.
- Manual trusted typing in Edge is still needed to visually confirm the native reveal icon is absent; both custom toggles and shipped CSS were verified.
- Full keyboard traversal and assistive-technology announcement testing remain unverified.
- Profile update still uses the existing global loading behavior. It was preserved because this task concerns password change only; this report does not claim to fix unrelated Profile operations.
- A follow-up should verify the live session lifecycle with a disposable account, then perform manual keyboard/screen-reader and Edge native-control checks.
