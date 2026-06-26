# Messenger Call Final Report

## Architecture Added

- 1-1 audio/video call signaling reuses the existing `/ws/messenger` WebSocket.
- WebRTC peer connection and media streams live only in the frontend.
- Backend persists call lifecycle in `call_sessions`.
- Backend forwards SDP/ICE transiently and does not persist media/signaling payloads.

## Backend

Added:

- `call_sessions` MySQL migration:
  - `messenger-service/internal/infrastructure/db/migrations/main/004_create_call_sessions.sql`
  - rollback: `messenger-service/internal/infrastructure/db/migrations/down/004_drop_call_sessions.sql`
- `CallSession` entity/model/repository.
- WebSocket handlers:
  - `call:initiate`
  - `call:ringing`
  - `call:accept`
  - `call:reject`
  - `call:cancel`
  - `call:offer`
  - `call:answer`
  - `call:ice-candidate`
  - `call:end`
  - `call:busy`
  - `call:failed`
  - `call:reconnect`
- `GET /api/v1/messenger/conversations/:conversation_id/calls`

Backend rules:

- Only participants can call.
- Only 1-1 conversations are allowed.
- Active call map returns busy for users already in a call.
- Ringing timeout marks call as missed after 45 seconds.
- Ended calls store duration.

## Frontend

Added:

- `frontend/src/features/calls`
  - state machine
  - WebRTC client
  - call hook
  - call overlay UI
  - call history API wrapper
- Existing `MessengerHeader` call/video buttons now start calls.
- Incoming popup supports accept/reject.
- Active call screen supports:
  - mute/unmute mic
  - camera on/off
  - switch camera if available
  - end call
  - reconnecting state
  - timer

## Environment

Current dev default:

```env
VITE_CALL_STUN_URL=stun:stun.l.google.com:19302
```

Production should add TURN configuration. Do not hard-code TURN credentials in frontend.

## Verification

Passed:

```bash
docker run --rm -v /home/ntphuy/learning/tumlumtala:/src -w /src/messenger-service golang:1.25 go test ./...
npm run build
make migrate-messenger
```

## Local Run

```bash
make migrate-messenger
make start
cd frontend && npm run dev
```

For browser media E2E, launch Chromium with:

```bash
--use-fake-ui-for-media-stream --use-fake-device-for-media-stream
```

## Remaining Limits

- Group calls are not implemented.
- Call history is persisted and readable by API, but not rendered in the message transcript yet.
- E2E two-user fake-media Playwright flow is not added yet.
- Active call busy state is in-memory per messenger-service process; production multi-instance needs Redis/shared presence.
- TURN credentials endpoint is not implemented.

## Production Recommendations

- Add TURN server and short-lived TURN credential endpoint.
- Add Redis-backed active call/presence state for multi-instance deploys.
- Add metrics: call initiated, accepted, rejected, missed, failed, duration, ICE failure rate.
- Avoid logging SDP/ICE payloads in production.
- Add browser E2E fake-media call flow to CI.
