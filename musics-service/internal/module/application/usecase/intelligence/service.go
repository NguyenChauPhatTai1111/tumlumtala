package intelligence

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"math/rand/v2"
	"regexp"
	"slices"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"

	intelligencedto "github.com/tumlumtala/musics-service/internal/module/application/dto/intelligence"
	mediadto "github.com/tumlumtala/musics-service/internal/module/application/dto/media"
	mediauc "github.com/tumlumtala/musics-service/internal/module/application/usecase/media"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/event"
	intelligenceentity "github.com/tumlumtala/musics-service/internal/module/domain/entity/intelligence"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/media"
	musicrepo "github.com/tumlumtala/musics-service/internal/module/domain/repository"
)

type Repository interface {
	musicrepo.MusicRepository
	musicrepo.IntelligenceRepository
}

type Service struct {
	repo    Repository
	planner Planner
	now     func() time.Time
}

func NewService(repo Repository, planner Planner) *Service {
	return &Service{repo: repo, planner: planner, now: time.Now}
}

func (s *Service) CreateSession(ctx context.Context, userUUID string, req intelligencedto.CreateSessionRequest) (*intelligencedto.SessionResponse, error) {
	dna, err := s.repo.ListDNADimensions(ctx, userUUID)
	if err != nil {
		return nil, err
	}
	mode := strings.TrimSpace(req.Mode)
	if mode == "" {
		mode = "dj"
	}
	planningPrompt := req.Prompt
	if mode == "dynamic" {
		planningPrompt += ". " + dynamicTimeHint(s.now())
	}
	plan := s.buildPlan(planningPrompt, mode, req.DurationMinutes, dna)
	if s.planner == nil {
		slog.Warn("music AI planner is nil — using keyword matching only; set MUSIC_AI_ENDPOINT and MUSIC_AI_API_KEY to enable LLM planning")
	} else {
		if planned, plannerErr := s.planner.Plan(ctx, planningPrompt, dna, plan); plannerErr == nil {
			plan = planned
		} else {
			slog.Error("music AI planner failed — using keyword matching fallback", "err", plannerErr)
		}
	}
	plan = normalizePlan(plan, s.buildPlan(planningPrompt, mode, req.DurationMinutes, dna))
	msg := assistantMessage(plan, mode)
	if s.planner != nil {
		if generated, msgErr := s.planner.GenerateMessage(ctx, req.Prompt, plan); msgErr == nil && generated != "" {
			msg = generated
		} else if msgErr != nil {
			slog.Error("music AI planner: GenerateMessage failed", "err", msgErr)
		}
	}
	planJSON, _ := json.Marshal(plan)
	session := intelligenceentity.AISession{
		ID:               uuid.NewString(),
		UserUUID:         userUUID,
		Mode:             mode,
		Prompt:           strings.TrimSpace(req.Prompt),
		Title:            sessionTitle(plan, mode),
		AssistantMessage: msg,
		Status:           "planning",
		Plan:             planJSON,
		Context:          json.RawMessage(`{}`),
	}
	if err := s.repo.CreateAISession(ctx, session); err != nil {
		return nil, err
	}
	_ = s.repo.AddAIMessage(ctx, intelligenceentity.AIMessage{SessionID: session.ID, Role: "user", Content: session.Prompt})
	_ = s.repo.AddAIMessage(ctx, intelligenceentity.AIMessage{SessionID: session.ID, Role: "assistant", Content: session.AssistantMessage})
	return &intelligencedto.SessionResponse{Session: session, Plan: plan}, nil
}

func (s *Service) GetSession(ctx context.Context, userUUID, sessionID string) (*intelligencedto.SessionResponse, error) {
	session, err := s.repo.GetAISession(ctx, userUUID, sessionID)
	if err != nil {
		return nil, err
	}
	var plan intelligencedto.JourneyPlan
	if err := json.Unmarshal(session.Plan, &plan); err != nil {
		return nil, err
	}
	messages, err := s.repo.ListAIMessages(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	tracks, err := s.repo.ListAISessionTracks(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	return &intelligencedto.SessionResponse{Session: *session, Plan: plan, Messages: messages, Tracks: tracks}, nil
}

func (s *Service) AddCandidates(ctx context.Context, userUUID, sessionID string, req intelligencedto.AddCandidatesRequest) (*intelligencedto.SessionResponse, error) {
	session, err := s.repo.GetAISession(ctx, userUUID, sessionID)
	if err != nil {
		return nil, err
	}
	var plan intelligencedto.JourneyPlan
	if err := json.Unmarshal(session.Plan, &plan); err != nil {
		return nil, err
	}
	dna, err := s.repo.ListDNADimensions(ctx, userUUID)
	if err != nil {
		return nil, err
	}
	ranked := s.rankCandidates(userUUID, req.Candidates, plan, dna, nil)
	if len(ranked) > plan.TargetTrackCount {
		ranked = ranked[:plan.TargetTrackCount]
	}
	offset := 0
	if req.Append {
		existing, listErr := s.repo.ListAISessionTracks(ctx, sessionID)
		if listErr != nil {
			return nil, listErr
		}
		offset = len(existing)
	}
	tracks, err := s.persistRankedTracks(ctx, userUUID, sessionID, ranked, offset)
	if err != nil {
		return nil, err
	}
	if req.Append {
		err = s.repo.AppendAISessionTracks(ctx, sessionID, tracks)
	} else {
		err = s.repo.ReplaceAISessionTracks(ctx, sessionID, tracks)
	}
	if err != nil {
		return nil, err
	}
	session.Status = "ready"
	if err := s.repo.UpdateAISession(ctx, *session); err != nil {
		return nil, err
	}
	return s.GetSession(ctx, userUUID, sessionID)
}

func (s *Service) Chat(ctx context.Context, userUUID, sessionID string, req intelligencedto.ChatRequest) (*intelligencedto.SessionResponse, error) {
	session, err := s.repo.GetAISession(ctx, userUUID, sessionID)
	if err != nil {
		return nil, err
	}
	dna, err := s.repo.ListDNADimensions(ctx, userUUID)
	if err != nil {
		return nil, err
	}
	combinedPrompt := strings.TrimSpace(session.Prompt + ". Điều chỉnh: " + req.Message)
	var oldPlan intelligencedto.JourneyPlan
	_ = json.Unmarshal(session.Plan, &oldPlan)
	plan := s.buildPlan(combinedPrompt, session.Mode, oldPlan.DurationMinutes, dna)
	if s.planner == nil {
		slog.Warn("music AI planner is nil — using keyword matching only")
	} else {
		if planned, plannerErr := s.planner.Plan(ctx, combinedPrompt, dna, plan); plannerErr == nil {
			plan = planned
		} else {
			slog.Error("music AI planner failed — using keyword matching fallback", "err", plannerErr)
		}
	}
	chatMsg := assistantMessage(plan, session.Mode)
	if s.planner != nil {
		if generated, msgErr := s.planner.GenerateMessage(ctx, req.Message, plan); msgErr == nil && generated != "" {
			chatMsg = generated
		}
	}
	planJSON, _ := json.Marshal(plan)
	session.Prompt = combinedPrompt
	session.Plan = planJSON
	session.Title = sessionTitle(plan, session.Mode)
	session.AssistantMessage = chatMsg
	session.Status = "planning"
	if err := s.repo.UpdateAISession(ctx, *session); err != nil {
		return nil, err
	}
	_ = s.repo.AddAIMessage(ctx, intelligenceentity.AIMessage{SessionID: sessionID, Role: "user", Content: req.Message})
	_ = s.repo.AddAIMessage(ctx, intelligenceentity.AIMessage{SessionID: sessionID, Role: "assistant", Content: session.AssistantMessage})
	if len(req.Candidates) > 0 {
		return s.AddCandidates(ctx, userUUID, sessionID, intelligencedto.AddCandidatesRequest{Candidates: req.Candidates})
	}
	return s.GetSession(ctx, userUUID, sessionID)
}

func (s *Service) SmartQueue(ctx context.Context, userUUID string, req intelligencedto.SmartQueueRequest) ([]intelligencedto.RankedTrack, error) {
	dna, err := s.repo.ListDNADimensions(ctx, userUUID)
	if err != nil {
		return nil, err
	}
	prompt := "smart queue phù hợp listening DNA"
	plan := s.buildPlan(prompt, "radio", 45, dna)
	if req.ListenedMinutes >= 40 && queueIsHighEnergy(req.CurrentQueue) {
		plan.Moods = appendUnique(plan.Moods, "calm")
		if len(plan.Timeline) > 0 {
			plan.Timeline[0].TargetEnergy = 0.3
			plan.Timeline[0].Label = "Nghỉ nhịp"
			plan.Timeline[0].Description = "Một bài nhẹ để tránh mệt tai trước khi quay lại nhịp chính"
		}
	}
	exclude := map[string]struct{}{}
	for _, item := range req.CurrentQueue {
		exclude[item.SourceID] = struct{}{}
	}
	ranked := s.rankCandidates(userUUID, req.Candidates, plan, dna, exclude)
	if len(ranked) > 8 {
		ranked = ranked[:8]
	}
	return ranked, nil
}

func (s *Service) Journey(ctx context.Context, userUUID string, days int) (*intelligencedto.JourneySummary, error) {
	if days < 1 || days > 90 {
		days = 7
	}
	events, err := s.repo.ListListeningEventsSince(ctx, userUUID, s.now().AddDate(0, 0, -days), 10000)
	if err != nil {
		return nil, err
	}
	dna, err := s.repo.ListDNADimensions(ctx, userUUID)
	if err != nil {
		return nil, err
	}
	sessions := map[string]struct{}{}
	var listened, completions, skips int
	for _, item := range events {
		listened += int(item.ListenDuration)
		if item.SessionID != "" {
			sessions[item.SessionID] = struct{}{}
		}
		if item.EventType == "complete" {
			completions++
		}
		if item.EventType == "skip" {
			skips++
		}
	}
	meaningful := max(completions+skips, 1)
	top := groupDNAInsights(dna, 5)
	trend, suggestion := journeyNarrative(top)
	return &intelligencedto.JourneySummary{
		Days:           days,
		TotalSessions:  max(len(sessions), sessionEstimate(events)),
		TotalMinutes:   listened / 60,
		CompletionRate: round2(float64(completions) / float64(meaningful) * 100),
		SkipRate:       round2(float64(skips) / float64(meaningful) * 100),
		TopDimensions:  top,
		RecentTrend:    trend,
		Suggestion:     suggestion,
	}, nil
}

func (s *Service) Heatmap(ctx context.Context, userUUID string, days int) (*intelligencedto.HeatmapResponse, error) {
	if days < 1 || days > 180 {
		days = 30
	}
	events, err := s.repo.ListListeningEventsSince(ctx, userUUID, s.now().AddDate(0, 0, -days), 20000)
	if err != nil {
		return nil, err
	}
	type key struct{ day, hour int }
	counts := map[key]*intelligencedto.HeatmapCell{}
	peak := key{}
	peakCount := 0
	for _, item := range events {
		if item.EventType != "play" && item.EventType != "complete" {
			continue
		}
		k := key{int(item.DayOfWeek), int(item.ListeningHour)}
		if item.ListeningHour == 0 && !item.OccurredAt.IsZero() {
			k = key{int(item.OccurredAt.Weekday()), item.OccurredAt.Hour()}
		}
		cell := counts[k]
		if cell == nil {
			cell = &intelligencedto.HeatmapCell{Day: k.day, Hour: k.hour}
			counts[k] = cell
		}
		cell.PlayCount++
		cell.Minutes += int(item.ListenDuration) / 60
		if cell.PlayCount > peakCount {
			peak, peakCount = k, cell.PlayCount
		}
	}
	cells := make([]intelligencedto.HeatmapCell, 0, len(counts))
	for _, cell := range counts {
		cells = append(cells, *cell)
	}
	sort.Slice(cells, func(i, j int) bool {
		if cells[i].Day == cells[j].Day {
			return cells[i].Hour < cells[j].Hour
		}
		return cells[i].Day < cells[j].Day
	})
	return &intelligencedto.HeatmapResponse{
		Cells: cells, PeakDay: peak.day, PeakHour: peak.hour,
		Insight: fmt.Sprintf("Bạn thường nghe nhiều nhất vào %s lúc %02d:00.", weekdayName(peak.day), peak.hour),
	}, nil
}

func (s *Service) Discover(ctx context.Context, userUUID, seedSourceID string) (*intelligencedto.DiscoveryResponse, error) {
	dna, err := s.repo.ListDNADimensions(ctx, userUUID)
	if err != nil {
		return nil, err
	}
	top := topPositiveDimensions(dna, 8)
	queries := discoveryQueries(top)
	because := make([]string, 0, 3)
	for _, item := range top {
		if item.DimensionType == "genre" || item.DimensionType == "mood" || item.DimensionType == "artist" {
			because = append(because, item.DimensionValue)
		}
		if len(because) == 3 {
			break
		}
	}
	gems, _ := s.repo.ListHiddenGemMedia(ctx, 12)
	var community []media.MediaItem
	similarListeners := 0
	events, eventErr := s.repo.ListCommunityEventsSince(ctx, userUUID, s.now().AddDate(0, 0, -30), 5000)
	if eventErr == nil {
		counts := map[string]int{}
		similarUsers := map[string]struct{}{}
		affinities := map[string]struct{}{}
		for _, item := range top {
			if item.DimensionType == "genre" || item.DimensionType == "mood" {
				affinities[item.DimensionType+":"+strings.ToLower(item.DimensionValue)] = struct{}{}
			}
		}
		for _, item := range events {
			_, genreMatch := affinities["genre:"+strings.ToLower(item.Genre)]
			_, moodMatch := affinities["mood:"+strings.ToLower(item.Mood)]
			transitionMatch := seedSourceID != "" && item.PreviousSourceID == seedSourceID
			if genreMatch || moodMatch || transitionMatch {
				similarUsers[item.UserUUID] = struct{}{}
				if item.SourceID != seedSourceID {
					counts[item.SourceID]++
				}
			}
		}
		similarListeners = len(similarUsers)
		ids := topCountKeys(counts, 12)
		community, _ = s.repo.FindMediaBySourceIDs(ctx, ids)
	}
	return &intelligencedto.DiscoveryResponse{
		Queries: queries, Because: because, HiddenGems: dedupeMedia(gems),
		CommunityNext: dedupeMedia(community), SimilarListeners: similarListeners,
		ExplorationTarget: explorationLevel(dna),
	}, nil
}

func (s *Service) Explain(req intelligencedto.TrackExplanationRequest) intelligencedto.TrackExplanation {
	item := req.Track
	energy := energyLabel(inferEnergy(item))
	tempo := "chưa có BPM"
	if item.Tempo != nil {
		tempo = fmt.Sprintf("%.0f BPM · %s", *item.Tempo, tempoLabel(*item.Tempo))
	}
	style := firstNonEmpty(item.Genre, item.Mood, "independent music")
	highlights := []string{fmt.Sprintf("Phong cách %s", style), fmt.Sprintf("Mức năng lượng %s", energy)}
	if item.IsInstrumental != nil {
		if *item.IsInstrumental {
			highlights = append(highlights, "Không lời, phù hợp tập trung")
		} else {
			highlights = append(highlights, "Có vocal")
		}
	}
	if item.ViewCount < 1000 {
		highlights = append(highlights, "Hidden gem từ cộng đồng nghệ sĩ độc lập")
	}
	return intelligencedto.TrackExplanation{
		Summary: fmt.Sprintf("%s của %s là một track %s với năng lượng %s.", item.Title, firstNonEmpty(item.Artist, "nghệ sĩ độc lập"), style, energy),
		Style:   style, Energy: energy, Tempo: tempo, Key: firstNonEmpty(item.MusicalKey, "chưa xác định"),
		Highlights: highlights, ListeningTip: listeningTip(inferEnergy(item), item.IsInstrumental),
	}
}

func (s *Service) Compare(req intelligencedto.CompareSongsRequest) intelligencedto.SongComparison {
	a, b := req.First, req.Second
	score := 30
	shared := []string{}
	differences := []string{}
	if equalFoldNonEmpty(a.Genre, b.Genre) {
		score += 25
		shared = append(shared, "Cùng thể loại "+a.Genre)
	} else {
		differences = append(differences, fmt.Sprintf("Khác thể loại: %s / %s", firstNonEmpty(a.Genre, "?"), firstNonEmpty(b.Genre, "?")))
	}
	if equalFoldNonEmpty(a.Mood, b.Mood) {
		score += 15
		shared = append(shared, "Cùng mood "+a.Mood)
	}
	energyDiff := math.Abs(inferEnergy(a) - inferEnergy(b))
	score += int((1 - energyDiff) * 20)
	if energyDiff < .2 {
		shared = append(shared, "Năng lượng gần nhau")
	} else {
		differences = append(differences, "Chênh lệch năng lượng rõ rệt")
	}
	if a.Tempo != nil && b.Tempo != nil {
		diff := math.Abs(*a.Tempo - *b.Tempo)
		score += int(max(0, 10-diff/5))
		if diff < 12 {
			shared = append(shared, "Tempo dễ chuyển tiếp")
		} else {
			differences = append(differences, fmt.Sprintf("Tempo lệch %.0f BPM", diff))
		}
	}
	score = min(score, 100)
	return intelligencedto.SongComparison{
		Similarity: score, SharedTraits: shared, Differences: differences,
		TransitionNote: transitionNote(a, b),
	}
}

func (s *Service) ReviewAlbum(req intelligencedto.AlbumReviewRequest) intelligencedto.AlbumReview {
	var energySum float64
	genres := map[string]int{}
	best := append([]mediadto.MediaItemRequest(nil), req.Tracks...)
	for _, track := range req.Tracks {
		energySum += inferEnergy(track)
		if track.Genre != "" {
			genres[track.Genre]++
		}
	}
	sort.Slice(best, func(i, j int) bool {
		return best[i].LikeCount+best[i].RepostCount*2 > best[j].LikeCount+best[j].RepostCount*2
	})
	must := make([]string, 0, min(3, len(best)))
	for _, track := range best[:min(3, len(best))] {
		must = append(must, track.Title)
	}
	avg := energySum / float64(max(len(req.Tracks), 1))
	style := topStringCount(genres)
	return intelligencedto.AlbumReview{
		Summary:    fmt.Sprintf("%s của %s gồm %d bài, nghiêng về %s và giữ năng lượng %s.", req.Name, firstNonEmpty(req.Artist, "nghệ sĩ"), len(req.Tracks), firstNonEmpty(style, "đa phong cách"), energyLabel(avg)),
		Strengths:  []string{"Mạch nghe liền lạc", "Có điểm nhấn rõ giữa album", "Phù hợp nghe trọn vẹn theo thứ tự"},
		MustListen: must, Style: firstNonEmpty(style, "đa phong cách"),
		EnergyJourney: albumEnergyJourney(req.Tracks),
	}
}

func (s *Service) RemixQueries(req intelligencedto.RemixDiscoveryRequest) []string {
	base := strings.TrimSpace(req.Track.Title + " " + req.Track.Artist)
	return []string{base + " remix", base + " acoustic", base + " cover", base + " live", base + " mashup"}
}

func (s *Service) Challenges(ctx context.Context, userUUID string) ([]intelligencedto.Challenge, error) {
	now := s.now()
	start := now.AddDate(0, 0, -7)
	events, err := s.repo.ListListeningEventsSince(ctx, userUUID, start, 20000)
	if err != nil {
		return nil, err
	}
	genres, artists, completed, hidden := map[string]struct{}{}, map[string]struct{}{}, 0, 0
	for _, item := range events {
		if item.Genre != "" {
			genres[strings.ToLower(item.Genre)] = struct{}{}
		}
		if item.EventType == "complete" {
			completed++
		}
		if item.EventType == "like" {
			hidden++
		}
		artists[item.SourceID] = struct{}{}
	}
	challenges := []intelligencedto.Challenge{
		{Key: "genre_explorer", Title: "Nhà thám hiểm thể loại", Description: "Nghe 10 thể loại trong tuần", Progress: len(genres), Target: 10},
		{Key: "deep_listener", Title: "Nghe thật sâu", Description: "Nghe hết 20 bài", Progress: completed, Target: 20},
		{Key: "artist_scout", Title: "Săn nghệ sĩ mới", Description: "Khám phá 15 track khác nhau", Progress: len(artists), Target: 15},
		{Key: "gem_collector", Title: "Hidden Gem Collector", Description: "Like 5 khám phá mới", Progress: hidden, Target: 5},
	}
	period := now.Format("2006-W02")
	for i := range challenges {
		var completedAt *time.Time
		if challenges[i].Progress >= challenges[i].Target {
			value := now
			completedAt = &value
			challenges[i].CompletedAt = completedAt
		}
		_ = s.repo.UpsertChallengeProgress(ctx, intelligenceentity.ChallengeProgress{
			UserUUID: userUUID, ChallengeKey: challenges[i].Key, PeriodKey: period,
			Progress: uint32(challenges[i].Progress), Target: uint32(challenges[i].Target), CompletedAt: completedAt,
		})
	}
	return challenges, nil
}

func (s *Service) CreateSyncRoom(ctx context.Context, userUUID string) (*intelligenceentity.SyncRoom, error) {
	room := intelligenceentity.SyncRoom{
		ID: uuid.NewString(), InviteCode: randomInviteCode(), OwnerUUID: userUUID,
		Status: "waiting", ExpiresAt: s.now().Add(30 * time.Minute),
	}
	if err := s.repo.CreateSyncRoom(ctx, room); err != nil {
		return nil, err
	}
	return &room, nil
}

func (s *Service) JoinSyncRoom(ctx context.Context, userUUID, code string) (*intelligenceentity.SyncRoom, error) {
	return s.repo.JoinSyncRoom(ctx, userUUID, strings.ToUpper(strings.TrimSpace(code)))
}

func (s *Service) SyncRecommendations(ctx context.Context, userUUID, roomID string, candidates []mediadto.MediaItemRequest) ([]intelligencedto.RankedTrack, error) {
	room, err := s.repo.GetSyncRoom(ctx, userUUID, roomID)
	if err != nil {
		return nil, err
	}
	if room.GuestUUID == nil {
		return nil, fmt.Errorf("sync room is waiting for a friend")
	}
	ownerDNA, err := s.repo.ListDNADimensions(ctx, room.OwnerUUID)
	if err != nil {
		return nil, err
	}
	guestDNA, err := s.repo.ListDNADimensions(ctx, *room.GuestUUID)
	if err != nil {
		return nil, err
	}
	intersection := intersectDNA(ownerDNA, guestDNA)
	plan := s.buildPlan("playlist phù hợp cho cả hai người", "dj", 90, intersection)
	return s.rankCandidates(userUUID, candidates, plan, intersection, nil), nil
}

func (s *Service) buildPlan(prompt, mode string, explicitDuration int, dna []intelligenceentity.DNADimension) intelligencedto.JourneyPlan {
	normalized := normalizeText(prompt)
	activity := detectActivity(normalized)
	moods := detectMoods(normalized)
	genres := detectGenres(normalized)
	era := detectEra(normalized)
	country := detectCountry(normalized)
	instrumental, vocalGender := detectVocalConstraints(normalized)
	if len(genres) == 0 {
		for _, dimension := range topPositiveDimensions(dna, 4) {
			if dimension.DimensionType == "genre" {
				genres = appendUnique(genres, dimension.DimensionValue)
			}
		}
	}
	if len(moods) == 0 {
		for _, dimension := range topPositiveDimensions(dna, 4) {
			if dimension.DimensionType == "mood" {
				moods = appendUnique(moods, dimension.DimensionValue)
			}
		}
	}
	if len(genres) == 0 {
		genres = []string{"Chill Pop", "Indie"}
	}
	if len(moods) == 0 {
		moods = []string{defaultMoodForActivity(activity)}
	}
	duration := explicitDuration
	if duration == 0 {
		duration = parseDuration(normalized)
	}
	if duration == 0 {
		switch mode {
		case "radio":
			duration = 180
		case "dynamic":
			duration = 120
		default:
			duration = 90
		}
	}
	duration = min(max(duration, 10), 480)
	startEnergy, peakEnergy, endEnergy := energyArc(activity, moods, mode)
	timeline := buildTimeline(duration, startEnergy, peakEnergy, endEnergy)
	queries := buildSearchQueries(genres, moods, activity, era, country, instrumental, vocalGender)
	discovery := explorationLevel(dna)
	if strings.Contains(normalized, "hidden gem") || strings.Contains(normalized, "ít người") || strings.Contains(normalized, "underground") {
		discovery = .9
	}
	return intelligencedto.JourneyPlan{
		Activity: activity, Moods: moods, Genres: genres, DurationMinutes: duration,
		TargetTrackCount: min(max(int(math.Ceil(float64(duration)/3.5)), 5), 80),
		Instrumental:     instrumental, VocalGender: vocalGender, DiscoveryLevel: discovery,
		EnergyCurve: []intelligencedto.EnergyPoint{
			{Minute: 0, Energy: startEnergy, Label: "Bắt đầu"},
			{Minute: int(float64(duration) * .65), Energy: peakEnergy, Label: "Peak"},
			{Minute: duration, Energy: endEnergy, Label: "Kết"},
		},
		Timeline: timeline, SearchQueries: queries, AvoidRecent: true, DiversifyArtists: true,
	}
}

func (s *Service) rankCandidates(userUUID string, candidates []mediadto.MediaItemRequest, plan intelligencedto.JourneyPlan, dna []intelligenceentity.DNADimension, exclude map[string]struct{}) []intelligencedto.RankedTrack {
	affinity := dnaAffinityMap(dna)
	unique := map[string]mediadto.MediaItemRequest{}
	for _, item := range candidates {
		if strings.TrimSpace(item.SourceID) == "" {
			continue
		}
		if _, blocked := exclude[item.SourceID]; blocked {
			continue
		}
		if previous, ok := unique[item.SourceID]; !ok || itemMetadataQuality(item) > itemMetadataQuality(previous) {
			unique[item.SourceID] = item
		}
	}
	pool := make([]scoredCandidate, 0, len(unique))
	for _, item := range unique {
		score, reasons := candidateScore(item, plan, affinity)
		pool = append(pool, scoredCandidate{item: item, score: score, reasons: reasons, energy: inferEnergy(item)})
	}
	sort.Slice(pool, func(i, j int) bool { return pool[i].score > pool[j].score })
	targetCount := min(plan.TargetTrackCount, len(pool))
	result := make([]intelligencedto.RankedTrack, 0, targetCount)
	artistUses := map[string]int{}
	elapsed := 0
	for position := 0; position < targetCount && len(pool) > 0; position++ {
		phase := phaseForPosition(plan.Timeline, elapsed)
		targetEnergy := phase.TargetEnergy
		bestIndex, bestAdjusted := 0, -math.MaxFloat64
		for i, candidate := range pool {
			artistPenalty := float64(artistUses[strings.ToLower(candidate.item.Artist)]) * 1.5
			transitionPenalty := math.Abs(candidate.energy-targetEnergy) * 5
			adjusted := candidate.score - artistPenalty - transitionPenalty
			if adjusted > bestAdjusted {
				bestIndex, bestAdjusted = i, adjusted
			}
		}
		chosen := pool[bestIndex]
		pool = slices.Delete(pool, bestIndex, bestIndex+1)
		artistUses[strings.ToLower(chosen.item.Artist)]++
		reason := strings.Join(chosen.reasons, " · ")
		result = append(result, intelligencedto.RankedTrack{
			MediaItem: mediauc.FromRequest(userUUID, chosen.item), Position: position,
			Phase: phase.Key, Score: round2(bestAdjusted), EnergyTarget: targetEnergy,
			Reason: reason, ScheduledMinute: elapsed,
		})
		duration := 210
		if chosen.item.Duration != nil && *chosen.item.Duration > 0 {
			duration = *chosen.item.Duration
		}
		elapsed += max(duration/60, 1)
	}
	return result
}

func (s *Service) persistRankedTracks(ctx context.Context, userUUID, sessionID string, ranked []intelligencedto.RankedTrack, offset int) ([]intelligenceentity.AISessionTrack, error) {
	tracks := make([]intelligenceentity.AISessionTrack, 0, len(ranked))
	for i, item := range ranked {
		saved, err := s.repo.UpsertMediaItem(ctx, item.MediaItem)
		if err != nil {
			return nil, err
		}
		tracks = append(tracks, intelligenceentity.AISessionTrack{
			SessionID: sessionID, MediaItemID: saved.ID, Position: uint32(offset + i),
			Phase: item.Phase, Score: item.Score, EnergyTarget: item.EnergyTarget,
			Reason: item.Reason, ScheduledMinute: uint32(item.ScheduledMinute),
		})
	}
	return tracks, nil
}

type scoredCandidate struct {
	item    mediadto.MediaItemRequest
	score   float64
	reasons []string
	energy  float64
}

func candidateScore(item mediadto.MediaItemRequest, plan intelligencedto.JourneyPlan, affinity map[string]float64) (float64, []string) {
	score := 1.0
	reasons := []string{}
	add := func(kind, value, label string, weight float64) {
		if strings.TrimSpace(value) == "" {
			return
		}
		if valueScore := affinity[kind+":"+strings.ToLower(value)]; valueScore != 0 {
			score += valueScore * weight
			reasons = append(reasons, label)
		}
	}
	add("genre", item.Genre, "Hợp thể loại trong DNA", .45)
	add("artist", item.Artist, "Nghệ sĩ hợp gu", .25)
	add("mood", item.Mood, "Đúng mood", .4)
	add("musical_key", item.MusicalKey, "Key quen thuộc", .1)
	for _, genre := range plan.Genres {
		if containsFold(item.Genre+" "+item.Tags+" "+item.Title, genre) {
			score += 3
			reasons = append(reasons, "Khớp "+genre)
			break
		}
	}
	for _, mood := range plan.Moods {
		if containsFold(item.Mood+" "+item.Tags+" "+item.Title, mood) {
			score += 2
			reasons = append(reasons, "Mood "+mood)
			break
		}
	}
	if plan.Instrumental != nil && item.IsInstrumental != nil {
		if *plan.Instrumental == *item.IsInstrumental {
			score += 1.5
			reasons = append(reasons, "Đúng yêu cầu vocal")
		} else {
			score -= 3
		}
	}
	if plan.VocalGender != "" && strings.EqualFold(plan.VocalGender, item.VocalGender) {
		score += 1.5
		reasons = append(reasons, "Đúng loại vocal")
	}
	if item.ViewCount < 1000 {
		score += plan.DiscoveryLevel * 2
		reasons = append(reasons, "Hidden gem")
	} else {
		score += math.Log10(float64(max(item.ViewCount, 1))) * (1 - plan.DiscoveryLevel) * .25
	}
	score += math.Log1p(float64(item.LikeCount+item.RepostCount*2)) * .1
	if len(reasons) == 0 {
		reasons = append(reasons, "Khám phá mới phù hợp hành trình")
	}
	return score, reasons
}

func groupDNAInsights(dna []intelligenceentity.DNADimension, limit int) map[string][]intelligencedto.DNAInsight {
	result := map[string][]intelligencedto.DNAInsight{}
	for _, item := range dna {
		if len(result[item.DimensionType]) >= limit {
			continue
		}
		completion := 0.0
		if item.PlayCount > 0 {
			completion = item.CompletionSum / float64(item.PlayCount)
		}
		result[item.DimensionType] = append(result[item.DimensionType], intelligencedto.DNAInsight{
			Value: item.DimensionValue, Affinity: round2(item.PositiveScore - item.NegativeScore),
			PlayCount: item.PlayCount, CompletionRate: round2(completion),
			SkipRate: round2(float64(item.SkipCount) / float64(max(item.PlayCount+item.SkipCount, 1)) * 100),
		})
	}
	return result
}

func journeyNarrative(top map[string][]intelligencedto.DNAInsight) (string, string) {
	genres := top["genre"]
	moods := top["mood"]
	if len(genres) > 0 {
		trend := "Gần đây bạn nghe nhiều " + genres[0].Value
		if len(moods) > 0 {
			trend += " với mood " + moods[0].Value
		}
		suggestion := "Thử một nhánh gần " + adjacentGenre(genres[0].Value) + " để mở rộng gu mà không bị quá xa lạ."
		return trend + ".", suggestion
	}
	return "DNA đang được hình thành từ những phiên nghe đầu tiên.", "Tiếp tục nghe, like và skip tự nhiên để radio hiểu bạn nhanh hơn."
}

func topPositiveDimensions(dna []intelligenceentity.DNADimension, limit int) []intelligenceentity.DNADimension {
	items := append([]intelligenceentity.DNADimension(nil), dna...)
	sort.Slice(items, func(i, j int) bool {
		return items[i].PositiveScore-items[i].NegativeScore > items[j].PositiveScore-items[j].NegativeScore
	})
	if len(items) > limit {
		items = items[:limit]
	}
	return items
}

func discoveryQueries(dna []intelligenceentity.DNADimension) []string {
	genres, moods, artists := []string{}, []string{}, []string{}
	for _, item := range dna {
		switch item.DimensionType {
		case "genre":
			genres = appendUnique(genres, item.DimensionValue)
		case "mood":
			moods = appendUnique(moods, item.DimensionValue)
		case "artist":
			artists = appendUnique(artists, item.DimensionValue)
		}
	}
	queries := []string{}
	for _, genre := range genres[:min(len(genres), 2)] {
		queries = append(queries, genre+" hidden gems", genre+" emerging artists")
	}
	if len(genres) > 0 && len(moods) > 0 {
		queries = append(queries, genres[0]+" "+moods[0])
	}
	if len(artists) > 0 {
		queries = append(queries, "artists like "+artists[0])
	}
	if len(queries) == 0 {
		queries = []string{"indie hidden gems", "dream pop discovery", "lofi emerging artists"}
	}
	return queries
}

func intersectDNA(a, b []intelligenceentity.DNADimension) []intelligenceentity.DNADimension {
	right := map[string]intelligenceentity.DNADimension{}
	for _, item := range b {
		right[item.DimensionType+":"+strings.ToLower(item.DimensionValue)] = item
	}
	result := []intelligenceentity.DNADimension{}
	for _, left := range a {
		if match, ok := right[left.DimensionType+":"+strings.ToLower(left.DimensionValue)]; ok {
			left.PositiveScore = math.Min(left.PositiveScore, match.PositiveScore)
			left.NegativeScore = math.Max(left.NegativeScore, match.NegativeScore)
			left.PlayCount = min(left.PlayCount, match.PlayCount)
			result = append(result, left)
		}
	}
	if len(result) == 0 {
		result = append(result, a[:min(5, len(a))]...)
		result = append(result, b[:min(5, len(b))]...)
	}
	return result
}

func detectActivity(value string) string {
	patterns := []struct {
		key   string
		words []string
	}{
		{"coding", []string{"code", "coding", "lap trinh", "làm việc", "lam viec", "đi làm", "di lam", "focus", "tập trung"}},
		{"night_drive", []string{"lái xe", "lai xe", "driving", "drive", "ban đêm", "ban dem", "đà lạt", "da lat"}},
		{"workout", []string{"gym", "workout", "chạy bộ", "chay bo", "tập luyện", "tap luyen"}},
		{"sleep", []string{"ngủ", "ngu", "sleep", "ru ngủ", "ru ngu"}},
		{"study", []string{"học", "hoc", "study", "đọc sách", "doc sach"}},
		{"party", []string{"party", "tiệc", "tiec", "quẩy", "quay"}},
		{"relax", []string{"thư giãn", "thu gian", "relax", "nghỉ ngơi", "nghi ngoi"}},
	}
	for _, pattern := range patterns {
		for _, word := range pattern.words {
			if strings.Contains(value, word) {
				return pattern.key
			}
		}
	}
	return "free_listening"
}

func detectMoods(value string) []string {
	patterns := map[string][]string{
		"sad":       {"buồn", "buon", "sad", "melancholy", "cô đơn", "co don"},
		"stress":    {"stress", "mệt", "met", "kiệt sức", "kiet suc", "áp lực", "ap luc"},
		"happy":     {"vui", "happy", "hạnh phúc", "hanh phuc"},
		"calm":      {"nhẹ", "nhe", "calm", "relax", "êm", "chill"},
		"dreamy":    {"dreamy", "mơ màng", "mo mang", "đà lạt", "da lat", "night"},
		"energetic": {"năng lượng", "nang luong", "energetic", "upbeat", "quẩy", "quay"},
		"romantic":  {"lãng mạn", "lang man", "romantic", "love"},
		"focus":     {"focus", "tập trung", "tap trung", "code", "study"},
	}
	result := []string{}
	for mood, words := range patterns {
		for _, word := range words {
			if strings.Contains(value, word) {
				result = appendUnique(result, mood)
				break
			}
		}
	}
	return result
}

func detectGenres(value string) []string {
	genres := []string{"Chill Pop", "Dream Pop", "Pop Rock", "Indie", "EDM", "Rock", "Lofi", "Piano", "Ambient", "Jazz", "Classical", "Hip-Hop", "R&B", "Anime", "House", "Techno"}
	result := []string{}
	for _, genre := range genres {
		if containsFold(value, genre) {
			result = append(result, genre)
		}
	}
	if strings.Contains(value, "onerepublic") {
		result = appendUnique(result, "Pop Rock")
	}
	return result
}

func detectVocalConstraints(value string) (*bool, string) {
	if strings.Contains(value, "không lời") || strings.Contains(value, "khong loi") || strings.Contains(value, "instrumental") {
		result := true
		return &result, ""
	}
	if strings.Contains(value, "vocal nữ") || strings.Contains(value, "vocal nu") || strings.Contains(value, "female vocal") || strings.Contains(value, "giọng nữ") {
		result := false
		return &result, "female"
	}
	if strings.Contains(value, "vocal nam") || strings.Contains(value, "male vocal") || strings.Contains(value, "giọng nam") {
		result := false
		return &result, "male"
	}
	return nil, ""
}

func parseDuration(value string) int {
	hourPattern := regexp.MustCompile(`(\d+)\s*(gio|hour|hours|h)\b`)
	if match := hourPattern.FindStringSubmatch(value); len(match) > 1 {
		hours, _ := strconv.Atoi(match[1])
		return hours * 60
	}
	minutePattern := regexp.MustCompile(`(\d+)\s*(phut|minute|minutes|min)\b`)
	if match := minutePattern.FindStringSubmatch(value); len(match) > 1 {
		minutes, _ := strconv.Atoi(match[1])
		return minutes
	}
	return 0
}

func energyArc(activity string, moods []string, mode string) (float64, float64, float64) {
	start, peak, end := .35, .72, .5
	if slices.Contains(moods, "sad") || slices.Contains(moods, "stress") {
		start, peak, end = .22, .72, .68
	}
	switch activity {
	case "coding", "study":
		start, peak, end = .3, .58, .38
	case "sleep":
		start, peak, end = .25, .2, .1
	case "workout", "party":
		start, peak, end = .62, .95, .7
	case "night_drive":
		start, peak, end = .32, .7, .48
	}
	if mode == "radio" {
		end = start
	}
	return start, peak, end
}

func buildTimeline(duration int, start, peak, end float64) []intelligencedto.TimelinePhase {
	a := max(int(float64(duration)*.2), 3)
	b := max(int(float64(duration)*.55), a+3)
	c := max(int(float64(duration)*.8), b+3)
	return []intelligencedto.TimelinePhase{
		{Key: "warmup", Label: "Khởi động", FromMinute: 0, ToMinute: a, TargetEnergy: start, Description: "Vào mood nhẹ nhàng"},
		{Key: "build", Label: "Tăng năng lượng", FromMinute: a, ToMinute: b, TargetEnergy: (start + peak) / 2, Description: "Tăng nhịp mượt mà"},
		{Key: "peak", Label: "Peak", FromMinute: b, ToMinute: c, TargetEnergy: peak, Description: "Điểm cao trào của hành trình"},
		{Key: "cooldown", Label: "Cool down", FromMinute: c, ToMinute: duration, TargetEnergy: end, Description: "Kết lại cân bằng"},
	}
}

func buildSearchQueries(genres, moods []string, activity, era, country string, instrumental *bool, vocalGender string) []string {
	queries := []string{}

	// Only use activity as suffix when it carries real meaning.
	suffix := ""
	if activity != "free_listening" {
		suffix = strings.ReplaceAll(activity, "_", " ")
	}

	// Build modifiers appended to every query.
	modifiers := ""
	if era != "" {
		modifiers += " " + era
	}
	if country != "" {
		modifiers += " " + country
	}
	if instrumental != nil && *instrumental {
		modifiers += " instrumental"
	}
	if vocalGender != "" {
		modifiers += " " + vocalGender + " vocal"
	}

	for _, genre := range genres[:min(3, len(genres))] {
		for _, mood := range moods[:min(2, len(moods))] {
			query := strings.TrimSpace(genre + " " + mood + " " + suffix + modifiers)
			queries = appendUnique(queries, query)
		}
		// One query per genre without mood, keeps results broad.
		queries = appendUnique(queries, strings.TrimSpace(genre+modifiers))
	}
	if len(queries) < 4 && era != "" {
		queries = appendUnique(queries, strings.TrimSpace(strings.Join(genres[:min(2, len(genres))], " ")+modifiers))
	}
	return queries[:min(10, len(queries))]
}

func detectEra(value string) string {
	patterns := []struct {
		era   string
		words []string
	}{
		{"80s", []string{"80s", "thap nien 80", "thập niên 80", "nam 80", "năm 80", "1980"}},
		{"90s", []string{"90s", "thap nien 90", "thập niên 90", "nam 90", "năm 90", "1990"}},
		{"70s", []string{"70s", "thap nien 70", "thập niên 70", "nam 70", "năm 70", "1970"}},
		{"2000s", []string{"2000s", "thap nien 2000", "thập niên 2000", "nam 2000", "năm 2000"}},
		{"2010s", []string{"2010s", "thap nien 2010", "thập niên 2010"}},
		{"classic", []string{"classic", "co dien", "cổ điển", "xua", "xưa", "cu", "cũ"}},
		{"retro", []string{"retro", "vintage"}},
	}
	for _, p := range patterns {
		for _, w := range p.words {
			if strings.Contains(value, w) {
				return p.era
			}
		}
	}
	return ""
}

func detectCountry(value string) string {
	patterns := []struct {
		country string
		words   []string
	}{
		{"vietnamese", []string{"viet nam", "việt nam", "vpop", "v-pop", "nhac viet", "nhạc việt", "bolero", "nhac vang", "nhạc vàng", "tru tinh", "trữ tình"}},
		{"korean", []string{"kpop", "k-pop", "korean", "han quoc", "hàn quốc"}},
		{"japanese", []string{"jpop", "j-pop", "japanese", "nhat ban", "nhật bản", "anime"}},
		{"chinese", []string{"cpop", "c-pop", "chinese", "trung quoc", "trung quốc", "mandarin", "cantonese"}},
		{"latin", []string{"latin", "latino", "spanish", "tay ban nha"}},
	}
	for _, p := range patterns {
		for _, w := range p.words {
			if strings.Contains(value, w) {
				return p.country
			}
		}
	}
	return ""
}

func dnaAffinityMap(dna []intelligenceentity.DNADimension) map[string]float64 {
	result := map[string]float64{}
	maxScore := 1.0
	for _, item := range dna {
		score := item.PositiveScore - item.NegativeScore
		maxScore = math.Max(maxScore, math.Abs(score))
		result[item.DimensionType+":"+strings.ToLower(item.DimensionValue)] = score
	}
	for key, value := range result {
		result[key] = value / maxScore
	}
	return result
}

func phaseForPosition(phases []intelligencedto.TimelinePhase, minute int) intelligencedto.TimelinePhase {
	for _, phase := range phases {
		if minute >= phase.FromMinute && minute < phase.ToMinute {
			return phase
		}
	}
	if len(phases) > 0 {
		return phases[len(phases)-1]
	}
	return intelligencedto.TimelinePhase{Key: "journey", Label: "Hành trình", TargetEnergy: .5}
}

func inferEnergy(item mediadto.MediaItemRequest) float64 {
	if item.Energy != nil {
		return clamp(*item.Energy, 0, 1)
	}
	if item.Tempo != nil {
		return clamp((*item.Tempo-60)/100, .1, .95)
	}
	value := normalizeText(item.Genre + " " + item.Mood + " " + item.Tags + " " + item.Title)
	high := []string{"edm", "techno", "house", "metal", "workout", "upbeat", "energetic", "dance"}
	low := []string{"ambient", "piano", "lofi", "calm", "sleep", "acoustic", "sad", "chill"}
	for _, token := range high {
		if strings.Contains(value, token) {
			return .8
		}
	}
	for _, token := range low {
		if strings.Contains(value, token) {
			return .3
		}
	}
	return .55
}

func queueIsHighEnergy(items []mediadto.MediaItemRequest) bool {
	if len(items) == 0 {
		return false
	}
	var total float64
	for _, item := range items {
		total += inferEnergy(item)
	}
	return total/float64(len(items)) >= .68
}

func explorationLevel(dna []intelligenceentity.DNADimension) float64 {
	if len(dna) < 5 {
		return .7
	}
	var positive, negative float64
	for _, item := range dna {
		positive += item.PositiveScore
		negative += item.NegativeScore
	}
	if positive+negative == 0 {
		return .5
	}
	return clamp(.35+(positive/(positive+negative))*.35, .25, .8)
}

func normalizeText(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	replacer := strings.NewReplacer(
		"à", "a", "á", "a", "ạ", "a", "ả", "a", "ã", "a",
		"â", "a", "ầ", "a", "ấ", "a", "ậ", "a", "ẩ", "a", "ẫ", "a",
		"ă", "a", "ằ", "a", "ắ", "a", "ặ", "a", "ẳ", "a", "ẵ", "a",
		"è", "e", "é", "e", "ẹ", "e", "ẻ", "e", "ẽ", "e",
		"ê", "e", "ề", "e", "ế", "e", "ệ", "e", "ể", "e", "ễ", "e",
		"ì", "i", "í", "i", "ị", "i", "ỉ", "i", "ĩ", "i",
		"ò", "o", "ó", "o", "ọ", "o", "ỏ", "o", "õ", "o",
		"ô", "o", "ồ", "o", "ố", "o", "ộ", "o", "ổ", "o", "ỗ", "o",
		"ơ", "o", "ờ", "o", "ớ", "o", "ợ", "o", "ở", "o", "ỡ", "o",
		"ù", "u", "ú", "u", "ụ", "u", "ủ", "u", "ũ", "u",
		"ư", "u", "ừ", "u", "ứ", "u", "ự", "u", "ử", "u", "ữ", "u",
		"ỳ", "y", "ý", "y", "ỵ", "y", "ỷ", "y", "ỹ", "y", "đ", "d",
	)
	return strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || unicode.IsSpace(r) {
			return r
		}
		return ' '
	}, replacer.Replace(value))
}

func sessionTitle(plan intelligencedto.JourneyPlan, mode string) string {
	prefix := map[string]string{"radio": "Personal Radio", "dynamic": "Dynamic Mix", "remix": "Remix Journey", "chat": "Music Conversation"}[mode]
	if prefix == "" {
		prefix = "AI DJ"
	}
	return fmt.Sprintf("%s · %s", prefix, strings.Join(plan.Moods[:min(2, len(plan.Moods))], " + "))
}

func assistantMessage(plan intelligencedto.JourneyPlan, mode string) string {
	genres := strings.Join(plan.Genres, " & ")
	moods := ""
	if len(plan.Moods) > 0 {
		moods = strings.Join(plan.Moods[:min(2, len(plan.Moods))], " + ")
	}
	peakE := plan.EnergyCurve[min(1, len(plan.EnergyCurve)-1)].Energy * 100
	templates := []string{
		fmt.Sprintf("Sẵn rồi — nhạc %s, mood %s, năng lượng leo dần lên peak %.0f%%.", genres, moods, peakE),
		fmt.Sprintf("Mình đã dựng hành trình %s cho bạn — bắt đầu nhẹ rồi leo lên %.0f%% năng lượng.", genres, peakE),
		fmt.Sprintf("Xong! Playlist %s mood %s đang chờ bạn.", genres, moods),
	}
	return templates[plan.TargetTrackCount%len(templates)]
}

func defaultMoodForActivity(activity string) string {
	result := map[string]string{
		"coding": "focus", "study": "focus", "sleep": "calm", "workout": "energetic",
		"party": "happy", "night_drive": "dreamy", "relax": "calm",
	}[activity]
	if result == "" {
		return "balanced"
	}
	return result
}

func itemMetadataQuality(item mediadto.MediaItemRequest) int {
	score := 0
	for _, value := range []string{item.Genre, item.Mood, item.MusicalKey, item.Tags, item.Artist} {
		if value != "" {
			score++
		}
	}
	if item.Tempo != nil {
		score++
	}
	return score
}

func appendUnique(values []string, value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return values
	}
	for _, existing := range values {
		if strings.EqualFold(existing, value) {
			return values
		}
	}
	return append(values, value)
}

func containsFold(haystack, needle string) bool {
	return strings.Contains(normalizeText(haystack), normalizeText(needle))
}

func equalFoldNonEmpty(a, b string) bool {
	return strings.TrimSpace(a) != "" && strings.EqualFold(strings.TrimSpace(a), strings.TrimSpace(b))
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func energyLabel(value float64) string {
	switch {
	case value < .35:
		return "thấp và thư giãn"
	case value < .7:
		return "vừa phải"
	default:
		return "cao và giàu động lực"
	}
}

func tempoLabel(value float64) string {
	switch {
	case value < 85:
		return "chậm"
	case value < 125:
		return "trung bình"
	default:
		return "nhanh"
	}
}

func listeningTip(energy float64, instrumental *bool) string {
	if instrumental != nil && *instrumental {
		return "Hợp cho một phiên tập trung sâu hoặc đọc sách."
	}
	if energy > .7 {
		return "Đặt ở đoạn build hoặc peak của playlist."
	}
	if energy < .35 {
		return "Đặt ở phần warmup hoặc cool down."
	}
	return "Một track nối nhịp tốt ở giữa hành trình."
}

func transitionNote(a, b mediadto.MediaItemRequest) string {
	diff := inferEnergy(b) - inferEnergy(a)
	switch {
	case diff > .2:
		return "Chuyển từ A sang B sẽ tạo một cú nâng năng lượng rõ."
	case diff < -.2:
		return "B phù hợp làm nhịp nghỉ sau A."
	default:
		return "Hai bài có thể nối mượt trong cùng một phase."
	}
}

func albumEnergyJourney(tracks []mediadto.MediaItemRequest) string {
	if len(tracks) < 2 {
		return "Một lát cắt ngắn, năng lượng tập trung."
	}
	first, last := inferEnergy(tracks[0]), inferEnergy(tracks[len(tracks)-1])
	if last-first > .15 {
		return "Năng lượng tăng dần về cuối."
	}
	if first-last > .15 {
		return "Mở mạnh và hạ dần để kết."
	}
	return "Năng lượng cân bằng xuyên suốt."
}

func topStringCount(values map[string]int) string {
	best, count := "", 0
	for value, current := range values {
		if current > count {
			best, count = value, current
		}
	}
	return best
}

func adjacentGenre(value string) string {
	mapping := map[string]string{
		"chill pop": "Dream Pop", "pop": "Indie Pop", "edm": "Melodic House",
		"rock": "Alternative", "lofi": "Ambient Jazz", "anime": "Piano Covers",
		"hip-hop": "Neo Soul", "classical": "Modern Classical",
	}
	if result := mapping[strings.ToLower(value)]; result != "" {
		return result
	}
	return value + " độc lập"
}

func sessionEstimate(events []event.ListeningEvent) int {
	if len(events) == 0 {
		return 0
	}
	sorted := append([]event.ListeningEvent(nil), events...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].OccurredAt.Before(sorted[j].OccurredAt) })
	sessions := 1
	for i := 1; i < len(sorted); i++ {
		if sorted[i].OccurredAt.Sub(sorted[i-1].OccurredAt) > 30*time.Minute {
			sessions++
		}
	}
	return sessions
}

func weekdayName(day int) string {
	names := []string{"Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"}
	if day < 0 || day >= len(names) {
		return "một ngày gần đây"
	}
	return names[day]
}

func dynamicTimeHint(now time.Time) string {
	switch hour := now.Hour(); {
	case hour < 6:
		return "Đang là đêm muộn: ưu tiên calm, ambient và năng lượng giảm dần."
	case hour < 10:
		return "Đang là buổi sáng: bắt đầu nhẹ rồi tăng năng lượng để khởi động ngày mới."
	case hour < 14:
		return "Đang là buổi trưa: giữ nhịp vừa phải, sáng sủa và không quá gắt."
	case hour < 18:
		return "Đang là buổi chiều: ưu tiên focus và một nhịp nghỉ sau giai đoạn tập trung."
	case hour < 22:
		return "Đang là buổi tối: ưu tiên thư giãn, khám phá và chuyển động mượt."
	default:
		return "Đang là ban đêm: ưu tiên dreamy, chill và cool down."
	}
}

func topCountKeys(values map[string]int, limit int) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(i, j int) bool { return values[keys[i]] > values[keys[j]] })
	if len(keys) > limit {
		keys = keys[:limit]
	}
	return keys
}

func dedupeMedia(items []media.MediaItem) []media.MediaItem {
	seen := map[string]struct{}{}
	result := make([]media.MediaItem, 0, len(items))
	for _, item := range items {
		if _, ok := seen[item.SourceID]; ok {
			continue
		}
		seen[item.SourceID] = struct{}{}
		result = append(result, item)
	}
	return result
}

func randomInviteCode() string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	result := make([]byte, 8)
	for i := range result {
		result[i] = alphabet[rand.IntN(len(alphabet))]
	}
	return string(result)
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}
