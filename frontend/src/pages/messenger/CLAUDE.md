# Messenger Module

> Dự án được chạy trên Refine framework và thư viện MUI
> Đọc file này trước khi làm việc với module messenger để nắm flow hiện tại.
> Đảm bảo khi tạo code cần phải đúng cấu trúc của biome và lint

## Cấu trúc thư mục

```
pages/messenger/
├── MessengerPage.tsx             # Root — wires state + handlers + layout
├── components/
│   ├── MessengerSidebar.tsx      # Conversation list, tabs, search input
│   └── MessengerContent.tsx      # Main chat area (header + messages + composer)
└── docs/                         # Chi tiết từng phần (xem bên dưới)

components/messenger/
├── MessengerHeader.tsx           # Top bar: title, member count, action icons
├── MessengerInfoPanel.tsx        # Right panel: group info, members, customization
├── MessengerSearchDetailPanel.tsx
├── composer/components/Composer.tsx  # Input + emoji/sticker picker + attachments
└── message/components/MessageList.tsx

hooks/messenger/                  # Toàn bộ business logic
services/messengerService.ts      # HTTP API client
services/messengerWebSocketService.ts  # WebSocket client
types/messenger.ts                # Type definitions
```

## Hook Chain (MessengerPage)

```
MessengerPage
├── useMessengerPageState           # Tập trung toàn bộ UI state
├── useMessengerWebSocketConnection # WS instance (auto-reconnect 5x)
├── useMessengerConversations       # Conversation list (stale 30s)
├── useMessengerMessages            # Messages hiện tại (polling 2s)
├── useMessengerSearch              # Search (debounce 2s)
├── useMessengerSendMessage         # Send + retry + optimistic
├── useMessengerConversationActions # Mutations: archive/rename/leave/...
├── useMessengerMessageActions      # Mutations: delete/react/edit
└── useConversationUnread           # Tính unread boundary để render divider
```

## Tài liệu chi tiết

**Features:**
- [Conversation management](docs/features/conversation.md) — Tạo, chọn, archive, xóa, đổi tên, leave
- [Messages](docs/features/messages.md) — Gửi, reply, edit, xóa, retry, reaction, pagination
- [Group & Theme](docs/features/group-theme.md) — Add/remove member, nickname, avatar, background
- [Search & Real-time](docs/features/search-realtime.md) — Search, typing indicator, read/delivery receipts

**Architecture:**
- [Data Flow](docs/data-flow.md) — Luồng dữ liệu, optimistic updates, real-time
- [WebSocket Events](docs/websocket.md) — Events, connection lifecycle
- [API Layer](docs/api.md) — HTTP endpoints, service functions, pagination

## Lưu ý quan trọng

- **Pending conversation:** Khi chọn user → conversation tạo ngay trong UI (`justCreatedConversation`) nhưng chỉ persist sau message đầu tiên (`pendingEmptyConversationId`).
- **Optimistic messages:** Gửi ngay vào `pendingMessages` với `temp_id`, thay thế bằng real message khi server confirm.
- **Draft:** Lưu text + attachments per-conversation trong `conversationDrafts`.
- **Unread divider:** Tính từ `lastReadSeq` + `unreadCount` của participant; cuộn đến đây khi mở conversation.
- **File limits:** Images ≤ 10, videos ≤ 1, files ≤ 10, tổng ≤ 100MB.
- **Theme:** 16 preset + custom gradient editor; lưu vào `conversation.background_color` / bubble colors.
