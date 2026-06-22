# Messenger — WebSocket

## Connection Lifecycle

```
useMessengerWebSocketConnection (mount)
  → new MessengerWebSocketService(url, token, userId)
  → service.connect()
      ├── new WebSocket(url)
      ├── onopen: flush pending joinRoom + markRead queue
      ├── onmessage: parse JSON → route to handlers
      ├── onclose: auto-reconnect (max 5 lần, delay 3s)
      └── onerror: log

Component unmount → service.disconnect()
```

**Reconnect:** Tự động reconnect tối đa 5 lần cách nhau 3s. Sau khi reconnect sẽ re-join room hiện tại.

**Event batching:** Debounce 0ms (setTimeout) để gom rapid events trong 1 tick.

---

## Events gửi lên server

| Method | Gửi khi nào |
|--------|-------------|
| `ws.joinRoom(convId, limit, offset)` | Chọn conversation |
| `ws.sendMessage(payload)` | *(không dùng, dùng HTTP thay thế)* |
| `ws.sendTypingStart(convId)` | Bắt đầu gõ text |
| `ws.sendTypingStop(convId)` | Ngừng gõ (debounce 2500ms) |
| `ws.markMessageAsSeen(convId, seq)` | Scroll đến message cuối |
| `ws.sendDelivered(convId, seq)` | Nhận được message mới |

---

## Events nhận từ server

### Message Events

| Event key | Handler | Mô tả |
|-----------|---------|-------|
| `message_created` / `message.created` | `onMessageCreated` | Message mới (kèm `conversation_version`) |
| `message_sent` / `message.sent` | `onMessageSent` | Xác nhận message đã gửi |
| `message_updated` / `message.updated` | `onMessageUpdated` | Message đã edit |
| `new_message` | `onNewMessage` | *(legacy, ít dùng)* |

### Receipt Events

| Event key | Handler | Mô tả |
|-----------|---------|-------|
| `message_delivered` / `message.delivered` | `onMessageDelivered` | Đã deliver đến client |
| `message_seen` / `message.seen` | `onMessageSeen` | Đã read (theo message id) |
| `message_seen_seq` | `onMessageSeenSeq` | Đã read (theo seq, batch) |

### Typing Events

| Event key | Handler | Mô tả |
|-----------|---------|-------|
| `typing.start` / `user_typing` | `onTypingStart` | User đang gõ |
| `typing.stop` | `onTypingStop` | User ngừng gõ |

### Conversation Events

| Event key | Handler | Mô tả |
|-----------|---------|-------|
| `conversation_updated` / `conversation.updated` | `onConversationUpdated` | Conversation thay đổi (name, avatar, background) |
| `participant_updated` / `participant.updated` | `onParticipantUpdated` | Member join/leave/update |
| `joined_room` | `onJoinedRoom` | Confirm join, trả về initial messages |

### Other

| Event key | Handler |
|-----------|---------|
| `error` | `onError` |

---

## Handler Registration

```typescript
// Đăng ký handlers (trong MessengerPage)
ws.addHandlers({
  onMessageCreated: (msg) => { ... },
  onConversationUpdated: (conv) => { ... },
  onTypingStart: ({ userId, name }) => { ... },
  onTypingStop: ({ userId }) => { ... },
  onMessageSeen: ({ messageId, userId }) => { ... },
  // ...
})

// Cleanup khi unmount
ws.removeHandlers(handlers)
```

---

## Hooks sử dụng WebSocket

| Hook | WS Events |
|------|-----------|
| `useMessengerSeenReceipts` | `onMessageSeen`, `onMessageSeenSeq` |
| `useMessengerDeliveryReceipts` | `onMessageDelivered` |
| `useMessengerTypingIndicator` | `onTypingStart`, `onTypingStop`, `onUserTyping` |
| `useWebSocketMessages` | `onJoinedRoom`, `onNewMessage`, `onMessageCreated` *(legacy)* |
