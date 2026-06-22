# Feature: Group Management & Theme

## 1. Add members vào group

**Entry point:** Info panel → "Add members" button

**Components involved:**
- `MessengerInfoPanel` → input dialog (type `"addMembers"`)
- Search + multi-select users
- `MessengerPage` → `conversationActions.addMembers(id, userIds)`

**Flow chi tiết:**
1. Click "Add members" → mở dialog (type `"addMembers"`)
2. Search user, tick chọn (multi-select)
3. Submit → `conversationActions.addMembers(id, selectedUserIds)`
   → `POST /messenger/conversations/:id/members` `{ user_ids }`
4. Invalidate conversation cache → info panel cập nhật danh sách members
5. WebSocket event `participant.updated` broadcast đến members trong group

---

## 2. Remove member khỏi group

**Entry point:** Info panel → member item → icon Remove (chỉ hiện với admin/owner)

**Components involved:**
- `MessengerInfoPanel` → confirm dialog (type `"removeMember"`)
- `MessengerPage` → `conversationActions.removeMember(id, userId)`

**Flow chi tiết:**
1. Hover member → click icon remove → confirm dialog (type `"removeMember"`)
2. Confirm → `conversationActions.removeMember(id, userId)`
   → `DELETE /messenger/conversations/:id/members/:userId`
3. Invalidate cache → member biến khỏi danh sách
4. WebSocket event `participant.updated` notify các member còn lại

---

## 3. Set Nickname

**Entry point:** Info panel → member item → click tên → edit nickname

**Components involved:**
- `MessengerInfoPanel` → input dialog (type `"nickname"`)
- `MessengerPage` → `conversationActions.setNickname(id, targetUserId, nickname)`

**Flow chi tiết:**
1. Click tên member → mở dialog (type `"nickname"`, prefill = nickname hiện tại hoặc fullname)
2. Nhập nickname mới → submit
3. `conversationActions.setNickname(id, targetUserId, nickname)`
   → `PATCH /messenger/conversations/:id/members/:userId/nickname` `{ nickname }`
4. Nickname hiển thị thay cho fullname trong MessageList + info panel

**Lưu ý:** Nickname là per-conversation (mỗi group có thể đặt nickname khác nhau).

---

## 4. Upload Group Avatar

**Entry point:** Info panel → click avatar group → file input

**Components involved:**
- `MessengerInfoPanel` → hidden file input (ref `groupAvatarInputRef`)
- `MessengerPage.handleUploadGroupAvatar(file)`

**Flow chi tiết:**
1. Click avatar trong info panel → trigger `groupAvatarInputRef.current.click()`
2. Chọn file ảnh → `handleUploadGroupAvatar(file)`
3. `conversationActions.updateAvatar(id, file)` → `POST /messenger/conversations/:id/avatar` (FormData)
4. Nhận URL avatar mới → invalidate cache → avatar cập nhật trong header + sidebar

---

## 5. Theme / Background Customization

**Entry point:** Info panel → "Customize" hoặc "Change background" button

**Components involved:**
- `MessengerInfoPanel` → mở dialog (type `"background"`)
- Background editor trong dialog: gradient editor, color pickers, image upload, preset grid
- `MessengerPage.handleSaveConversationBackground()`

### 5a. Chọn Preset Theme

1. Dialog "background" mở → grid 16 preset thumbnails
2. Click preset → `setThemePresetId(id)` + apply preset values:
   - `backgroundColor` (gradient string)
   - `incomingBubbleColor`, `outgoingBubbleColor`
   - `incomingTextColor`, `outgoingTextColor`
3. Preview realtime trong chat area (state chưa save)
4. Click Save → `handleSaveConversationBackground()`

### 5b. Custom Gradient

1. Tab "Custom" → gradient editor
2. `addBackgroundGradientStop()` / `removeBackgroundGradientStop()` — thêm/xóa điểm màu
3. `updateBackgroundGradientStop(index, { color, position })` — sửa điểm màu
4. `applyBackgroundGradientStops()` — tính lại gradient string → preview realtime

### 5c. Background Image

1. Tab "Image" → upload file → preview
2. Lưu file trong `selectedImageFile` state
3. Khi save → gửi FormData kèm file

### 5d. Bubble & Text Colors

- Color picker cho `incomingBubbleColor`, `outgoingBubbleColor`
- Color picker cho `incomingTextColor`, `outgoingTextColor`
- Preview realtime trong chat area

### 5e. Save

`handleSaveConversationBackground()` → `conversationActions.updateBackground(id, payload)`:
```
PATCH /messenger/conversations/:id/background
{
  background_color: string,       // gradient hoặc solid color
  incoming_bubble_color: string,
  outgoing_bubble_color: string,
  incoming_text_color: string,
  outgoing_text_color: string,
  image?: File (FormData nếu có)
}
```
→ Invalidate cache → chat area + header áp dụng theme mới

---

## 6. Header Dynamic Color

**Component:** `MessengerHeader.tsx`

**Logic:** Header tự tính màu text dựa trên background để đảm bảo readable:
1. `extractColorsFromString(backgroundColor)` — lấy các màu từ gradient
2. `averageRgb(colors)` — tính màu trung bình
3. Tính luminance → nếu sáng: text đen, nếu tối: text trắng
4. Apply vào tên conversation, member count, icon buttons
