# Messenger Call Progress

## 2026-06-26 10:xx - Phase 1 Audit

Findings:

- Frontend is React 19 + Vite + TypeScript + MUI.
- Main chat UI is under `frontend/src/components/messenger` and `frontend/src/pages/messenger`.
- `MessengerHeader` already renders audio/video icon buttons, but they do not call anything yet.
- Realtime uses a custom WebSocket service at `/ws/messenger`, not Socket.IO.
- Backend is Go + Gin + GORM in `messenger-service`.
- Database is MySQL. Existing migrations live in `messenger-service/internal/infrastructure/db/migrations`.
- WebSocket already authenticates by JWT and validates conversation membership for room/message events.

Decision:

- Reuse the current WebSocket channel for call signaling.
- Add call history in MySQL via `call_sessions`.
- Implement 1-1 calls only in this pass; group calls are out of scope.
- Keep WebRTC/media logic in frontend only. Backend forwards SDP/ICE payloads and persists call lifecycle status.

Skipped for first pass:

- New Socket.IO server.
- Group calls.
- Recording or media storage.
- TURN credential service beyond env-ready config.

## 2026-06-26 10:xx - Backend Persistence + Signaling

Added:

- `call_sessions` MySQL migration.
- Manual rollback SQL for `call_sessions`.
- `CallSession` domain entity/model/repository.
- WebSocket signaling handlers for:
  - `call:initiate`
  - `call:accept`
  - `call:reject`
  - `call:cancel`
  - `call:end`
  - `call:failed`
  - `call:offer`
  - `call:answer`
  - `call:ice-candidate`
  - `call:reconnect`

Backend behavior:

- Validates both users are participants.
- Allows only 1-1 conversations.
- Tracks active calls in memory to return `busy`.
- Marks unanswered ringing calls as `missed` after 45 seconds.
- Persists status transitions and duration.
- Does not store SDP, ICE, audio, or video data.

Pending:

- Backend compile/test.
- Frontend WebRTC module and UI.
- HTTP call history listing, if needed by UI after first pass.

Update:

- Added `GET /api/v1/messenger/conversations/:conversation_id/calls`.
- Endpoint validates current user belongs to the conversation before returning call history.

## 2026-06-26 10:xx - Frontend Call Core

Added:

- Call state machine helper.
- WebRTC client wrapper using `RTCPeerConnection`.
- React call hook that:
  - starts outgoing calls,
  - handles incoming ringing,
  - accepts/rejects/cancels/ends calls,
  - relays offer/answer/ICE,
  - cleans media tracks on end/unmount/tab close.
- Call overlay UI:
  - incoming call dialog,
  - outgoing/status dialog,
  - active call screen,
  - mic/camera/switch/end controls.
- Existing `MessengerHeader` audio/video buttons are now wired to the call hook.

Notes:

- Receiver camera/mic are requested only after Accept.
- Caller camera/mic are requested after clicking call.
- Group conversations show disabled call buttons.

## 2026-06-26 10:52 - Verification

Passed:

- `go test ./...` in `messenger-service` using `golang:1.25`.
- `npm run build` in `frontend`.
- `make migrate-messenger`, including `004_create_call_sessions.sql`.

Also fixed:

- A pre-existing TypeScript precedence error in `MovieDetailDialog.tsx` that blocked full frontend build.

Still pending:

- Browser E2E with two logged-in users and fake media devices.
- Call history rendering inside the chat transcript. Persistence and read API exist, UI display is not added yet.
- Production TURN credential endpoint/config beyond the current `VITE_CALL_STUN_URL` dev hook.
