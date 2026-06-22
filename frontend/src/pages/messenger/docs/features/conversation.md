# Feature: Conversation Management

## 1. Tạo conversation 1-on-1

**Entry point:** Sidebar → search input → kết quả user → click tên

**Components involved:**
- `MessengerSidebar` → `UserSearchDialog` (dialog chọn user)
- `MessengerPage.handleSelectUser(user)`

**Flow chi tiết:**
1. User gõ keyword trong sidebar search → `useMessengerSearch` gọi `searchUsers()`
2. Click user trong kết quả → `handleSelectUser(user)` được gọi
3. Gọi `createConversation({ participant_ids: [user.id] })` → `POST /messenger/conversations`
4. Backend trả về conversation (existing hoặc mới tạo)
5. Set `justCreatedConversation` = conversation object (hiển thị ngay trong sidebar dù chưa có message)
6. Set `pendingEmptyConversationId` = conversation.id
7. Set `selectedConversationId` = conversation.id → mở chat area
8. Khi user gửi message đầu tiên → `clearJustCreatedConversation()` (conversation đã có trong list thật)

**State thay đổi:** `justCreatedConversation`, `pendingEmptyConversationId`, `selectedConversationId`

**Edge case:** Nếu conversation đã tồn tại, backend trả về conversation cũ (không tạo duplicate).

---

## 2. Tạo Group conversation

**Entry point:** Sidebar → icon "Create group" (top right)

**Components involved:**
- `MessengerSidebar` → `CreateGroupDialog` (modal)
- `MessengerPage.handleCreateGroup(name, participants)`

**Flow chi tiết:**
1. Click icon tạo group → mở `CreateGroupDialog`
2. User nhập tên group + chọn participants từ search
3. Submit → `handleCreateGroup(name, participants)`
4. Gọi `createConversation({ is_group: true, name, participant_ids })` → `POST /messenger/conversations`
5. Conversation mới xuất hiện trong sidebar, được select ngay

**State thay đổi:** `selectedConversationId`; conversations cache invalidated

---

## 3. Chọn conversation

**Entry point:** Click conversation item trong sidebar

**Components involved:**
- `MessengerSidebar` → `MessengerConversationList` → item click
- `MessengerPage.handleSelectConversation(id)`

**Flow chi tiết:**
1. Click item → `handleSelectConversation(id)`
2. Snapshot `openingUnreadSnapshot` = `{ unread_count, last_read_seq }` của participant hiện tại
   - Snapshot này dùng để tính unread divider; phải capture trước khi `markRead()` xóa unread_count
3. `resetConversationThreadState()` — clear `olderMessages`, `pendingMessages`, `replyingMessage`, `editingMessage`, `searchedMessages`
4. Set `selectedConversationId = id`
5. `conversationActions.markRead(id)` → `POST /messenger/conversations/:id/read`
6. `useMessengerMessages` bắt đầu fetch messages (polling 2s)
7. `useConversationUnread` tính `unreadBoundarySeq` dựa vào snapshot → MessageList cuộn đến đó

**Mobile:** Thêm `resetResponsiveConversationState()` → ẩn sidebar, hiện chat area

**State thay đổi:** `selectedConversationId`, `openingUnreadSnapshot`, reset thread state

---

## 4. Archive / Restore

**Entry point:** Right-click hoặc "..." menu trên conversation item trong sidebar

**Components involved:**
- `MessengerSidebar` → context menu → `MessengerPage.handleArchiveToggle(conversation)`

**Flow chi tiết:**
1. Context menu → click "Archive" hoặc "Unarchive"
2. `handleArchiveToggle(conversation)`:
   - Nếu `conversation.is_archived = false` → `conversationActions.archive(id)`
   - Nếu `conversation.is_archived = true` → `conversationActions.restore(id)`
3. Cả hai gọi xong → invalidate conversations cache → sidebar re-render
4. Conversation bị ẩn khỏi tab hiện tại, xuất hiện ở tab "Archived" (hoặc ngược lại)

**Tab "Archived":** Chọn tab → `setConversationTab("archived")` → `getConversations({ archived: true })`

---

## 5. Xóa conversation

**Entry point:** Context menu → "Delete"

**Components involved:**
- Context menu → confirm dialog → `MessengerPage.handleDelete(id)`

**Flow chi tiết:**
1. Click "Delete" → mở confirm dialog (type `"delete"`)
2. Confirm → `conversationActions.delete(id)` → `DELETE /messenger/conversations/:id`
3. Nếu conversation đang selected → `setSelectedConversationId(null)` → về trang trống
4. Invalidate conversations cache → conversation biến khỏi sidebar

**Lưu ý:** Xóa vĩnh viễn, không thể khôi phục.

---

## 6. Đổi tên group

**Entry point:** Info panel → click tên conversation → icon edit

**Components involved:**
- `MessengerInfoPanel` → input dialog (type `"rename"`)
- `MessengerPage.handleSaveConversationName(name)`

**Flow chi tiết:**
1. Click icon edit tên → `openInputDialog("rename", currentName)`
2. User nhập tên mới → submit
3. `handleSaveConversationName(name)` → `conversationActions.rename(id, name)`
   → `PATCH /messenger/conversations/:id` `{ name }`
4. Invalidate cache → header + sidebar cập nhật tên mới

---

## 7. Leave group

**Entry point:** Info panel → "Leave group" button

**Components involved:**
- `MessengerInfoPanel` → confirm dialog (type `"leave"`)
- `MessengerPage` → `conversationActions.leave(id)`

**Flow chi tiết:**
1. Click "Leave group" → confirm dialog (type `"leave"`)
2. Confirm → `conversationActions.leave(id)` → `POST /messenger/conversations/:id/leave`
3. `setSelectedConversationId(null)` → về trang trống
4. Conversation biến khỏi danh sách của user

---

## 8. Notifications

**Entry point:** Header → bell icon **hoặc** Info panel → toggle

**Components involved:**
- `MessengerHeader` (bell icon) hoặc `MessengerInfoPanel`
- Confirm dialog (type `"notifications"`)
- `MessengerPage.handleToggleNotifications()`

**Flow chi tiết:**
1. Click bell icon → confirm dialog (type `"notifications"`)
2. Confirm → `conversationActions.updateNotifications(id, !currentEnabled)`
   → `PATCH /messenger/conversations/:id/notifications` `{ enabled }`
3. Bell icon thay đổi trạng thái (filled / outlined) trong header
