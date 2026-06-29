package intelligence

import (
	"time"

	mediadto "github.com/tumlumtala/musics-service/internal/module/application/dto/media"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/intelligence"
	"github.com/tumlumtala/musics-service/internal/module/domain/entity/media"
)

type EnergyPoint struct {
	Minute int     `json:"minute"`
	Energy float64 `json:"energy"`
	Label  string  `json:"label"`
}

type TimelinePhase struct {
	Key          string  `json:"key"`
	Label        string  `json:"label"`
	FromMinute   int     `json:"from_minute"`
	ToMinute     int     `json:"to_minute"`
	TargetEnergy float64 `json:"target_energy"`
	Description  string  `json:"description"`
}

type JourneyPlan struct {
	Activity         string          `json:"activity"`
	Moods            []string        `json:"moods"`
	Genres           []string        `json:"genres"`
	DurationMinutes  int             `json:"duration_minutes"`
	TargetTrackCount int             `json:"target_track_count"`
	Instrumental     *bool           `json:"instrumental,omitempty"`
	VocalGender      string          `json:"vocal_gender,omitempty"`
	DiscoveryLevel   float64         `json:"discovery_level"`
	EnergyCurve      []EnergyPoint   `json:"energy_curve"`
	Timeline         []TimelinePhase `json:"timeline"`
	SearchQueries    []string        `json:"search_queries"`
	AvoidRecent      bool            `json:"avoid_recent"`
	DiversifyArtists bool            `json:"diversify_artists"`
}

type CreateSessionRequest struct {
	Prompt          string `json:"prompt" binding:"required,min=2,max=1000"`
	Mode            string `json:"mode" binding:"omitempty,oneof=dj chat radio dynamic remix"`
	DurationMinutes int    `json:"duration_minutes" binding:"omitempty,min=10,max=480"`
}

type AddCandidatesRequest struct {
	Candidates []mediadto.MediaItemRequest `json:"candidates" binding:"required,min=1,max=300,dive"`
	Append     bool                        `json:"append"`
}

type ChatRequest struct {
	Message    string                      `json:"message" binding:"required,min=1,max=1000"`
	Candidates []mediadto.MediaItemRequest `json:"candidates" binding:"max=300,dive"`
}

type SmartQueueRequest struct {
	SessionID       string                      `json:"session_id"`
	ListenedMinutes int                         `json:"listened_minutes" binding:"min=0,max=1440"`
	CurrentQueue    []mediadto.MediaItemRequest `json:"current_queue" binding:"max=100,dive"`
	Candidates      []mediadto.MediaItemRequest `json:"candidates" binding:"required,min=1,max=300,dive"`
}

type TrackExplanationRequest struct {
	Track mediadto.MediaItemRequest `json:"track" binding:"required"`
}

type CompareSongsRequest struct {
	First  mediadto.MediaItemRequest `json:"first" binding:"required"`
	Second mediadto.MediaItemRequest `json:"second" binding:"required"`
}

type AlbumReviewRequest struct {
	Name        string                      `json:"name" binding:"required"`
	Artist      string                      `json:"artist"`
	Description string                      `json:"description"`
	Tracks      []mediadto.MediaItemRequest `json:"tracks" binding:"required,min=1,max=100,dive"`
}

type RemixDiscoveryRequest struct {
	Track mediadto.MediaItemRequest `json:"track" binding:"required"`
}

type SessionResponse struct {
	Session  intelligence.AISession        `json:"session"`
	Plan     JourneyPlan                   `json:"plan"`
	Messages []intelligence.AIMessage      `json:"messages,omitempty"`
	Tracks   []intelligence.AISessionTrack `json:"tracks,omitempty"`
}

type RankedTrack struct {
	MediaItem       media.MediaItem `json:"media_item"`
	Position        int             `json:"position"`
	Phase           string          `json:"phase"`
	Score           float64         `json:"score"`
	EnergyTarget    float64         `json:"energy_target"`
	Reason          string          `json:"reason"`
	ScheduledMinute int             `json:"scheduled_minute"`
}

type JourneySummary struct {
	Days           int                     `json:"days"`
	TotalSessions  int                     `json:"total_sessions"`
	TotalMinutes   int                     `json:"total_minutes"`
	CompletionRate float64                 `json:"completion_rate"`
	SkipRate       float64                 `json:"skip_rate"`
	TopDimensions  map[string][]DNAInsight `json:"top_dimensions"`
	RecentTrend    string                  `json:"recent_trend"`
	Suggestion     string                  `json:"suggestion"`
}

type DNAInsight struct {
	Value          string  `json:"value"`
	Affinity       float64 `json:"affinity"`
	PlayCount      uint32  `json:"play_count"`
	CompletionRate float64 `json:"completion_rate"`
	SkipRate       float64 `json:"skip_rate"`
}

type HeatmapCell struct {
	Day       int `json:"day"`
	Hour      int `json:"hour"`
	PlayCount int `json:"play_count"`
	Minutes   int `json:"minutes"`
}

type HeatmapResponse struct {
	Cells    []HeatmapCell `json:"cells"`
	PeakDay  int           `json:"peak_day"`
	PeakHour int           `json:"peak_hour"`
	Insight  string        `json:"insight"`
}

type DiscoveryResponse struct {
	Queries           []string          `json:"queries"`
	Because           []string          `json:"because"`
	HiddenGems        []media.MediaItem `json:"hidden_gems"`
	CommunityNext     []media.MediaItem `json:"community_next"`
	SimilarListeners  int               `json:"similar_listener_count"`
	ExplorationTarget float64           `json:"exploration_target"`
}

type TrackExplanation struct {
	Summary      string   `json:"summary"`
	Style        string   `json:"style"`
	Energy       string   `json:"energy"`
	Tempo        string   `json:"tempo"`
	Key          string   `json:"key"`
	Highlights   []string `json:"highlights"`
	ListeningTip string   `json:"listening_tip"`
}

type SongComparison struct {
	Similarity     int      `json:"similarity"`
	SharedTraits   []string `json:"shared_traits"`
	Differences    []string `json:"differences"`
	TransitionNote string   `json:"transition_note"`
}

type AlbumReview struct {
	Summary       string   `json:"summary"`
	Strengths     []string `json:"strengths"`
	MustListen    []string `json:"must_listen"`
	Style         string   `json:"style"`
	EnergyJourney string   `json:"energy_journey"`
}

type Challenge struct {
	Key         string     `json:"key"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Progress    int        `json:"progress"`
	Target      int        `json:"target"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	Badge       string     `json:"badge"`
}

type JoinSyncRoomRequest struct {
	InviteCode string `json:"invite_code" binding:"required"`
}

type SyncRecommendationsRequest struct {
	Candidates []mediadto.MediaItemRequest `json:"candidates" binding:"required,min=1,max=300,dive"`
}
