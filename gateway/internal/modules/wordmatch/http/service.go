package http

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"time"
)

const totalChoices = 9

type WordMatchRound struct {
	BaseWord     string   `json:"baseWord"`
	Choices      []string `json:"choices"`
	CorrectWords []string `json:"correctWords"`
}

type wordMatchService struct {
	llmURL   string
	llmKey   string
	llmModel string
	client   *http.Client
}

type generatedRound struct {
	BaseWord    string   `json:"baseWord"`
	CorrectWord string   `json:"correctWord"`
	Decoys      []string `json:"decoys"`
}

func newWordMatchService(llmURL, llmKey, llmModel string) *wordMatchService {
	return &wordMatchService{
		llmURL:   strings.TrimRight(strings.TrimSpace(llmURL), "/"),
		llmKey:   strings.TrimSpace(llmKey),
		llmModel: strings.TrimSpace(llmModel),
		client:   &http.Client{Timeout: 30 * time.Second},
	}
}

// newRound asks Groq to create the complete round. No local dictionary is used.
func (s *wordMatchService) newRound(ctx context.Context, baseWord string) (WordMatchRound, error) {
	requestedBase := normalizeWord(baseWord)
	if requestedBase != "" && len(strings.Fields(requestedBase)) != 1 {
		return WordMatchRound{}, errors.New("âm tiết nối tiếp không hợp lệ")
	}

	var lastErr error
	for attempt := 0; attempt < 2; attempt++ {
		generated, err := s.generateRound(ctx, requestedBase)
		if err != nil {
			lastErr = err
			continue
		}
		round, err := buildRound(generated, requestedBase)
		if err == nil {
			return round, nil
		}
		lastErr = err
	}
	return WordMatchRound{}, fmt.Errorf("Groq không tạo được vòng chơi hợp lệ: %w", lastErr)
}

func (s *wordMatchService) generateRound(ctx context.Context, baseWord string) (generatedRound, error) {
	baseInstruction := "Tự chọn một âm tiết tiếng Việt thông dụng làm baseWord."
	if baseWord != "" {
		baseInstruction = fmt.Sprintf(`Bắt buộc dùng chính xác "%s" làm baseWord.`, baseWord)
	}
	prompt := fmt.Sprintf(`Tạo một vòng chơi đoán từ ghép tiếng Việt phù hợp với người dùng hiện nay (năm %d).
%s

Chỉ trả về JSON:
{"baseWord":"âm","correctWord":"âm nhạc","decoys":["âm ..."]}

Quy tắc:
- correctWord gồm đúng hai âm tiết, bắt đầu bằng baseWord, là từ/cụm từ tiếng Việt có nghĩa và được sử dụng thực tế.
- Ưu tiên từ quen thuộc trong đời sống hiện đại: công nghệ, đời sống số, học tập, công việc, giải trí, sức khỏe, tài chính, môi trường và xã hội.
- Có thể dùng thuật ngữ mới hoặc từ vay mượn đã được người Việt sử dụng rộng rãi, nhưng phải viết theo cách phổ biến và tự nhiên.
- Không chọn từ cổ, từ địa phương hiếm, từ Hán Việt khó hiểu, thuật ngữ chuyên ngành quá sâu hoặc cụm từ tuy đúng nhưng ít người hiện nay sử dụng.
- Nếu có nhiều đáp án đúng, hãy âm thầm so sánh ít nhất 5 ứng viên và chọn từ dễ nhận biết nhất với người dùng phổ thông.
- Ưu tiên correctWord có âm tiết thứ hai tiếp tục ghép được với những từ thông dụng khác để vòng sau không bị bí.
- decoys có đúng 8 phần tử khác nhau, mỗi phần tử gồm đúng hai âm tiết và bắt đầu bằng baseWord.
- Mỗi decoy phải là tổ hợp không có nghĩa, không phải từ tiếng Việt, tên riêng, từ viết tắt hoặc biến thể chính tả của một từ thật.
- correctWord không được xuất hiện trong decoys.
- Tất cả viết thường, đúng chính tả; không thêm nhận xét ngoài JSON.`, time.Now().Year(), baseInstruction)

	content, err := s.chat(
		ctx,
		"Bạn là biên tập viên tiếng Việt hiện đại, am hiểu cách dùng từ phổ biến trong đời sống và văn hóa số hiện nay.",
		prompt,
		700,
		0.4,
		true,
	)
	if err != nil {
		return generatedRound{}, err
	}
	var result generatedRound
	if err := decodeJSONContent(content, &result); err != nil {
		return generatedRound{}, fmt.Errorf("Groq không trả về JSON vòng chơi hợp lệ: %w", err)
	}
	return result, nil
}

func buildRound(generated generatedRound, requestedBase string) (WordMatchRound, error) {
	base := normalizeWord(generated.BaseWord)
	if requestedBase != "" {
		if base != "" && base != requestedBase {
			return WordMatchRound{}, errors.New("Groq đã thay đổi âm tiết được yêu cầu")
		}
		base = requestedBase
	}
	if len(strings.Fields(base)) != 1 {
		return WordMatchRound{}, errors.New("baseWord phải có đúng một âm tiết")
	}

	correct := normalizeWord(generated.CorrectWord)
	if !isTwoSyllableChoice(correct, base) {
		return WordMatchRound{}, errors.New("đáp án đúng không khớp với âm tiết gốc")
	}

	seen := map[string]struct{}{correct: {}}
	decoys := make([]string, 0, totalChoices-1)
	for _, raw := range generated.Decoys {
		decoy := normalizeWord(raw)
		if !isTwoSyllableChoice(decoy, base) {
			continue
		}
		if _, exists := seen[decoy]; exists {
			continue
		}
		seen[decoy] = struct{}{}
		decoys = append(decoys, decoy)
	}
	if len(decoys) != totalChoices-1 {
		return WordMatchRound{}, fmt.Errorf("cần 8 đáp án nhiễu hợp lệ, nhận được %d", len(decoys))
	}

	choices := append([]string{correct}, decoys...)
	if err := shuffle(choices); err != nil {
		return WordMatchRound{}, err
	}
	return WordMatchRound{
		BaseWord:     base,
		Choices:      choices,
		CorrectWords: []string{correct},
	}, nil
}

func isTwoSyllableChoice(choice, base string) bool {
	parts := strings.Fields(choice)
	return len(parts) == 2 && parts[0] == base
}

func normalizeWord(word string) string {
	return strings.ToLower(strings.Join(strings.Fields(word), " "))
}

func (s *wordMatchService) explain(ctx context.Context, words []string) (string, error) {
	if len(words) == 0 {
		return "Không có từ cần giải thích.", nil
	}
	content, err := s.chat(
		ctx,
		"Bạn là chuyên gia từ vựng tiếng Việt. Giải thích ngắn gọn, chính xác và chỉ ra rõ nếu tổ hợp không có nghĩa.",
		fmt.Sprintf(
			"Giải thích các tổ hợp sau, mỗi tổ hợp một dòng theo định dạng “từ - nghĩa”; nếu vô nghĩa hãy ghi rõ: %s",
			strings.Join(words, ", "),
		),
		512,
		0.2,
		false,
	)
	if err != nil {
		return "Không thể lấy giải thích lúc này.", nil
	}
	return strings.TrimSpace(content), nil
}

func (s *wordMatchService) chat(
	ctx context.Context,
	systemPrompt, userPrompt string,
	maxTokens int,
	temperature float64,
	jsonResponse bool,
) (string, error) {
	if s.llmURL == "" || s.llmKey == "" || s.llmModel == "" {
		return "", errors.New("Groq chưa được cấu hình")
	}
	endpoint := s.llmURL
	if !strings.HasSuffix(endpoint, "/chat/completions") {
		endpoint += "/chat/completions"
	}
	bodyData := map[string]any{
		"model": s.llmModel,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"max_tokens":  maxTokens,
		"temperature": temperature,
	}
	if jsonResponse {
		bodyData["response_format"] = map[string]string{"type": "json_object"}
	}
	body, err := json.Marshal(bodyData)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+s.llmKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("Groq trả về HTTP %d", resp.StatusCode)
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &out); err != nil || len(out.Choices) == 0 {
		return "", errors.New("phản hồi Groq không hợp lệ")
	}
	content := strings.TrimSpace(out.Choices[0].Message.Content)
	if content == "" {
		return "", errors.New("Groq trả về nội dung trống")
	}
	return content, nil
}

func decodeJSONContent(content string, target any) error {
	content = strings.TrimSpace(content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	return json.Unmarshal([]byte(strings.TrimSpace(content)), target)
}

func shuffle(values []string) error {
	for i := len(values) - 1; i > 0; i-- {
		j, err := randN(int64(i + 1))
		if err != nil {
			return err
		}
		values[i], values[j] = values[j], values[i]
	}
	return nil
}

func randN(n int64) (int64, error) {
	if n <= 0 {
		return 0, nil
	}
	value, err := rand.Int(rand.Reader, big.NewInt(n))
	if err != nil {
		return 0, err
	}
	return value.Int64(), nil
}
