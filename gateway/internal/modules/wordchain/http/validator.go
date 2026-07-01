package http

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type groqValidator struct {
	endpoint string
	apiKey   string
	model    string
	client   *http.Client
}

func newGroqValidator(endpoint, apiKey, model string) *groqValidator {
	endpoint = strings.TrimRight(strings.TrimSpace(endpoint), "/")
	if endpoint != "" && !strings.HasSuffix(endpoint, "/chat/completions") {
		endpoint += "/chat/completions"
	}
	return &groqValidator{
		endpoint: endpoint,
		apiKey:   apiKey,
		model:    model,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

func (v *groqValidator) validateAndExplain(ctx context.Context, phrase string) (validationResult, error) {
	if v.endpoint == "" || v.apiKey == "" {
		return validationResult{}, errors.New("Groq chưa được cấu hình")
	}
	prompt := fmt.Sprintf(`Kiểm tra cụm từ tiếng Việt "%s" theo cách sử dụng phổ biến vào năm %d.
Chỉ trả về JSON theo mẫu:
{"valid":true,"normalized":"cụm từ","explanation":"Giải thích nghĩa ngắn gọn bằng tiếng Việt."}

Quy tắc:
- valid chỉ là true nếu đây là một mục từ hoặc cụm từ cố định gồm đúng hai âm tiết, có nghĩa từ vựng độc lập và thực sự được người Việt sử dụng.
- Chấp nhận danh từ, động từ, tính từ, trạng từ và thành ngữ cố định như "gia đình", "sống sót", "quần đảo".
- Chấp nhận thuật ngữ hiện đại trong công nghệ, đời sống số, công việc, giải trí, tài chính, môi trường và xã hội nếu đã được người Việt sử dụng rộng rãi.
- Chấp nhận từ vay mượn hoặc cách gọi mới đã trở nên quen thuộc; không bác bỏ chỉ vì từ đó chưa xuất hiện trong từ điển truyền thống.
- Không chấp nhận mảnh câu hỏi/hội thoại, tổ hợp đại từ + trợ từ, liên từ rời rạc như "sao hả", "sao mà", "sao chăng", "vậy hả".
- Không chấp nhận tên riêng, teen-code, meme nhất thời, tiếng lóng bịa đặt, ghép từ vô nghĩa hoặc lặp lại cùng một âm.
- normalized viết thường, đúng chính tả.
- explanation tối đa 35 từ, dùng ngôn ngữ hiện đại, dễ hiểu và phải giải thích được cho cả hai người chơi.`, phrase, time.Now().Year())

	body, err := json.Marshal(map[string]any{
		"model": v.model,
		"messages": []map[string]string{
			{"role": "system", "content": "Bạn là trọng tài tiếng Việt hiện đại, am hiểu cách dùng từ phổ biến trong đời sống và văn hóa số."},
			{"role": "user", "content": prompt},
		},
		"temperature":     0,
		"max_tokens":      180,
		"response_format": map[string]string{"type": "json_object"},
	})
	if err != nil {
		return validationResult{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, v.endpoint, bytes.NewReader(body))
	if err != nil {
		return validationResult{}, err
	}
	req.Header.Set("Authorization", "Bearer "+v.apiKey)
	req.Header.Set("Content-Type", "application/json")
	res, err := v.client.Do(req)
	if err != nil {
		return validationResult{}, err
	}
	defer res.Body.Close()
	payload, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return validationResult{}, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return validationResult{}, fmt.Errorf("Groq trả về HTTP %d", res.StatusCode)
	}
	var response struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(payload, &response); err != nil || len(response.Choices) == 0 {
		return validationResult{}, errors.New("phản hồi Groq không hợp lệ")
	}
	content := strings.TrimSpace(response.Choices[0].Message.Content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	var result validationResult
	if err := json.Unmarshal([]byte(strings.TrimSpace(content)), &result); err != nil {
		return validationResult{}, errors.New("Groq không trả về JSON hợp lệ")
	}
	return result, nil
}
