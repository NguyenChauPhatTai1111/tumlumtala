# Incoming Call Fix Report

## Progress

### Audit findings

- `CallLayer` and `useCall` were mounted inside `frontend/src/pages/messenger/components/MessengerContent.tsx`.
- `MessengerContent` only has reliable conversation context for the currently opened thread, so incoming call UI was not global.
- `useCall` only listened for `call:ringing`; the backend also used `call:ringing` for both caller and receiver, which made receiver-specific behavior ambiguous.
- `MessengerWebSocketService` did not expose handlers for `call:incoming`, `call:missed`, or `call:rejected`.
- Backend timeout marked the session as `missed` but emitted only `call:failed`, so the frontend had no dedicated missed-call event.

### Root cause

User B did not reliably receive a visible call action because the call subscription/UI lived in the chat content tree instead of an app-level provider. If B was online but the specific call hook was not mounted, or did not have the selected conversation context, the incoming event could not open the popup or ringtone.

## Planned changes

- Add app-level `GlobalCallProvider`.
- Keep existing chat websocket flow intact.
- Add `call:incoming`, `call:missed`, and `call:rejected` handling.
- Add ringtone service with cleanup.
- Emit incoming/missed events explicitly from backend.
- Move `CallLayer` out of `MessengerContent`.

## Implemented

### Backend

- `call:initiate` now sends `call:ringing` to caller A and `call:incoming` to receiver B.
- `call:reject` requests now emit `call:rejected`.
- Ring timeout now emits `call:missed` to both caller and receiver.
- Call event payload now includes both snake_case and camelCase fields, plus `expiresAt`.

### Frontend

- Added global call provider mounted under `GlobalAppProviders`.
- Moved call modal rendering out of `MessengerContent`.
- Header audio/video buttons now start calls through the global provider.
- Added `call:incoming`, `call:missed`, and `call:rejected` websocket handlers.
- Added ringtone service and stopped ringtone on accept/reject/cancel/end/missed.
- Added `cancelled` state so A cancel and B popup close are not treated as normal ended calls.
- Added a global snackbar notification when a missed call event is received.

## New event flow

1. A sends `call:initiate`.
2. Backend creates a call session with `ringing`.
3. A receives `call:ringing`.
4. B receives `call:incoming`.
5. B opens global `CallLayer` incoming dialog and starts ringtone.
6. B accept sends `call:accept`; both sides move to connecting and WebRTC starts.
7. B reject sends `call:reject`; backend updates rejected and emits `call:rejected`.
8. A cancel sends `call:cancel`; B stops ringtone and moves to `cancelled`.
9. Ring timeout updates missed and emits `call:missed` to both users.

## Verification

- Passed: `npm run build` in `frontend`.
- Passed: `docker run --rm -v /home/ntphuy/learning/tumlumtala:/src -w /src/messenger-service golang:1.25 go test ./...`.
- Go formatting was run with the Go Docker image because host `gofmt` is not installed.

## E2E status

- Repository currently has no Playwright spec/config discovered by `rg`.
- Playwright MCP was available, but Chromium/Chrome was missing.
- `npx playwright install chrome` failed because it requires sudo/password in this environment.
- Browser screenshot MCP also failed because its transport closed.

## Remaining risk

- Full 2-user browser E2E has not been executed in this environment.
- Missed call is persisted through `call_sessions` and surfaced as a global notification; rendering a dedicated missed-call item inside the message timeline still depends on the existing call-history/timeline integration.
