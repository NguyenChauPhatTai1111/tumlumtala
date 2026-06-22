# Feature: Search & Real-time

## 1. Search toàn cục (sidebar)

**Entry point:** Sidebar → search input (luôn hiện ở top)

**Components involved:**
- `MessengerSidebar` → search `TextField`
- `useMessengerSearch` → `searchAllMessages()` + `searchUsers()`

**Flow chi tiết:**
1. User gõ → `setKeyword(text)` với debounce **2000ms**
2. Sau debounce → đồng thời gọi:
   - `searchAllMessages(keyword, limit=10)` → `GET /messenger/messages/search?q=...`
   - `searchUsers(keyword)` → `GET /users/search?q=...`
3. Kết quả hiển thị ngay trong sidebar (thay thế conversation list):
   - **Users:** Avatar + tên, click → `handleSelectUser()` (mở/tạo conversation)
   - **Messages:** Grouped theo conversation, preview nội dung, timestamp
4. Clear search → sidebar quay lại conversation list bình thường

**State trong `useMessengerSearch`:**
- `keyword`: text hiện tại
- `userResults`: danh sách user khớp
- `globalResults`: danh sách message khớp (kèm conversation info)

---

## 2. Search trong conversation

**Entry point:** Header → icon kính lúp

**Components involved:**
- `MessengerHeader` → click search icon → `onToggleSearch()` → `openInputDialog("searchMessages")`
- `MessengerSearchDetailPanel` (right panel)
- `useMessengerSearch.loadConversationDetail()`

**Flow chi tiết:**
1. Click search icon trong header → `toggleInfoPanel("search")` → mở `MessengerSearchDetailPanel`
2. User gõ keyword trong panel → `loadConversationDetail(conversationId, keyword)`
   → `GET /messenger/conversations/:id/messages/search?q=...&limit=20&offset=0`
3. Kết quả hiển thị dạng list: preview nội dung, timestamp, sender
4. Click kết quả:
   a. `setScrollToMessageId(messageId)` + đóng search panel
   b. `scrollToMessageAndHighlight(messageId)`:
      - Nếu message chưa load → gọi `handleLoadMoreMessages()` lặp đến khi tìm thấy
      - Scroll đến DOM element của message
      - Apply highlight class → setTimeout 2000ms → remove highlight
5. "Load more" → `loadMoreConversationDetail()` (tăng offset)

**Pagination:** `detailOffset`, `detailHasMore` trong `useMessengerSearch`

---

## 3. Typing Indicator

**Entry point:** User gõ text trong Composer

**Components involved:**
- `useTypingIndicator` (trong Composer)
- `useMessengerMessageListModel` → `typingNames` → `MessageListViewport`

**Flow gửi:**
1. `handleComposerTextChange(text)`:
   - Nếu `text.length > 0` và chưa typing → `ws.sendTypingStart(conversationId)`
   - Set `isTyping = true`
2. Debounce **2500ms** sau lần gõ cuối → `ws.sendTypingStop(conversationId)`
3. Unmount Composer → `ws.sendTypingStop()` (cleanup)

**Flow nhận:**
1. WS event `typing.start` / `user_typing` → `onTypingStart({ userId, name })`
2. `useMessengerTypingIndicator` cập nhật `typingUsers` map: `{ userId: { name, timeout } }`
3. Set timeout 5s: nếu không nhận `typing.stop` sau 5s → tự remove
4. WS event `typing.stop` → remove userId khỏi map ngay lập tức
5. `typingNames` = array tên đang gõ → render "X is typing..." dưới message list

**Hiển thị:**
- 1 người: "Alice is typing..."
- 2 người: "Alice and Bob are typing..."
- 3+ người: "Several people are typing..."

---

## 4. Read Receipts (Seen)

**Entry point:** User mở conversation + scroll đến message

**Components involved:**
- `useMessengerSeenReceipts` → `ws.markMessageAsSeen()`
- `useMessengerMessageListModel` → `seenReceipts`, `maxSeenSeqFromReceiptsByUser`
- `MessageListViewport` → avatar nhỏ dưới message

**Flow gửi seen:**
1. Mở conversation → `conversationActions.markRead(id)` (HTTP)
2. IntersectionObserver theo dõi message cuối cùng visible
3. Khi message cuối scroll vào view → `ws.markMessageAsSeen(conversationId, seq)`

**Flow nhận seen:**
1. WS event `message_seen` / `message.seen` → `onMessageSeen({ messageId, userId, seq })`
2. `seenReceipts` map: `{ messageId: Set<userId> }`
3. `maxSeenSeqFromReceiptsByUser` map: `{ userId: maxSeq }`
4. MessageList render: avatar nhỏ của participant dưới message cuối họ đã đọc

**Unread divider:**
- `unreadBoundarySeq` tính từ `openingUnreadSnapshot` (snapshot khi mở conversation)
- Render divider "New messages" trước message đầu tiên chưa đọc
- Chỉ render 1 lần per session (snapshot không thay đổi khi user đọc thêm)

---

## 5. Delivery Receipts

**Entry point:** Server gửi message đến client

**Components involved:**
- `useMessengerDeliveryReceipts` → `ws.sendDelivered()`
- `useMessengerMessageListModel` → `deliveredSeq`

**Flow:**
1. Nhận WS event `message_created` → `ws.sendDelivered(conversationId, message.seq)`
2. Server broadcast `message.delivered` đến sender
3. `onMessageDelivered({ seq })` → cập nhật `deliveredSeq`
4. Message của sender hiện icon "✓✓" (delivered) thay vì "✓" (sent)
5. Khi recipient đã seen → icon chuyển thành avatar (seen receipt override delivery)

---

## 6. Real-time Conversation Updates

**Entry point:** Bất kỳ member nào trong group thay đổi conversation

**Components involved:**
- WS event `conversation.updated` / `conversation_updated`
- `useMessengerConversationActions` → `onConversationUpdated` handler

**Các trường hợp trigger:**
- Đổi tên group → cập nhật `name` trong header + sidebar
- Đổi avatar → cập nhật `avatar`
- Đổi background → cập nhật theme colors cho mọi member
- `participant.updated` → cập nhật danh sách members, nickname

**Flow:**
1. WS event → `onConversationUpdated(conversation)` / `onParticipantUpdated(participant)`
2. `queryClient.invalidateQueries(['conversations'])` → re-fetch
3. `queryClient.invalidateQueries(['conversation', id])` → cập nhật info panel
4. UI re-render với data mới
