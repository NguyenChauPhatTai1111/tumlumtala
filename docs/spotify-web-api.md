# Spotify Web API — Tài liệu tham khảo đầy đủ

> Nguồn: https://developer.spotify.com/documentation/web-api  
> Cập nhật: 2026-07

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Base URL & Request format](#2-base-url--request-format)
3. [Authentication & Authorization](#3-authentication--authorization)
   - [Authorization Code Flow](#31-authorization-code-flow)
   - [Authorization Code + PKCE](#32-authorization-code--pkce)
   - [Client Credentials Flow](#33-client-credentials-flow)
   - [Refresh Token](#34-refresh-token)
4. [OAuth Scopes](#4-oauth-scopes)
5. [Response format & Error codes](#5-response-format--error-codes)
6. [Pagination](#6-pagination)
7. [Endpoints — Tracks](#7-endpoints--tracks)
8. [Endpoints — Albums](#8-endpoints--albums)
9. [Endpoints — Artists](#9-endpoints--artists)
10. [Endpoints — Search](#10-endpoints--search)
11. [Endpoints — Users](#11-endpoints--users)
12. [Endpoints — Player (Playback)](#12-endpoints--player-playback)
13. [Endpoints — Playlists](#13-endpoints--playlists)
14. [Endpoints — Library (Saved)](#14-endpoints--library-saved)
15. [Endpoints — Follow](#15-endpoints--follow)
16. [Audio Features](#16-audio-features)
17. [Recommendations](#17-endpoints--recommendations)
18. [Quick Reference — Tất cả endpoints](#18-quick-reference--tất-cả-endpoints)

---

## 1. Tổng quan

Spotify Web API cho phép:
- Truy xuất metadata (track, album, artist, playlist)
- Quản lý playlist và thư viện người dùng
- Điều khiển phát nhạc (Spotify Connect)
- Tìm kiếm nội dung
- Lấy audio features & recommendations

**Yêu cầu:** Mọi request đều cần `access_token` qua OAuth 2.0. Một số endpoint yêu cầu Spotify Premium.

---

## 2. Base URL & Request format

```
Base URL: https://api.spotify.com
API version: /v1
```

### Headers bắt buộc

```http
Authorization: Bearer {access_token}
Content-Type: application/json    (với POST/PUT có body)
```

### HTTP Methods

| Method | Mục đích |
|--------|----------|
| GET | Lấy dữ liệu |
| POST | Tạo mới |
| PUT | Cập nhật/thay thế |
| DELETE | Xóa |

### Timestamps

Tất cả timestamps trả về định dạng **ISO 8601 UTC**, ví dụ: `2024-01-15T10:30:00Z`

---

## 3. Authentication & Authorization

Spotify dùng **OAuth 2.0**. Có 3 flow chính:

| Flow | Dùng khi | Cần client secret? | Refresh token? |
|------|----------|--------------------|----------------|
| Authorization Code | Server-side app | Có | Có |
| Authorization Code + PKCE | Client-side app (mobile/browser) | Không | Có |
| Client Credentials | Backend/daemon, không cần user data | Có | Không |

---

### 3.1 Authorization Code Flow

**Dành cho:** Web app có backend server.

#### Bước 1 — Redirect user đến authorization URL

```
GET https://accounts.spotify.com/authorize
```

| Query param | Bắt buộc | Mô tả |
|-------------|----------|-------|
| `client_id` | ✅ | Client ID từ Spotify Dashboard |
| `response_type` | ✅ | Phải là `code` |
| `redirect_uri` | ✅ | URI redirect sau khi user authorize |
| `state` | Khuyến nghị | Chuỗi ngẫu nhiên để chống CSRF |
| `scope` | Không | Danh sách scopes cách nhau bởi space |
| `show_dialog` | Không | `true` để force hiện dialog dù đã authorize |

**Ví dụ:**
```
https://accounts.spotify.com/authorize?client_id=abc123&response_type=code&redirect_uri=https://app.com/callback&state=xyz789&scope=user-read-private%20user-read-email
```

#### Bước 2 — Nhận callback

Spotify redirect về `redirect_uri` với:

**Thành công:**
```
https://app.com/callback?code=AQD...&state=xyz789
```

**Bị từ chối:**
```
https://app.com/callback?error=access_denied&state=xyz789
```

> ⚠️ Luôn validate `state` khớp với state ban đầu.

#### Bước 3 — Đổi code lấy token

```http
POST https://accounts.spotify.com/api/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(client_id:client_secret)}

grant_type=authorization_code&code={code}&redirect_uri={redirect_uri}
```

**Response (200 OK):**
```json
{
  "access_token": "BQBLuPRYBQ...SP8stIv5xr",
  "token_type": "Bearer",
  "scope": "user-read-private user-read-email",
  "expires_in": 3600,
  "refresh_token": "AQAQfyEFmJJu...cG_m-2KTgNDa"
}
```

| Field | Type | Mô tả |
|-------|------|-------|
| `access_token` | string | Dùng trong mọi API call |
| `token_type` | string | Luôn là `"Bearer"` |
| `scope` | string | Các quyền đã được cấp |
| `expires_in` | integer | Thời gian sống tính bằng giây (thường 3600 = 1 giờ) |
| `refresh_token` | string | Dùng để lấy access_token mới, hợp lệ 6 tháng |

---

### 3.2 Authorization Code + PKCE

**Dành cho:** Mobile app, SPA — không lưu được client secret.

Quy trình tương tự Authorization Code nhưng thay `client_secret` bằng **code_verifier/code_challenge**:

#### Tạo PKCE params

```javascript
// 1. Tạo code_verifier (random string 43-128 chars)
const code_verifier = generateRandomString(128);

// 2. Tạo code_challenge = base64url(sha256(code_verifier))
const code_challenge = base64url(sha256(code_verifier));
```

#### Bước 1 — Authorization URL thêm params PKCE

```
GET https://accounts.spotify.com/authorize
  ?client_id=...
  &response_type=code
  &redirect_uri=...
  &code_challenge_method=S256
  &code_challenge={code_challenge}
```

#### Bước 3 — Đổi code (không cần Basic auth, thêm `client_id` và `code_verifier`)

```http
POST https://accounts.spotify.com/api/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={code}
&redirect_uri={redirect_uri}
&client_id={client_id}
&code_verifier={code_verifier}
```

Response JSON giống hệt Authorization Code Flow ở trên.

---

### 3.3 Client Credentials Flow

**Dành cho:** Server-to-server, không cần user data. Không lấy được `/me` endpoints.

```http
POST https://accounts.spotify.com/api/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(client_id:client_secret)}

grant_type=client_credentials
```

**Response (200 OK):**
```json
{
  "access_token": "NgCXRK...MzYjw",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

> Không có `refresh_token` — request token mới khi hết hạn.

---

### 3.4 Refresh Token

Khi `access_token` hết hạn (sau 3600s), dùng `refresh_token` để lấy token mới:

```http
POST https://accounts.spotify.com/api/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(client_id:client_secret)}   # Chỉ với Authorization Code flow

grant_type=refresh_token&refresh_token={refresh_token}
# PKCE flow: thêm client_id={client_id} thay vì Basic header
```

**Response (200 OK):**
```json
{
  "access_token": "BQBLuPRYBQ...BP8stIv5xr-Iwaf4l8eg",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "AQAQfyEFmJJuCvAFh...cG_m-2KTgNDaDMQqjrOa3",
  "scope": "user-read-email user-read-private"
}
```

> `refresh_token` có thể thay đổi — luôn lưu lại refresh_token mới nhận được.  
> `invalid_grant` error = refresh_token đã hết hạn (6 tháng) → cần user authorize lại.

---

## 4. OAuth Scopes

### Images
| Scope | Mô tả |
|-------|-------|
| `ugc-image-upload` | Upload ảnh cho playlist |

### Spotify Connect
| Scope | Mô tả |
|-------|-------|
| `user-read-playback-state` | Đọc trạng thái player, thiết bị đang hoạt động |
| `user-modify-playback-state` | Điều khiển phát nhạc (play/pause/skip/seek...) |
| `user-read-currently-playing` | Đọc bài đang phát và queue |

### Playback
| Scope | Mô tả |
|-------|-------|
| `app-remote-control` | Điều khiển từ xa (iOS/Android SDK) |
| `streaming` | Web Playback SDK — cần Premium |

### Playlists
| Scope | Mô tả |
|-------|-------|
| `playlist-read-private` | Đọc playlist riêng tư |
| `playlist-read-collaborative` | Đọc playlist collaborative |
| `playlist-modify-public` | Sửa playlist công khai |
| `playlist-modify-private` | Sửa playlist riêng tư |

### Follow
| Scope | Mô tả |
|-------|-------|
| `user-follow-read` | Đọc danh sách đang follow |
| `user-follow-modify` | Follow/unfollow artist, user |

### Listening History
| Scope | Mô tả |
|-------|-------|
| `user-read-playback-position` | Đọc vị trí nghe trong podcast/audiobook |
| `user-top-read` | Đọc top artists/tracks của user |
| `user-read-recently-played` | Đọc lịch sử nghe gần đây |

### Library
| Scope | Mô tả |
|-------|-------|
| `user-library-read` | Đọc thư viện đã lưu |
| `user-library-modify` | Thêm/xóa khỏi thư viện |

### Users
| Scope | Mô tả |
|-------|-------|
| `user-read-private` | Đọc thông tin tài khoản, subscription |
| `user-read-email` | Đọc email |

---

## 5. Response format & Error codes

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK — có data trong body |
| `201` | Created — tạo thành công |
| `204` | No Content — thành công, không có body |
| `400` | Bad Request — request sai format |
| `401` | Unauthorized — token thiếu/hết hạn/sai |
| `403` | Forbidden — không đủ quyền / cần Premium |
| `404` | Not Found |
| `429` | Too Many Requests — rate limit |
| `500` | Internal Server Error |
| `502` | Bad Gateway |
| `503` | Service Unavailable |

### Error Response Format

**Regular API errors:**
```json
{
  "error": {
    "status": 401,
    "message": "No token provided"
  }
}
```

**OAuth errors (RFC 6749):**
```json
{
  "error": "invalid_grant",
  "error_description": "Refresh token revoked"
}
```

### Rate Limiting

Khi nhận `429`, response có header:
```
Retry-After: {seconds}
```
Đợi đúng số giây đó rồi retry.

---

## 6. Pagination

Các endpoint trả danh sách dùng **offset-based pagination**:

### Query params

| Param | Default | Max | Mô tả |
|-------|---------|-----|-------|
| `limit` | 20 | 50 (một số endpoint: 100) | Số items mỗi page |
| `offset` | 0 | 100,000 | Vị trí bắt đầu |

### Response shape

```json
{
  "href": "https://api.spotify.com/v1/me/tracks?offset=0&limit=20",
  "limit": 20,
  "next": "https://api.spotify.com/v1/me/tracks?offset=20&limit=20",
  "offset": 0,
  "previous": null,
  "total": 347,
  "items": [ ... ]
}
```

`next` = `null` khi đã hết data.

### Cursor-based pagination (một số endpoint như recently-played)

```json
{
  "cursors": {
    "after": "1484811043508",
    "before": "1484811043508"
  },
  "next": "https://api.spotify.com/v1/me/player/recently-played?before=1484811043508&limit=20"
}
```

---

## 7. Endpoints — Tracks

### GET /v1/tracks/{id} — Lấy 1 track

```
GET https://api.spotify.com/v1/tracks/{id}
```

**Path params:**
- `id` (string, required): Spotify track ID

**Query params:**
- `market` (string): ISO 3166-1 alpha-2 country code

**Scopes:** Không cần

**Response (200):**
```json
{
  "album": {
    "album_type": "album | single | compilation",
    "total_tracks": 11,
    "available_markets": ["AD", "AE", "VN"],
    "external_urls": { "spotify": "https://open.spotify.com/album/..." },
    "href": "https://api.spotify.com/v1/albums/...",
    "id": "string",
    "images": [
      { "url": "https://i.scdn.co/image/...", "height": 640, "width": 640 },
      { "url": "https://i.scdn.co/image/...", "height": 300, "width": 300 },
      { "url": "https://i.scdn.co/image/...", "height": 64, "width": 64 }
    ],
    "name": "Album Name",
    "release_date": "2023-01-15",
    "release_date_precision": "day | month | year",
    "restrictions": { "reason": "market | product | explicit" },
    "type": "album",
    "uri": "spotify:album:...",
    "artists": [
      {
        "external_urls": { "spotify": "string" },
        "href": "string",
        "id": "string",
        "name": "string",
        "type": "artist",
        "uri": "spotify:artist:..."
      }
    ]
  },
  "artists": [
    {
      "external_urls": { "spotify": "string" },
      "href": "string",
      "id": "string",
      "name": "string",
      "type": "artist",
      "uri": "spotify:artist:..."
    }
  ],
  "available_markets": ["AD", "VN"],
  "disc_number": 1,
  "duration_ms": 213573,
  "explicit": false,
  "external_ids": {
    "isrc": "USUM71703861",
    "ean": "string",
    "upc": "string"
  },
  "external_urls": { "spotify": "https://open.spotify.com/track/..." },
  "href": "https://api.spotify.com/v1/tracks/...",
  "id": "11dFghVXANMlKmJXsNCbNl",
  "is_playable": true,
  "linked_from": {},
  "restrictions": { "reason": "string" },
  "name": "Track Name",
  "popularity": 73,
  "preview_url": "https://p.scdn.co/mp3-preview/...",
  "track_number": 1,
  "type": "track",
  "uri": "spotify:track:...",
  "is_local": false
}
```

---

### GET /v1/tracks — Lấy nhiều tracks

```
GET https://api.spotify.com/v1/tracks?ids={ids}&market={market}
```

**Query params:**
- `ids` (string, required): Tối đa 50 IDs, cách nhau bởi dấu phẩy
- `market` (string): Country code

**Response (200):**
```json
{
  "tracks": [ /* mảng TrackObject như trên */ ]
}
```

---

## 8. Endpoints — Albums

### GET /v1/albums/{id} — Lấy 1 album

```
GET https://api.spotify.com/v1/albums/{id}?market={market}
```

**Scopes:** Không cần

**Response (200):**
```json
{
  "album_type": "album | single | compilation",
  "total_tracks": 11,
  "available_markets": ["AD", "VN"],
  "external_urls": { "spotify": "string" },
  "href": "string",
  "id": "string",
  "images": [
    { "url": "string", "height": 640, "width": 640 }
  ],
  "name": "string",
  "release_date": "2023-01-15",
  "release_date_precision": "day | month | year",
  "restrictions": { "reason": "market | product | explicit" },
  "type": "album",
  "uri": "spotify:album:...",
  "artists": [
    {
      "external_urls": { "spotify": "string" },
      "href": "string",
      "id": "string",
      "name": "string",
      "type": "artist",
      "uri": "string"
    }
  ],
  "tracks": {
    "href": "string",
    "limit": 20,
    "next": "string | null",
    "offset": 0,
    "previous": "string | null",
    "total": 11,
    "items": [
      {
        "artists": [],
        "available_markets": ["string"],
        "disc_number": 1,
        "duration_ms": 213573,
        "explicit": false,
        "external_urls": { "spotify": "string" },
        "href": "string",
        "id": "string",
        "is_playable": true,
        "linked_from": {
          "external_urls": { "spotify": "string" },
          "href": "string",
          "id": "string",
          "type": "string",
          "uri": "string"
        },
        "restrictions": { "reason": "string" },
        "name": "string",
        "preview_url": "string",
        "track_number": 1,
        "type": "track",
        "uri": "string",
        "is_local": false
      }
    ]
  },
  "copyrights": [
    { "text": "string", "type": "C | P" }
  ],
  "external_ids": {
    "isrc": "string",
    "ean": "string",
    "upc": "string"
  },
  "genres": ["rock", "pop"],
  "label": "string",
  "popularity": 68
}
```

### Các Album endpoints khác

| Endpoint | Method | URL | Mô tả |
|----------|--------|-----|-------|
| Get Several Albums | GET | `/v1/albums?ids=...` | Tối đa 20 IDs |
| Get Album Tracks | GET | `/v1/albums/{id}/tracks` | Paginated, limit 50 |
| Get New Releases | GET | `/v1/browse/new-releases` | Album mới nhất |
| Get Saved Albums | GET | `/v1/me/albums` | Scope: `user-library-read` |
| Save Albums | PUT | `/v1/me/albums` | Scope: `user-library-modify` |
| Remove Albums | DELETE | `/v1/me/albums` | Scope: `user-library-modify` |
| Check Saved Albums | GET | `/v1/me/albums/contains` | Boolean array |

---

## 9. Endpoints — Artists

### GET /v1/artists/{id} — Lấy 1 artist

```
GET https://api.spotify.com/v1/artists/{id}
```

**Scopes:** Không cần

**Response (200):**
```json
{
  "external_urls": { "spotify": "https://open.spotify.com/artist/..." },
  "followers": {
    "href": null,
    "total": 8239823
  },
  "genres": ["pop", "dance pop", "electropop"],
  "href": "https://api.spotify.com/v1/artists/...",
  "id": "0TnOYISbd1XYRBk9myaseg",
  "images": [
    { "url": "https://i.scdn.co/image/...", "height": 640, "width": 640 },
    { "url": "https://i.scdn.co/image/...", "height": 320, "width": 320 },
    { "url": "https://i.scdn.co/image/...", "height": 160, "width": 160 }
  ],
  "name": "Artist Name",
  "popularity": 82,
  "type": "artist",
  "uri": "spotify:artist:..."
}
```

### Tất cả Artist endpoints

| Endpoint | Method | URL | Mô tả |
|----------|--------|-----|-------|
| Get Artist | GET | `/v1/artists/{id}` | Thông tin 1 artist |
| Get Several Artists | GET | `/v1/artists?ids=...` | Tối đa 50 IDs |
| Get Artist's Albums | GET | `/v1/artists/{id}/albums` | Query: `include_groups`, `market`, `limit`, `offset` |
| Get Artist's Top Tracks | GET | `/v1/artists/{id}/top-tracks` | Query: `market` |
| Get Artist's Related Artists | GET | `/v1/artists/{id}/related-artists` | 20 artists tương tự |

**GET /v1/artists/{id}/top-tracks response:**
```json
{
  "tracks": [ /* mảng TrackObject đầy đủ */ ]
}
```

**GET /v1/artists/{id}/albums query params:**
- `include_groups`: `album,single,appears_on,compilation` (comma-separated)
- `market`: country code
- `limit`: 1-50, default 20
- `offset`: default 0

---

## 10. Endpoints — Search

### GET /v1/search

```
GET https://api.spotify.com/v1/search
```

**Scopes:** Không cần

**Query params:**

| Param | Bắt buộc | Mô tả |
|-------|----------|-------|
| `q` | ✅ | Chuỗi tìm kiếm. Hỗ trợ field filters |
| `type` | ✅ | Loại kết quả: `album,artist,playlist,track,show,episode,audiobook` |
| `market` | Không | Country code |
| `limit` | Không | Default 5, max 50 |
| `offset` | Không | Default 0, max 1000 |
| `include_external` | Không | `audio` để bao gồm nội dung hosted ngoài |

**Search query field filters:**

```
artist:taylor swift          # Tìm theo artist
album:folklore               # Tìm theo album tên
year:2020                    # Tìm theo năm
year:2018-2022               # Khoảng năm
tag:new                      # Release mới (2 tuần gần đây)
tag:hipster                  # Album ít phổ biến
isrc:USUM71703861            # Tìm theo ISRC
genre:pop                    # Tìm theo genre
```

**Ví dụ q:**
```
q=artist%3Ataylor+swift+year%3A2020&type=album,track
```

**Response (200):**
```json
{
  "tracks": {
    "href": "string",
    "limit": 5,
    "next": "string",
    "offset": 0,
    "previous": null,
    "total": 847,
    "items": [ /* TrackObject[] */ ]
  },
  "artists": {
    "href": "string",
    "limit": 5,
    "next": "string",
    "offset": 0,
    "previous": null,
    "total": 23,
    "items": [ /* ArtistObject[] */ ]
  },
  "albums": {
    "href": "string",
    "limit": 5,
    "next": "string",
    "offset": 0,
    "previous": null,
    "total": 56,
    "items": [ /* SimplifiedAlbumObject[] */ ]
  },
  "playlists": {
    "href": "string",
    "limit": 5,
    "next": "string",
    "offset": 0,
    "previous": null,
    "total": 10,
    "items": [ /* SimplifiedPlaylistObject[] */ ]
  },
  "shows": { /* PagingObject của Shows */ },
  "episodes": { /* PagingObject của Episodes */ },
  "audiobooks": { /* PagingObject của Audiobooks */ }
}
```

> Chỉ các `type` được request mới có trong response.

---

## 11. Endpoints — Users

### GET /v1/me — Profile người dùng hiện tại

```
GET https://api.spotify.com/v1/me
```

**Scopes:** `user-read-private`, `user-read-email`

**Response (200):**
```json
{
  "account_id": "string",
  "country": "VN",
  "display_name": "Nguyễn Văn A",
  "email": "user@example.com",
  "explicit_content": {
    "filter_enabled": false,
    "filter_locked": false
  },
  "external_urls": {
    "spotify": "https://open.spotify.com/user/..."
  },
  "followers": {
    "href": null,
    "total": 42
  },
  "href": "https://api.spotify.com/v1/users/...",
  "id": "31xyzabc...",
  "images": [
    { "url": "https://i.scdn.co/image/...", "height": 300, "width": 300 }
  ],
  "product": "premium | free | open",
  "type": "user",
  "uri": "spotify:user:..."
}
```

---

### GET /v1/me/top/{type} — Top artists hoặc tracks

```
GET https://api.spotify.com/v1/me/top/{type}
```

**Path params:**
- `type`: `artists` hoặc `tracks`

**Query params:**

| Param | Default | Mô tả |
|-------|---------|-------|
| `time_range` | `medium_term` | `short_term` (4 tuần), `medium_term` (6 tháng), `long_term` (nhiều năm) |
| `limit` | 20 | 1–50 |
| `offset` | 0 | - |

**Scopes:** `user-top-read`

**Response (200) — type=artists:**
```json
{
  "href": "string",
  "limit": 20,
  "next": "string | null",
  "offset": 0,
  "previous": null,
  "total": 4,
  "items": [
    {
      "external_urls": { "spotify": "string" },
      "followers": { "href": null, "total": 8239823 },
      "genres": ["pop", "dance pop"],
      "href": "string",
      "id": "string",
      "images": [{ "url": "string", "height": 300, "width": 300 }],
      "name": "string",
      "popularity": 82,
      "type": "artist",
      "uri": "string"
    }
  ]
}
```

**Response (200) — type=tracks:** Items là `TrackObject[]` đầy đủ.

---

### GET /v1/users/{user_id} — Profile user khác

```
GET https://api.spotify.com/v1/users/{user_id}
```

**Scopes:** Không cần

Response tương tự `/v1/me` nhưng không có `email`, `explicit_content`, `product`, `country`.

---

## 12. Endpoints — Player (Playback)

> ⚠️ Hầu hết Player endpoints yêu cầu **Spotify Premium**.

### GET /v1/me/player — Trạng thái phát nhạc hiện tại

```
GET https://api.spotify.com/v1/me/player
```

**Query params:**
- `market`: country code
- `additional_types`: `track,episode` (mặc định chỉ `track`)

**Scopes:** `user-read-playback-state`

**Response (200):**
```json
{
  "device": {
    "id": "5fbb3ba6aa454b5534c4ba43a8c7e8e45a63ad0e",
    "is_active": true,
    "is_private_session": false,
    "is_restricted": false,
    "name": "My iPhone",
    "type": "Smartphone",
    "volume_percent": 70,
    "supports_volume": true
  },
  "repeat_state": "off | track | context",
  "shuffle_state": false,
  "context": {
    "type": "album | artist | playlist",
    "href": "https://api.spotify.com/v1/playlists/...",
    "external_urls": { "spotify": "string" },
    "uri": "spotify:playlist:..."
  },
  "timestamp": 1673784000000,
  "progress_ms": 45230,
  "is_playing": true,
  "item": { /* TrackObject hoặc EpisodeObject */ },
  "currently_playing_type": "track | episode | ad | unknown",
  "actions": {
    "interrupting_playback": false,
    "pausing": true,
    "resuming": false,
    "seeking": true,
    "skipping_next": true,
    "skipping_prev": true,
    "toggling_repeat_context": true,
    "toggling_shuffle": true,
    "toggling_repeat_track": true,
    "transferring_playback": true
  }
}
```

**Response 204:** Không có thiết bị nào đang active.

---

### GET /v1/me/player/devices — Danh sách thiết bị

```
GET https://api.spotify.com/v1/me/player/devices
```

**Scopes:** `user-read-playback-state`

**Response (200):**
```json
{
  "devices": [
    {
      "id": "string",
      "is_active": true,
      "is_private_session": false,
      "is_restricted": false,
      "name": "Laptop",
      "type": "Computer | Smartphone | Speaker | TV | ...",
      "volume_percent": 100,
      "supports_volume": true
    }
  ]
}
```

---

### PUT /v1/me/player — Transfer playback

```
PUT https://api.spotify.com/v1/me/player
Content-Type: application/json
```

**Scopes:** `user-modify-playback-state`

**Request body:**
```json
{
  "device_ids": ["74ASZWbe4lXaubB36ztrGX"],
  "play": true
}
```

**Response:** `204 No Content`

---

### PUT /v1/me/player/play — Play/Resume

```
PUT https://api.spotify.com/v1/me/player/play?device_id={device_id}
Content-Type: application/json
```

**Scopes:** `user-modify-playback-state`

**Request body (tất cả optional):**
```json
{
  "context_uri": "spotify:album:5ht7ItJgpBH7W6vJ5BqpPr",
  "uris": ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"],
  "offset": {
    "position": 0
  },
  "position_ms": 0
}
```

- `context_uri`: Play album/artist/playlist theo URI
- `uris`: Play danh sách tracks cụ thể (tối đa không giới hạn nhưng thực tế ~750)
- `offset.position`: Bắt đầu từ track thứ mấy (0-based)
- `offset.uri`: Bắt đầu từ track URI cụ thể
- `position_ms`: Seek đến vị trí này khi bắt đầu

**Response:** `204 No Content`

---

### PUT /v1/me/player/pause — Pause

```
PUT https://api.spotify.com/v1/me/player/pause?device_id={device_id}
```

**Scopes:** `user-modify-playback-state`  
**Response:** `204 No Content`

---

### POST /v1/me/player/next — Skip to next

```
POST https://api.spotify.com/v1/me/player/next?device_id={device_id}
```

**Scopes:** `user-modify-playback-state`  
**Response:** `204 No Content`

---

### POST /v1/me/player/previous — Skip to previous

```
POST https://api.spotify.com/v1/me/player/previous?device_id={device_id}
```

**Scopes:** `user-modify-playback-state`  
**Response:** `204 No Content`

---

### PUT /v1/me/player/seek — Seek position

```
PUT https://api.spotify.com/v1/me/player/seek?position_ms={ms}&device_id={device_id}
```

**Scopes:** `user-modify-playback-state`  
**Query params:** `position_ms` (integer, required)  
**Response:** `204 No Content`

---

### PUT /v1/me/player/volume — Set volume

```
PUT https://api.spotify.com/v1/me/player/volume?volume_percent={0-100}&device_id={device_id}
```

**Scopes:** `user-modify-playback-state`  
**Response:** `204 No Content`

---

### PUT /v1/me/player/shuffle — Toggle shuffle

```
PUT https://api.spotify.com/v1/me/player/shuffle?state={true|false}&device_id={device_id}
```

**Scopes:** `user-modify-playback-state`  
**Response:** `204 No Content`

---

### PUT /v1/me/player/repeat — Set repeat mode

```
PUT https://api.spotify.com/v1/me/player/repeat?state={track|context|off}&device_id={device_id}
```

**Scopes:** `user-modify-playback-state`  
**Response:** `204 No Content`

---

### GET /v1/me/player/currently-playing — Bài đang phát

```
GET https://api.spotify.com/v1/me/player/currently-playing?market={market}&additional_types={types}
```

**Scopes:** `user-read-currently-playing`

**Response (200):**
```json
{
  "context": {
    "type": "string",
    "href": "string",
    "external_urls": { "spotify": "string" },
    "uri": "string"
  },
  "timestamp": 1673784000000,
  "progress_ms": 45230,
  "is_playing": true,
  "item": { /* TrackObject hoặc EpisodeObject */ },
  "currently_playing_type": "track | episode | ad | unknown",
  "actions": { /* DisallowsObject */ }
}
```

**Response 204:** Không có gì đang phát.

---

### GET /v1/me/player/recently-played — Lịch sử nghe

```
GET https://api.spotify.com/v1/me/player/recently-played
```

**Query params:**

| Param | Mô tả |
|-------|-------|
| `limit` | Default 20, max 50 |
| `after` | Unix timestamp ms — lấy tracks sau thời điểm này |
| `before` | Unix timestamp ms — lấy tracks trước thời điểm này |

**Scopes:** `user-read-recently-played`

**Response (200):**
```json
{
  "href": "string",
  "limit": 20,
  "next": "string",
  "cursors": {
    "after": "1484811043508",
    "before": "1484811043508"
  },
  "total": 50,
  "items": [
    {
      "track": { /* TrackObject đầy đủ */ },
      "played_at": "2024-01-15T10:30:00.000Z",
      "context": {
        "type": "album | artist | playlist",
        "href": "string",
        "external_urls": { "spotify": "string" },
        "uri": "string"
      }
    }
  ]
}
```

---

### GET /v1/me/player/queue — Queue hiện tại

```
GET https://api.spotify.com/v1/me/player/queue
```

**Scopes:** `user-read-currently-playing`, `user-read-playback-state`

**Response (200):**
```json
{
  "currently_playing": { /* TrackObject hoặc EpisodeObject */ },
  "queue": [
    { /* TrackObject hoặc EpisodeObject */ }
  ]
}
```

---

### POST /v1/me/player/queue — Thêm track vào queue

```
POST https://api.spotify.com/v1/me/player/queue?uri={spotify_uri}&device_id={device_id}
```

**Scopes:** `user-modify-playback-state`  
**Response:** `204 No Content`

---

## 13. Endpoints — Playlists

### GET /v1/playlists/{playlist_id} — Lấy playlist

```
GET https://api.spotify.com/v1/playlists/{playlist_id}
```

**Query params:**
- `market`: country code
- `fields`: Comma-separated fields cần lấy (vd: `name,tracks.items(track(name,id))`)
- `additional_types`: `track,episode`

**Scopes:** Không cần với public playlist

**Response (200):**
```json
{
  "collaborative": false,
  "description": "Playlist description",
  "external_urls": { "spotify": "string" },
  "href": "string",
  "id": "3cEYpjA9oz9GiPac4AsH4n",
  "images": [
    { "url": "string", "height": 640, "width": 640 }
  ],
  "name": "My Playlist",
  "owner": {
    "external_urls": { "spotify": "string" },
    "href": "string",
    "id": "string",
    "type": "user",
    "uri": "string",
    "display_name": "Nguyễn Văn A"
  },
  "public": true,
  "snapshot_id": "MTY3...",
  "tracks": {
    "href": "string",
    "limit": 100,
    "next": "string | null",
    "offset": 0,
    "previous": null,
    "total": 347,
    "items": [
      {
        "added_at": "2024-01-15T10:30:00Z",
        "added_by": {
          "external_urls": { "spotify": "string" },
          "href": "string",
          "id": "string",
          "type": "user",
          "uri": "string"
        },
        "is_local": false,
        "track": { /* TrackObject hoặc EpisodeObject */ }
      }
    ]
  },
  "type": "playlist",
  "uri": "spotify:playlist:..."
}
```

---

### GET /v1/me/playlists — Playlists của user hiện tại

```
GET https://api.spotify.com/v1/me/playlists?limit={limit}&offset={offset}
```

**Scopes:** `playlist-read-private`  
**limit:** 1–50, default 20

**Response:** Paging object với `SimplifiedPlaylistObject[]`

---

### POST /v1/me/playlists — Tạo playlist mới

```
POST https://api.spotify.com/v1/me/playlists
Content-Type: application/json
```

**Scopes:** `playlist-modify-public`, `playlist-modify-private`

**Request body:**
```json
{
  "name": "My New Playlist",
  "public": false,
  "collaborative": false,
  "description": "Mô tả playlist"
}
```

**Response (201 Created):** PlaylistObject đầy đủ

---

### POST /v1/playlists/{playlist_id}/tracks — Thêm tracks

```
POST https://api.spotify.com/v1/playlists/{playlist_id}/tracks
Content-Type: application/json
```

**Scopes:** `playlist-modify-public`, `playlist-modify-private`

**Query params:**
- `position` (integer): Vị trí chèn (0-based), mặc định append cuối

**Request body:**
```json
{
  "uris": [
    "spotify:track:4iV5W9uYEdYUVa79Axb7Rh",
    "spotify:track:1301WleyT98MSxVHPZCA6M"
  ],
  "position": 0
}
```

Tối đa 100 URIs mỗi request.

**Response (201):**
```json
{
  "snapshot_id": "abc123..."
}
```

---

### PUT /v1/playlists/{playlist_id}/tracks — Thay toàn bộ tracks

```
PUT https://api.spotify.com/v1/playlists/{playlist_id}/tracks
Content-Type: application/json
```

**Scopes:** `playlist-modify-public`, `playlist-modify-private`

**Request body:**
```json
{
  "uris": ["spotify:track:..."],
  "range_start": 0,
  "insert_before": 1,
  "range_length": 1,
  "snapshot_id": "string"
}
```

**Response (200):** `{ "snapshot_id": "string" }`

---

### DELETE /v1/playlists/{playlist_id}/tracks — Xóa tracks

```
DELETE https://api.spotify.com/v1/playlists/{playlist_id}/tracks
Content-Type: application/json
```

**Scopes:** `playlist-modify-public`, `playlist-modify-private`

**Request body:**
```json
{
  "tracks": [
    { "uri": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh" },
    { "uri": "spotify:track:1301WleyT98MSxVHPZCA6M" }
  ],
  "snapshot_id": "string"
}
```

**Response (200):** `{ "snapshot_id": "string" }`

---

### PUT /v1/playlists/{playlist_id} — Cập nhật thông tin playlist

```
PUT https://api.spotify.com/v1/playlists/{playlist_id}
Content-Type: application/json
```

**Scopes:** `playlist-modify-public`, `playlist-modify-private`

**Request body (tất cả optional):**
```json
{
  "name": "New name",
  "public": true,
  "collaborative": false,
  "description": "Updated description"
}
```

**Response:** `200 OK` (empty body)

---

### GET /v1/playlists/{playlist_id}/tracks — Tracks trong playlist

```
GET https://api.spotify.com/v1/playlists/{playlist_id}/tracks?market=VN&fields=...&limit=50&offset=0
```

**Scopes:** `playlist-read-private` (nếu private)

**Response:** Paging object với `PlaylistTrackObject[]`

---

## 14. Endpoints — Library (Saved)

### GET /v1/me/tracks — Tracks đã lưu

```
GET https://api.spotify.com/v1/me/tracks?market={market}&limit={limit}&offset={offset}
```

**Scopes:** `user-library-read`

**Response (200):**
```json
{
  "href": "string",
  "limit": 20,
  "next": "string | null",
  "offset": 0,
  "previous": null,
  "total": 347,
  "items": [
    {
      "added_at": "2024-01-15T10:30:00Z",
      "track": { /* TrackObject đầy đủ */ }
    }
  ]
}
```

---

### PUT /v1/me/tracks — Lưu tracks

```
PUT https://api.spotify.com/v1/me/tracks
Content-Type: application/json
```

**Scopes:** `user-library-modify`

**Request body:**
```json
{
  "ids": ["4iV5W9uYEdYUVa79Axb7Rh", "1301WleyT98MSxVHPZCA6M"]
}
```

Tối đa 50 IDs. **Response:** `200 OK`

---

### DELETE /v1/me/tracks — Xóa tracks khỏi library

```
DELETE https://api.spotify.com/v1/me/tracks
Content-Type: application/json
```

**Scopes:** `user-library-modify`  
**Body:** `{ "ids": ["..."] }`  
**Response:** `200 OK`

---

### GET /v1/me/tracks/contains — Kiểm tra đã lưu chưa

```
GET https://api.spotify.com/v1/me/tracks/contains?ids={ids}
```

**Scopes:** `user-library-read`

**Response (200):** `[true, false, true]` — Boolean array tương ứng với từng ID

---

### Library endpoints khác

| Endpoint | Method | URL | Scope |
|----------|--------|-----|-------|
| Get Saved Albums | GET | `/v1/me/albums` | `user-library-read` |
| Save Albums | PUT | `/v1/me/albums` | `user-library-modify` |
| Remove Albums | DELETE | `/v1/me/albums` | `user-library-modify` |
| Check Saved Albums | GET | `/v1/me/albums/contains` | `user-library-read` |
| Get Saved Shows | GET | `/v1/me/shows` | `user-library-read` |
| Get Saved Episodes | GET | `/v1/me/episodes` | `user-library-read` |
| Get Saved Audiobooks | GET | `/v1/me/audiobooks` | `user-library-read` |

---

## 15. Endpoints — Follow

### GET /v1/me/following — Artists đang follow

```
GET https://api.spotify.com/v1/me/following?type=artist&after={cursor}&limit={limit}
```

**Scopes:** `user-follow-read`

**Query params:**
- `type` (required): Chỉ hỗ trợ `artist`
- `after`: Cursor — last artist ID của page trước
- `limit`: 1–50, default 20

**Response (200):**
```json
{
  "artists": {
    "href": "string",
    "limit": 20,
    "next": "string | null",
    "cursors": {
      "after": "string",
      "before": "string"
    },
    "total": 10,
    "items": [ /* ArtistObject[] */ ]
  }
}
```

---

### PUT /v1/me/following — Follow artists hoặc users

```
PUT https://api.spotify.com/v1/me/following?type={artist|user}
Content-Type: application/json
```

**Scopes:** `user-follow-modify`

**Body:** `{ "ids": ["string"] }` — Tối đa 50 IDs  
**Response:** `204 No Content`

---

### DELETE /v1/me/following — Unfollow

```
DELETE https://api.spotify.com/v1/me/following?type={artist|user}
Content-Type: application/json
```

**Scopes:** `user-follow-modify`  
**Body:** `{ "ids": ["string"] }`  
**Response:** `204 No Content`

---

### GET /v1/me/following/contains — Kiểm tra đang follow

```
GET https://api.spotify.com/v1/me/following/contains?type={artist|user}&ids={ids}
```

**Scopes:** `user-follow-read`  
**Response:** `[true, false]`

---

### Follow/Unfollow Playlist

```
PUT    https://api.spotify.com/v1/playlists/{playlist_id}/followers
DELETE https://api.spotify.com/v1/playlists/{playlist_id}/followers
```

**Scopes:** `playlist-modify-public`, `playlist-modify-private`  
**PUT body:** `{ "public": true }` (optional)  
**Response:** `200 OK`

---

## 16. Audio Features

### GET /v1/audio-features/{id} — Audio features 1 track

```
GET https://api.spotify.com/v1/audio-features/{id}
```

**Scopes:** Không cần

**Response (200):**
```json
{
  "acousticness": 0.00242,
  "analysis_url": "https://api.spotify.com/v1/audio-analysis/2takcwOaAZWiXQijPHIx7B",
  "danceability": 0.585,
  "duration_ms": 237040,
  "energy": 0.842,
  "id": "2takcwOaAZWiXQijPHIx7B",
  "instrumentalness": 0.00686,
  "key": 9,
  "liveness": 0.0866,
  "loudness": -5.883,
  "mode": 0,
  "speechiness": 0.0556,
  "tempo": 118.211,
  "time_signature": 4,
  "track_href": "https://api.spotify.com/v1/tracks/2takcwOaAZWiXQijPHIx7B",
  "type": "audio_features",
  "uri": "spotify:track:2takcwOaAZWiXQijPHIx7B",
  "valence": 0.428
}
```

### Giải thích các fields

| Field | Range | Mô tả |
|-------|-------|-------|
| `acousticness` | 0.0–1.0 | 1.0 = hoàn toàn acoustic |
| `danceability` | 0.0–1.0 | Khả năng nhảy (tempo, rhythm, beat) |
| `energy` | 0.0–1.0 | Cường độ và hoạt động (rock = cao, nhạc cổ điển = thấp) |
| `instrumentalness` | 0.0–1.0 | > 0.5 = instrumental, gần 1.0 = không có giọng |
| `key` | -1–11 | Pitch class: 0=C, 1=C#/Db, 2=D... -1=undetected |
| `liveness` | 0.0–1.0 | > 0.8 = rất có thể là live recording |
| `loudness` | -60–0 dB | Loudness trung bình toàn track |
| `mode` | 0 hoặc 1 | 0=minor, 1=major |
| `speechiness` | 0.0–1.0 | > 0.66 = toàn lời nói, 0.33–0.66 = nhạc lời, < 0.33 = nhạc |
| `tempo` | BPM | Beats per minute ước tính |
| `time_signature` | 3–7 | Số beat mỗi measure (3/4, 4/4...) |
| `valence` | 0.0–1.0 | 1.0 = vui/tươi, 0.0 = buồn/tức |

---

### GET /v1/audio-features — Audio features nhiều tracks

```
GET https://api.spotify.com/v1/audio-features?ids={ids}
```

**ids:** Tối đa 100 track IDs, cách nhau bởi dấu phẩy

**Response (200):**
```json
{
  "audio_features": [ /* AudioFeaturesObject[] */ ]
}
```

---

## 17. Endpoints — Recommendations

### GET /v1/recommendations

```
GET https://api.spotify.com/v1/recommendations
```

**Scopes:** Không cần

**Query params — Seeds (bắt buộc ít nhất 1, tổng tối đa 5 seeds):**

| Param | Mô tả |
|-------|-------|
| `seed_artists` | Comma-separated artist IDs (max 5) |
| `seed_genres` | Comma-separated genre names (max 5) |
| `seed_tracks` | Comma-separated track IDs (max 5) |

**Query params — Control:**

| Param | Default | Mô tả |
|-------|---------|-------|
| `limit` | 20 | 1–100 |
| `market` | - | Country code |

**Query params — Tunable Track Attributes:**

Mỗi attribute hỗ trợ 3 biến thể: `min_*`, `max_*`, `target_*`

| Attribute | Range | Mô tả |
|-----------|-------|-------|
| `acousticness` | 0.0–1.0 | |
| `danceability` | 0.0–1.0 | |
| `duration_ms` | integer | Thời lượng |
| `energy` | 0.0–1.0 | |
| `instrumentalness` | 0.0–1.0 | |
| `key` | 0–11 | |
| `liveness` | 0.0–1.0 | |
| `loudness` | float | |
| `mode` | 0–1 | |
| `popularity` | 0–100 | |
| `speechiness` | 0.0–1.0 | |
| `tempo` | float | BPM |
| `time_signature` | integer | |
| `valence` | 0.0–1.0 | |

**Ví dụ request:**
```
GET /v1/recommendations?seed_artists=4NHQUkpP&seed_genres=pop&target_energy=0.8&min_tempo=120&limit=10
```

**Response (200):**
```json
{
  "seeds": [
    {
      "afterFilteringSize": 18,
      "afterRelinkingSize": 18,
      "href": "https://api.spotify.com/v1/artists/4NHQUkpP",
      "id": "4NHQUkpP",
      "initialPoolSize": 500,
      "type": "ARTIST"
    }
  ],
  "tracks": [
    {
      "album": { /* SimplifiedAlbumObject */ },
      "artists": [ /* SimplifiedArtistObject[] */ ],
      "available_markets": ["VN"],
      "disc_number": 1,
      "duration_ms": 213573,
      "explicit": false,
      "external_ids": { "isrc": "string" },
      "external_urls": { "spotify": "string" },
      "href": "string",
      "id": "string",
      "is_playable": true,
      "name": "string",
      "popularity": 73,
      "preview_url": "string",
      "track_number": 1,
      "type": "track",
      "uri": "spotify:track:...",
      "is_local": false
    }
  ]
}
```

---

## 18. Quick Reference — Tất cả endpoints

### Tracks
| Endpoint | Method | URL | Scope |
|----------|--------|-----|-------|
| Get Track | GET | `/v1/tracks/{id}` | - |
| Get Several Tracks | GET | `/v1/tracks?ids=` | - |
| Get Audio Features | GET | `/v1/audio-features/{id}` | - |
| Get Several Audio Features | GET | `/v1/audio-features?ids=` | - |
| Get Audio Analysis | GET | `/v1/audio-analysis/{id}` | - |
| Get Recommendations | GET | `/v1/recommendations` | - |
| Save Tracks | PUT | `/v1/me/tracks` | `user-library-modify` |
| Remove Saved Tracks | DELETE | `/v1/me/tracks` | `user-library-modify` |
| Get Saved Tracks | GET | `/v1/me/tracks` | `user-library-read` |
| Check Saved Tracks | GET | `/v1/me/tracks/contains` | `user-library-read` |

### Albums
| Endpoint | Method | URL | Scope |
|----------|--------|-----|-------|
| Get Album | GET | `/v1/albums/{id}` | - |
| Get Several Albums | GET | `/v1/albums?ids=` | - |
| Get Album Tracks | GET | `/v1/albums/{id}/tracks` | - |
| Get New Releases | GET | `/v1/browse/new-releases` | - |
| Get Saved Albums | GET | `/v1/me/albums` | `user-library-read` |
| Save Albums | PUT | `/v1/me/albums` | `user-library-modify` |
| Remove Albums | DELETE | `/v1/me/albums` | `user-library-modify` |
| Check Saved Albums | GET | `/v1/me/albums/contains` | `user-library-read` |

### Artists
| Endpoint | Method | URL | Scope |
|----------|--------|-----|-------|
| Get Artist | GET | `/v1/artists/{id}` | - |
| Get Several Artists | GET | `/v1/artists?ids=` | - |
| Get Artist's Albums | GET | `/v1/artists/{id}/albums` | - |
| Get Artist's Top Tracks | GET | `/v1/artists/{id}/top-tracks` | - |
| Get Artist's Related Artists | GET | `/v1/artists/{id}/related-artists` | - |

### Search
| Endpoint | Method | URL | Scope |
|----------|--------|-----|-------|
| Search | GET | `/v1/search` | - |

### Users
| Endpoint | Method | URL | Scope |
|----------|--------|-----|-------|
| Get Current User's Profile | GET | `/v1/me` | `user-read-private`, `user-read-email` |
| Get User's Profile | GET | `/v1/users/{user_id}` | - |
| Get User's Top Items | GET | `/v1/me/top/{type}` | `user-top-read` |
| Get Followed Artists | GET | `/v1/me/following?type=artist` | `user-follow-read` |
| Follow Artists/Users | PUT | `/v1/me/following` | `user-follow-modify` |
| Unfollow Artists/Users | DELETE | `/v1/me/following` | `user-follow-modify` |
| Check Following | GET | `/v1/me/following/contains` | `user-follow-read` |

### Player
| Endpoint | Method | URL | Scope |
|----------|--------|-----|-------|
| Get Playback State | GET | `/v1/me/player` | `user-read-playback-state` |
| Transfer Playback | PUT | `/v1/me/player` | `user-modify-playback-state` |
| Get Devices | GET | `/v1/me/player/devices` | `user-read-playback-state` |
| Get Currently Playing | GET | `/v1/me/player/currently-playing` | `user-read-currently-playing` |
| Start/Resume Playback | PUT | `/v1/me/player/play` | `user-modify-playback-state` |
| Pause Playback | PUT | `/v1/me/player/pause` | `user-modify-playback-state` |
| Skip to Next | POST | `/v1/me/player/next` | `user-modify-playback-state` |
| Skip to Previous | POST | `/v1/me/player/previous` | `user-modify-playback-state` |
| Seek | PUT | `/v1/me/player/seek` | `user-modify-playback-state` |
| Set Repeat Mode | PUT | `/v1/me/player/repeat` | `user-modify-playback-state` |
| Set Volume | PUT | `/v1/me/player/volume` | `user-modify-playback-state` |
| Toggle Shuffle | PUT | `/v1/me/player/shuffle` | `user-modify-playback-state` |
| Get Recently Played | GET | `/v1/me/player/recently-played` | `user-read-recently-played` |
| Get Queue | GET | `/v1/me/player/queue` | `user-read-currently-playing` |
| Add to Queue | POST | `/v1/me/player/queue` | `user-modify-playback-state` |

### Playlists
| Endpoint | Method | URL | Scope |
|----------|--------|-----|-------|
| Get Playlist | GET | `/v1/playlists/{id}` | - |
| Update Playlist | PUT | `/v1/playlists/{id}` | `playlist-modify-*` |
| Get Playlist Tracks | GET | `/v1/playlists/{id}/tracks` | `playlist-read-private` |
| Add Tracks to Playlist | POST | `/v1/playlists/{id}/tracks` | `playlist-modify-*` |
| Update Playlist Tracks | PUT | `/v1/playlists/{id}/tracks` | `playlist-modify-*` |
| Remove Tracks from Playlist | DELETE | `/v1/playlists/{id}/tracks` | `playlist-modify-*` |
| Get User's Playlists | GET | `/v1/me/playlists` | `playlist-read-private` |
| Get User's Playlists (by ID) | GET | `/v1/users/{id}/playlists` | - |
| Create Playlist | POST | `/v1/me/playlists` | `playlist-modify-*` |
| Get Playlist Cover | GET | `/v1/playlists/{id}/images` | - |
| Add Custom Cover | PUT | `/v1/playlists/{id}/images` | `ugc-image-upload` |
| Follow Playlist | PUT | `/v1/playlists/{id}/followers` | `playlist-modify-*` |
| Unfollow Playlist | DELETE | `/v1/playlists/{id}/followers` | `playlist-modify-*` |
| Check Playlist Followers | GET | `/v1/playlists/{id}/followers/contains` | - |
| Get Featured Playlists | GET | `/v1/browse/featured-playlists` | - |
| Get Category Playlists | GET | `/v1/browse/categories/{id}/playlists` | - |

### Browse
| Endpoint | Method | URL | Scope |
|----------|--------|-----|-------|
| Get Available Genre Seeds | GET | `/v1/recommendations/available-genre-seeds` | - |
| Get Browse Categories | GET | `/v1/browse/categories` | - |
| Get Category | GET | `/v1/browse/categories/{id}` | - |
| Get Available Markets | GET | `/v1/markets` | - |

---

## Ghi chú quan trọng

1. **Spotify URIs vs IDs**
   - URI: `spotify:track:4iV5W9uYEdYUVa79Axb7Rh` — dùng trong Player endpoints
   - ID: `4iV5W9uYEdYUVa79Axb7Rh` — dùng trong hầu hết endpoints còn lại

2. **Premium requirement**
   - Tất cả Player control endpoints (`/play`, `/pause`, `/next`...) yêu cầu Premium
   - `streaming` scope (Web Playback SDK) yêu cầu Premium

3. **Market filtering**
   - Khi pass `market` query param, chỉ nhận tracks available ở market đó
   - Khi dùng user token hợp lệ với scope `user-read-private`, market của account user được ưu tiên

4. **Snapshot ID**
   - Mỗi lần thay đổi playlist, Spotify tạo `snapshot_id` mới
   - Dùng `snapshot_id` trong DELETE để đảm bảo xóa đúng version

5. **Content policy**
   - Spotify content **không được dùng** để train ML/AI models
   - Phải hiển thị attribution "Powered by Spotify"
   - Preview URL (`preview_url`) có thể là `null` với một số tracks
