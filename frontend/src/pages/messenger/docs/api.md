# Messenger — API Layer

> File: `src/services/messengerService.ts`

## Conversations

| Function | Method + Endpoint | Ghi chú |
|----------|-------------------|---------|
| `getConversations(query)` | `GET /messenger/conversations` | Pagination, filter by tab |
| `getConversation(id)` | `GET /messenger/conversations/:id` | Single conversation |
| `createConversation(payload)` | `POST /messenger/conversations` | Create hoặc get existing direct |
| `renameConversation(id, name)` | `PATCH /messenger/conversations/:id` | |
| `archiveConversation(id)` | `POST /messenger/conversations/:id/archive` | |
| `restoreConversation(id)` | `POST /messenger/conversations/:id/restore` | |
| `deleteConversation(id)` | `DELETE /messenger/conversations/:id` | Xóa vĩnh viễn |
| `leaveConversation(id)` | `POST /messenger/conversations/:id/leave` | |
| `markAsRead(id, lastReadSeq)` | `POST /messenger/conversations/:id/read` | |

## Messages

| Function | Method + Endpoint | Ghi chú |
|----------|-------------------|---------|
| `getMessages(id, query)` | `GET /messenger/conversations/:id/messages` | Pagination: limit=50 |
| `sendMessage(payload)` | `POST /messenger/conversations/:id/messages` | |
| `updateMessage(id, content)` | `PATCH /messenger/messages/:id` | Lưu history |
| `deleteMessage(id)` | `DELETE /messenger/messages/:id` | |
| `uploadMessageAttachment(convId, file)` | `POST /messenger/conversations/:id/attachments` | Max 100MB |
| `getMessageHistory(messageId)` | `GET /messenger/messages/:id/history` | Edit history |

## Search

| Function | Method + Endpoint |
|----------|-------------------|
| `searchAllMessages(query, limit)` | `GET /messenger/messages/search?q=...` |
| `searchConversationMessages(id, q, limit, offset)` | `GET /messenger/conversations/:id/messages/search` |
| `searchUsers(query)` | `GET /users/search?q=...` |

## Reactions

| Function | Method + Endpoint |
|----------|-------------------|
| `setMessageReaction({ message_id, emoji })` | `POST /messenger/messages/:id/reactions` |
| `removeMessageReaction({ message_id, emoji })` | `DELETE /messenger/messages/:id/reactions` |

## Group Management

| Function | Method + Endpoint |
|----------|-------------------|
| `getConversationMembers(id)` | `GET /messenger/conversations/:id/members` |
| `addConversationMembers(id, userIds)` | `POST /messenger/conversations/:id/members` |
| `removeConversationMember(id, userId)` | `DELETE /messenger/conversations/:id/members/:userId` |
| `setConversationNickname(id, targetUserId, nickname)` | `PATCH /messenger/conversations/:id/members/:userId/nickname` |

## Customization

| Function | Method + Endpoint | Body |
|----------|-------------------|------|
| `updateConversationAvatar(id, file)` | `POST /messenger/conversations/:id/avatar` | FormData |
| `updateConversationBackground(id, payload)` | `PATCH /messenger/conversations/:id/background` | JSON hoặc FormData nếu có image |
| `updateConversationNotifications(id, enabled)` | `PATCH /messenger/conversations/:id/notifications` | |
| `setQuickReaction(id, reaction)` | `PATCH /messenger/conversations/:id/quick-reaction` | |

---

## Pagination

- **Conversations:** default limit 20, hỗ trợ `page`, `limit`
- **Messages:** default limit 50, hỗ trợ `limit`, `offset`
- **Search:** limit 10 (global), có pagination (offset) cho conversation search
- `hasMore` detect từ response: `data.length >= limit`

---

## React Query Hooks

| Hook | Sử dụng |
|------|---------|
| `useMessengerConversations()` | staleTime 30s, refetchOnWindowFocus: false |
| `useMessengerMessages(convId)` | staleTime 0, polling 2s, refetchOnWindowFocus: true |
| `useMessengerConversationActions()` | mutations, sau mỗi mutation invalidate cache |
| `useMessengerMessageActions()` | mutations, sau mỗi mutation invalidate message cache |

**Cache invalidation pattern:**
```typescript
// Sau mỗi mutation đều gọi:
queryClient.invalidateQueries(['conversations'])
queryClient.invalidateQueries(['messages', conversationId])
```

---

## sendMessage Payload

```typescript
{
  conversation_id: number
  content: string
  message_type: "text" | "emoji" | "image" | "video" | "file"
  reply_to_message_id?: number
  attachment_url?: string        // sau khi upload
  attachment_name?: string
  attachment_size?: number
  temp_id: string                // UUID cho optimistic matching
}
```
