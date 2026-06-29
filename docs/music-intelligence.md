# Music Intelligence

Music Intelligence is the shared engine behind AI DJ, Personal Radio, Smart
Queue, discovery, insights and social listening. It deliberately separates:

- intent planning (LLM-compatible, with a deterministic Vietnamese/English fallback);
- Audius retrieval (frontend, so only real playable tracks enter the system);
- DNA ranking and DJ sequencing (backend);
- feedback learning (play, skip, complete, like, repeat);
- presentation (AI Music workspace in `MusicPage`).

## End-to-end flow

1. `POST /api/v1/music/ai/sessions` turns a natural-language prompt into a
   structured journey plan and multiple Audius search queries.
2. The frontend searches Audius in parallel and removes duplicate source IDs.
3. `POST /api/v1/music/ai/sessions/:id/candidates` ranks real candidates against
   multi-dimensional Listening DNA and sequences them along the energy curve.
4. The player attaches the AI session, recommendation reason and previous track
   to every listening event.
5. When an intelligent queue has three tracks left, Smart Queue retrieves and
   ranks another window automatically.

The radio therefore has no fixed end and keeps learning from natural playback
behavior.

## Feature mapping

| Product feature | Implementation |
| --- | --- |
| AI DJ, Chat with Music, Mood Detection | AI session planner and chat adjustment |
| Music Journey, Heatmap | `/insights/journey`, `/insights/heatmap` |
| Smart Queue, Personal Radio | `/smart-queue`, `/radio`, automatic queue refill |
| Playlist Generator, Timeline | journey plan, four energy phases, persisted ordered tracks |
| AI Discover, Hidden Gems | `/discover`, DNA queries, low-view/high-engagement ranking |
| Community Discovery | anonymous aggregate of previous-track transitions |
| Dynamic Playlist | `/dynamic-playlist`, time-of-day planning |
| Explain, Compare, Album Review | `/explain`, `/compare`, `/album-review` |
| Remix Discovery | `/remix-discovery` and multi-query Audius retrieval |
| Listening Challenge | `/challenges`, weekly persisted progress |
| Friend Sync | consent-based invite rooms and DNA intersection ranking |

## Optional model provider

The deterministic planner works without secrets. To enhance intent parsing with
an OpenAI-compatible chat-completions provider, set:

```env
MUSIC_AI_ENDPOINT=https://provider.example/v1/chat/completions
MUSIC_AI_API_KEY=...
MUSIC_AI_MODEL=...
```

The provider may only return the structured journey plan. It never supplies
track IDs; Audius retrieval and backend validation remain authoritative.

## Deployment safety

Migration `004_music_intelligence.sql` is idempotent. `make build-musics`
applies migrations, rebuilds the image, starts the service and verifies every
protected music route reaches authentication. A missing route returns 404 and
fails the deployment gate immediately.
