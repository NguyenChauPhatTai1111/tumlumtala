# Messenger — Data Flow

## 1. Initial Load

```
MessengerPage mount
  → useMessengerWebSocketConnection: connect(url, token)
  → useMessengerConversations: GET /messenger/conversations (stale 30s)
  → Render sidebar với conversation list

User click conversation
  → handleSelectConversation(id)
      ├── snapshot openingUnreadSnapshot (unread_count tại thời điểm mở)
      ├── setSelectedConversationId(id)
      ├── resetConversationThreadState() — clear messages + reply/edit state
      └── conversationActions.markRead(id)

  → useMessengerMessages: GET /messenger/conversations/:id/messages
      (polling every 2s, staleTime: 0)
  → ws.joinRoom(conversationId, limit=50, offset=0)
  → useConversationUnread: tính unreadBoundarySeq → cuộn đến đó
```

## 2. Gửi Message (Optimistic)

```
User nhấn Send
  └── useMessengerSendMessage.sendMessage(payload)
        ├── Tạo optimistic message { temp_id, pending: true, content, ... }
        ├── setPendingMessages([...prev, optimistic])
        ├── [Nếu có file] uploadMessageAttachment(conversationId, file)
        │     → POST /messenger/conversations/:id/attachments
        │     → Nhận attachment_url
        ├── sendMessageMutation.mutateAsync({ content, attachment_url, reply_to_id, ... })
        │     → POST /messenger/conversations/:id/messages
        │     → Nhận { id, seq, created_at, ... }
        ├── Update optimistic message: { id, seq, pending: false }
        └── [Nếu pendingEmptyConversationId] clearJustCreatedConversation()
```

**Retry khi thất bại:**
```
Message failed → retryMessage(failedMsg)
  ├── Nếu file là blob URL → re-upload
  └── Gửi lại với cùng content
```

## 3. Nhận Message Real-time

```
WebSocket event: message_created / message.created
  → MessengerWebSocketService.onMessageCreated(msg)
  → Handlers notify MessengerPage
  → React Query invalidate messages cache
  → useMessengerMessages refetch (hoặc polling 2s tự chạy)
  → MessageList re-render với message mới
  → Auto-scroll nếu đang ở cuối
```

## 4. Conversation Updated (Real-time)

```
WS event: conversation.updated
  → onConversationUpdated(conversation)
  → invalidate conversations cache
  → Sidebar re-render với name/avatar/last_message mới
```

## 5. Search Flow

```
User gõ vào search input (sidebar)
  → setKeyword(text) với debounce 2000ms
  → searchAllMessages(keyword, limit=10)
      → GET /messenger/messages/search?q=keyword
  → searchUsers(keyword)
      → GET /users/search?q=keyword
  → Hiển thị grouped results

User click "Search in conversation" (header icon)
  → openDialog("searchMessages")
  → loadConversationDetail(conversationId, keyword)
      → GET /messenger/conversations/:id/messages/search
  → Click result → scrollToMessageAndHighlight(messageId)
      ├── Nếu message không có trong list → loadMoreMessages đến khi tìm thấy
      ├── scrollToMessage(id)
      └── setTimeout highlight 2000ms rồi clear
```

## 6. Unread Boundary

```
handleSelectConversation(id)
  → snapshot { unread_count, last_read_seq } từ participant
  → useConversationUnread nhận snapshot
      ├── Tìm message có seq > last_read_seq (hoặc từ cuối - unread_count)
      ├── Nếu unread_count > messages hiện có → loadMoreMessages
      ├── Set unreadBoundarySeq (seq của message trước cái đầu tiên chưa đọc)
      └── Set initialUnreadScrollMessageId → MessageList cuộn đến đây 1 lần
```

## 7. State Reset khi đổi Conversation

```
resetConversationThreadState()
  ├── Clear olderMessages, pendingMessages
  ├── Clear replyingMessage, editingMessage
  └── Clear searchedMessages, scrollToMessageId

resetResponsiveConversationState() [mobile only]
  └── setShowConversationList(false)
```

## 8. Background / Theme Update

```
User mở dialog "background"
  → applyBackgroundGradientStops() — preview realtime trong UI
  → User click Save
      → handleSaveConversationBackground()
          ├── [Nếu có image file] include file trong FormData
          └── conversationActions.updateBackground(id, { background_color, gradient_stops, bubble_colors, ... })
              → PATCH /messenger/conversations/:id/background
              → invalidate conversation cache
```

## 9. Pagination (Load Older Messages)

```
User cuộn lên đỉnh
  → handleLoadMoreMessages() → handleLoadMoreWithAnchor()
      ├── Lưu anchor element (message hiện tại ở top)
      ├── GET /messenger/conversations/:id/messages?offset=current_count
      ├── Prepend vào olderMessages
      └── Restore scroll position về anchor element
```
