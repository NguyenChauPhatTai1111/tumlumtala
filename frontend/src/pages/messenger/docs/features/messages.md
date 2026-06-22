# Feature: Messages

## 1. Gửi message text

**Entry point:** Composer → nhập text → Enter hoặc Send button

**Components involved:**
- `Composer.tsx` → `ComposerInput` → `onSend()`
- `MessengerPage.handleSendMessage(payload)`
- `useMessengerSendMessage.sendMessage()`

**Flow chi tiết:**
1. User gõ text → `handleComposerTextChange()` → cập nhật `text` state + lưu draft
2. Enter / click Send → `Composer.onSend()` truyền `{ text, images, videos, files, replyToMessage }`
3. `handleSendMessage(payload)` gọi `useMessengerSendMessage.sendMessage()`
4. Tạo optimistic message `{ temp_id: uuid(), content: text, pending: true, sender_id: currentUserId, ... }`
5. Set `pendingMessages([...prev, optimistic])` → MessageList hiển thị ngay với spinner
6. Detect emoji-only: nếu text chỉ gồm emoji → `message_type = "emoji"` (render to lớn hơn)
7. Gọi `POST /messenger/conversations/:id/messages`
8. Nhận response `{ id, seq }` → cập nhật optimistic message thành real message (xóa `pending`)
9. Nếu `pendingEmptyConversationId` tồn tại → `clearJustCreatedConversation()`

**Draft:** Xóa draft của conversation hiện tại sau khi gửi thành công.

---

## 2. Gửi message có attachment (ảnh / video / file)

**Entry point:** Composer → icon đính kèm → chọn file **hoặc** paste ảnh từ clipboard

**Components involved:**
- `useImageAttachments`, `useVideoAttachments`, `useFileAttachments` (trong Composer)
- `ComposerImagePreview` (grid preview ảnh)
- `useMessengerSendMessage.sendMessage()`

**Giới hạn:**
- Images: tối đa 10, tổng ≤ 100MB
- Video: tối đa 1
- Files: tối đa 10, tổng ≤ 100MB

**Flow chi tiết:**
1. Chọn file → hook validate (type, size) → tạo blob URL preview
2. Ảnh paste từ clipboard → `handlePaste()` detect `clipboardData.files` → thêm vào imageAttachments
3. Composer hiển thị `ComposerImagePreview` (grid) / danh sách file
4. User nhấn Send:
   a. Upload từng file: `uploadMessageAttachment(conversationId, file)` → `POST .../attachments`
   b. Nhận `attachment_url` cho mỗi file
   c. Gửi message với `attachment_url`, `attachment_name`, `attachment_size`, `message_type`
5. Blob URL được revoke sau khi upload/cancel (cleanup memory)

---

## 3. Reply message

**Entry point:** Hover message → click icon Reply

**Components involved:**
- `MessageListViewport` (message item hover actions)
- `MessengerPage.handleReplyMessage(message)`
- `Composer.tsx` → `ComposerReplyBanner`

**Flow chi tiết:**
1. Hover message → hiện action bar (reply, react, edit, delete, ...)
2. Click reply → `handleReplyMessage(message)` → set `replyingMessage = message`
3. Composer hiển thị `ComposerReplyBanner` (preview nội dung message được reply, có nút X để cancel)
4. User gõ text + send → payload đính kèm `reply_to_message_id: replyingMessage.id`
5. Sau khi gửi → `setReplyingMessage(null)` (clear banner)
6. Message render có phần quote (preview message gốc) phía trên nội dung

---

## 4. Edit message

**Entry point:** Hover message (message của chính mình) → click icon Edit

**Components involved:**
- `MessageListViewport` (action bar chỉ hiện nếu `sender_id === currentUserId`)
- `MessengerPage.handleEditMessage(message)`
- `Composer.tsx` (text được điền sẵn, banner edit mode)

**Flow chi tiết:**
1. Click Edit → `handleEditMessage(message)`:
   - Set `editingMessage = message`
   - Điền `message.content` vào Composer input
2. Composer hiển thị banner "Editing message" với nút X để cancel
3. User sửa text → send:
   - Phát hiện `editingMessage != null` → gọi `messageActions.updateMessage(id, newContent)`
   - `PATCH /messenger/messages/:id` `{ content }`
   - Backend lưu version cũ vào `message_histories`
4. Message trong list cập nhật content + hiện badge "edited"
5. Clear `editingMessage`

---

## 5. Xóa message

**Entry point:** Hover message (message của chính mình) → click icon Delete

**Components involved:**
- `MessageListViewport` → confirm (hoặc xóa trực tiếp)
- `MessengerPage.handleDeleteMessage(messageId)`

**Flow chi tiết:**
1. Click Delete → `handleDeleteMessage(id)` → `messageActions.deleteMessage(id)`
   → `DELETE /messenger/messages/:id`
2. Invalidate messages cache → message biến khỏi list
3. Nếu message là `last_message` của conversation → sidebar cập nhật last_message

---

## 6. Retry message thất bại

**Entry point:** Message với `failed: true` → click nút Retry

**Components involved:**
- `MessageListViewport` (render message thất bại với nút retry)
- `useMessengerSendMessage.retryMessage(failedMsg)`

**Flow chi tiết:**
1. Message thất bại hiển thị icon lỗi + nút "Retry"
2. Click Retry → `retryMessage(failedMsg)`:
   a. Nếu `file` là blob URL (chưa upload) → re-upload file trước
   b. Nếu attachment đã có URL → dùng lại URL cũ
   c. Gọi lại `sendMessage` với cùng content
3. Message chuyển từ `failed` → `pending` → real message

---

## 7. Xem edit history

**Entry point:** Hover message có badge "edited" → click "View history"

**Components involved:**
- `MessageListViewport` → `handleViewHistories(messageId)`
- `MessageHistoryDialog` (modal)

**Flow chi tiết:**
1. Click "View history" → `handleViewHistories(messageId)`
2. Gọi `GET /messenger/messages/:id/history`
3. `MessageHistoryDialog` mở, hiển thị danh sách các version trước (nội dung + thời gian edit)

---

## 8. Reactions

**Entry point:** Hover message → click quick reaction **hoặc** mở full emoji picker

**Components involved:**
- `MessageListViewport` → reaction bar hover
- `MessengerPage.handleToggleReaction(messageId, emoji)`

**Flow chi tiết:**
1. Hover message → hiện quick reaction icon (mặc định ❤, hoặc `conversation.quick_reaction`)
2. Click quick reaction → `handleToggleReaction(messageId, emoji)`:
   - Nếu `my_reaction === emoji` → `messageActions.removeReaction({ message_id, emoji })`
   - Nếu khác → `messageActions.setReaction({ message_id, emoji })`
3. Click "..." trong reaction bar → mở full emoji picker
4. Message render reaction count + list dưới bubble, grouped by emoji

**Quick reaction per conversation:** `setQuickReaction(convId, emoji)` → `PATCH .../quick-reaction`

---

## 9. Pagination (Load older messages)

**Entry point:** Cuộn lên đỉnh MessageList

**Components involved:**
- `MessageListViewport` → IntersectionObserver trên top sentinel
- `MessengerPage.handleLoadMoreMessages()` → `handleLoadMoreWithAnchor()`

**Flow chi tiết:**
1. Scroll lên gần đỉnh → trigger `requestLoadMoreWithAnchor()`
2. Lưu anchor = DOM element của message hiện tại ở top
3. `GET /messenger/conversations/:id/messages?offset=currentCount&limit=50`
4. Prepend vào `olderMessages`
5. Restore scroll: sau render, scroll về anchor element (tránh nhảy màn hình)
6. `hasMoreOlderMessages = response.length >= 50`; nếu false → ẩn loading indicator
