# Nối từ realtime

## Luật chơi

- Khi tạo phòng, chủ phòng chọn sức chứa tối đa từ 2 đến 6 người và một trong hai chế độ chơi.
- Phòng có sức chứa tối đa 2 người luôn dùng chế độ Truyền thống; lựa chọn chế độ chỉ mở cho phòng 3–6 người.
- Thứ tự tham gia được chốt theo thời điểm vào phòng: chủ phòng là số 1, các thành viên tiếp theo là số 2–6.
- Trên giao diện, người chơi được xếp quanh đấu trường theo thứ tự ngược chiều kim đồng hồ.
- Chủ phòng bắt đầu ván khi tất cả người trong phòng đang kết nối và đi lượt đầu tiên.

## Chế độ Truyền thống

- Người chơi lần lượt trả lời theo thứ tự tham gia; chủ phòng đi đầu.
- Người hết 15 giây ở lượt của mình bị loại; trận tiếp tục theo thứ tự cho đến khi còn một người.

## Chế độ Sáp lá cà

- Mỗi lượt mở trong 15 giây cho tất cả người chơi hợp lệ cùng tranh câu trả lời.
- Yêu cầu hợp lệ đến máy chủ sớm nhất thắng lượt và nhận điểm tốc độ.
- Âm cuối của cụm từ thắng lượt trở thành âm bắt đầu cho lượt tiếp theo.
- Người vừa thắng vẫn được tiếp tục tranh đáp án ngay ở lượt kế tiếp.
- Nếu hết 15 giây mà không có đáp án hợp lệ, ván kết thúc và bảng xếp hạng ván được sắp theo điểm, rồi đến số từ.
- Mỗi ván mới chọn ngẫu nhiên một âm bắt đầu cho lượt đầu.
- Mỗi lượt có 15 giây. Hết giờ, người còn lại thắng.
- Câu trả lời phải gồm đúng 2 âm tiết.
- Người chơi có thể chỉ nhập âm thứ hai; server tự ghép với âm bắt đầu. Nhập đầy đủ hai âm vẫn hợp lệ.
- Âm đầu của câu trả lời phải trùng âm cuối của câu trả lời trước.
- Một cụm từ không được dùng lại trong cùng ván.
- Cụm từ phải có trong bộ từ điển của trò chơi, sau đó Groq xác nhận nghĩa và trả về lời giải thích ngắn.
- Mỗi cụm từ hợp lệ cộng 1 vào tổng số từ cá nhân.
- Mỗi câu trả lời nhận từ 10 đến 100 điểm tốc độ; trả lời càng sớm trong 15 giây thì điểm càng cao.
- Tổng số từ và tổng điểm tốc độ được lưu riêng trong Redis và cộng dồn qua mọi ván.

## REST API

Tất cả endpoint bên dưới yêu cầu access token:

```text
GET    /api/v1/word-chain/rooms
POST   /api/v1/word-chain/rooms
GET    /api/v1/word-chain/rooms/:room_id
POST   /api/v1/word-chain/rooms/:room_id/join
DELETE /api/v1/word-chain/rooms/:room_id/members/me
POST   /api/v1/word-chain/rooms/:room_id/ws-ticket
GET    /api/v1/word-chain/leaderboard
```

WebSocket dùng ticket một lần:

```text
GET /ws/word-chain?ticket=:ticket
```

Client gửi các message:

```json
{"type":"start"}
{"type":"submit","word":"âm nhạc"}
{"type":"kick","userId":"user-uuid"}
{"type":"leave"}
```

Server phát các event:

```text
room_state
game_started
word_checking
word_accepted
word_rejected
game_over
kicked
room_closed
error
```

## Cấu hình Groq

Gateway sử dụng cấu hình OpenAI-compatible hiện có:

```text
LLM_BASE_URL
LLM_API_KEY
LLM_MODEL
```

Không có fallback sang từ điển. Nếu Groq không khả dụng, lượt hiện tại vẫn giữ nguyên và người chơi được phép thử lại trong thời gian còn lại.
