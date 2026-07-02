import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BoltIcon from "@mui/icons-material/Bolt";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ExploreIcon from "@mui/icons-material/Explore";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import GroupsIcon from "@mui/icons-material/Groups";
import InsightsIcon from "@mui/icons-material/Insights";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RadioIcon from "@mui/icons-material/Radio";
import RefreshIcon from "@mui/icons-material/Refresh";
import SendIcon from "@mui/icons-material/Send";
import TimelineIcon from "@mui/icons-material/Timeline";
import {
    Alert,
    alpha,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    LinearProgress,
    Paper,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { MediaItem } from "@pages/music/types";
import { formatDuration } from "@pages/music/utils";
import {
    addMusicAICandidates,
    chatWithMusic,
    compareMusicTracks,
    createDynamicMusicPlaylist,
    createMusicAISession,
    createMusicSyncRoom,
    discoverMusic,
    explainMusicTrack,
    fromBackendMediaItem,
    getListeningChallenges,
    MAX_MUSIC_CANDIDATES,
    getMusicHeatmap,
    getMusicJourney,
    getMusicSyncRecommendations,
    getRemixDiscoveryQueries,
    joinMusicSyncRoom,
    reviewMusicAlbum,
    startPersonalRadio,
    type AlbumReview,
    type MusicAISessionResponse,
    type MusicDiscovery,
    type MusicSyncRoom,
    type SongComparison,
    type TrackExplanation,
} from "@services/musicBackendService";
import { searchPreferredTracks, toAudioMediaItem } from "@services/musicService";
import { usePlayerStore, type PlaybackContext } from "@store/playerStore";
import { AddToPlaylistButton } from "./AddToPlaylistButton";
import { TrackOptionsButton } from "./TrackOptionsButton";

const PRESETS = [
    "Hôm nay mình đang buồn. Bắt đầu chill và vui dần về cuối.",
    "Playlist lái xe Đà Lạt ban đêm, dreamy và ít bài quá nổi.",
    "Tạo playlist để code Go 4 tiếng, không lời, tempo tăng dần.",
    "Nhạc giống OneRepublic nhưng nhẹ hơn và có nhiều vocal nữ.",
];

type StudioTab = "dj" | "discover" | "insights" | "labs";

const STUDIO_STORAGE_KEY = "music-ai-studio-state-v1";
const DISCOVERY_STORAGE_KEY = "music-ai-discovery-results-v1";

const studioSurfaceSx = {
    bgcolor: (theme: import("@mui/material").Theme) =>
        theme.palette.mode === "light"
            ? alpha(theme.palette.primary.main, 0.035)
            : theme.palette.background.paper,
    border: "1px solid",
    borderColor: (theme: import("@mui/material").Theme) =>
        theme.palette.mode === "light"
            ? alpha(theme.palette.primary.main, 0.14)
            : theme.palette.divider,
    boxShadow: (theme: import("@mui/material").Theme) =>
        theme.palette.mode === "light"
            ? `0 12px 28px ${alpha(theme.palette.primary.main, 0.06)}`
            : "none",
};

interface StoredStudioState {
    tab?: StudioTab;
    prompt?: string;
    followUp?: string;
    session?: MusicAISessionResponse | null;
    remixItems?: MediaItem[];
    syncRoom?: MusicSyncRoom | null;
    inviteCode?: string;
    syncItems?: MediaItem[];
}

export function AIStudioView() {
    const theme = useTheme();
    const [restored] = useState<StoredStudioState>(
        () => readSessionStorage<StoredStudioState>(STUDIO_STORAGE_KEY) ?? {},
    );
    const [tab, setTab] = useState<StudioTab>(restored?.tab ?? "dj");
    const [prompt, setPrompt] = useState(restored?.prompt ?? PRESETS[0]);
    const [followUp, setFollowUp] = useState(restored?.followUp ?? "");
    const [session, setSession] = useState<MusicAISessionResponse | null>(
        restored?.session ?? null,
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [explanation, setExplanation] = useState<TrackExplanation | null>(null);
    const [comparison, setComparison] = useState<SongComparison | null>(null);
    const [albumReview, setAlbumReview] = useState<AlbumReview | null>(null);
    const [remixItems, setRemixItems] = useState<MediaItem[]>(restored?.remixItems ?? []);
    const [syncRoom, setSyncRoom] = useState<MusicSyncRoom | null>(restored?.syncRoom ?? null);
    const [inviteCode, setInviteCode] = useState(restored?.inviteCode ?? "");
    const [syncItems, setSyncItems] = useState<MediaItem[]>(restored?.syncItems ?? []);

    const currentItem = usePlayerStore((state) => state.currentItem);
    const queue = usePlayerStore((state) => state.queue);
    const recentItems = usePlayerStore((state) => state.recentItems);
    const replaceQueue = usePlayerStore((state) => state.replaceQueue);

    useEffect(() => {
        writeSessionStorage(STUDIO_STORAGE_KEY, {
            tab,
            prompt,
            followUp,
            session,
            remixItems,
            syncRoom,
            inviteCode,
            syncItems,
        } satisfies StoredStudioState);
    }, [followUp, inviteCode, prompt, remixItems, session, syncItems, syncRoom, tab]);

    const journeyQuery = useQuery({
        queryKey: ["music", "intelligence", "journey"],
        queryFn: () => getMusicJourney(7),
        enabled: tab === "insights",
        staleTime: 60_000,
    });
    const heatmapQuery = useQuery({
        queryKey: ["music", "intelligence", "heatmap"],
        queryFn: () => getMusicHeatmap(30),
        enabled: tab === "insights",
        staleTime: 60_000,
    });
    const challengesQuery = useQuery({
        queryKey: ["music", "intelligence", "challenges"],
        queryFn: getListeningChallenges,
        enabled: tab === "insights",
        staleTime: 60_000,
    });
    const discoveryQuery = useQuery({
        queryKey: ["music", "intelligence", "discover", currentItem?.sourceId],
        queryFn: () => discoverMusic(currentItem?.sourceId),
        enabled: tab === "discover",
        staleTime: 60_000,
    });

    const timelineItems = useMemo(
        () => session?.tracks?.map((track) => fromBackendMediaItem(track.media_item)) ?? [],
        [session],
    );

    const collectCandidates = async (queries: string[]) => {
        const pages = await Promise.all(
            queries
                .slice(0, 10)
                .map((query) => searchPreferredTracks(query, { limit: 10 })),
        );
        const seen = new Set<string>();
        return pages
            .flat()
            .map(toAudioMediaItem)
            .filter((item) => {
                if (seen.has(item.sourceId)) return false;
                seen.add(item.sourceId);
                return true;
            })
            .slice(0, MAX_MUSIC_CANDIDATES);
    };

    const finalizeSession = async (planned: MusicAISessionResponse) => {
        const candidates = await collectCandidates(planned.plan.search_queries);
        if (!candidates.length) {
            throw new Error("Spotify và Audius chưa trả về ứng viên phù hợp.");
        }
        let result = await addMusicAICandidates(planned.session.id, candidates);

        const targetSeconds = planned.plan.duration_minutes * 60;
        const actualSeconds = (result.tracks ?? []).reduce(
            (sum, t) => sum + (t.media_item.duration ?? 0),
            0,
        );
        if (actualSeconds < targetSeconds * 0.85) {
            const extraCandidates = await collectCandidates(
                planned.plan.search_queries.slice().reverse(),
            );
            const existingIds = new Set((result.tracks ?? []).map((t) => t.media_item.source_id));
            const fresh = extraCandidates.filter((c) => !existingIds.has(c.sourceId));
            if (fresh.length > 0) {
                result = await addMusicAICandidates(planned.session.id, fresh, true);
            }
        }
        return result;
    };

    const generate = async (mode: "dj" | "radio" | "dynamic") => {
        setLoading(true);
        setError("");
        try {
            const planned =
                mode === "radio"
                    ? await startPersonalRadio(prompt)
                    : mode === "dynamic"
                      ? await createDynamicMusicPlaylist(prompt)
                      : await createMusicAISession(prompt, "dj");
            setSession(await finalizeSession(planned));
        } catch (reason) {
            setError(errorMessage(reason));
        } finally {
            setLoading(false);
        }
    };

    const adjustJourney = async () => {
        if (!session || !followUp.trim()) return;
        setLoading(true);
        setError("");
        try {
            const planned = await chatWithMusic(session.session.id, followUp.trim());
            setSession(await finalizeSession(planned));
            setFollowUp("");
        } catch (reason) {
            setError(errorMessage(reason));
        } finally {
            setLoading(false);
        }
    };

    const playItems = (
        items: MediaItem[],
        context: PlaybackContext["context"],
        sourceSession = session,
        customReasons?: Record<string, string>,
    ) => {
        if (!items.length) return;
        const reasons =
            customReasons ??
            Object.fromEntries(
                (sourceSession?.tracks ?? []).map((track) => [
                    track.media_item.source_id,
                    track.reason,
                ]),
            );
        replaceQueue(items, 0, {
            context,
            sessionId: sourceSession?.session.id,
            searchQueries: sourceSession?.plan.search_queries,
            reasons,
            startedAt: Date.now(),
        });
    };

    const explainCurrent = async () => {
        if (!currentItem) return;
        setLoading(true);
        try {
            setExplanation(await explainMusicTrack(currentItem));
        } finally {
            setLoading(false);
        }
    };

    const compareCurrent = async () => {
        if (!currentItem) return;
        const other =
            recentItems.find((item) => item.id !== currentItem.id) ??
            queue.find((item) => item.id !== currentItem.id);
        if (!other) {
            setError("Cần ít nhất hai bài trong lịch sử hoặc queue để so sánh.");
            return;
        }
        setLoading(true);
        try {
            setComparison(await compareMusicTracks(currentItem, other));
        } finally {
            setLoading(false);
        }
    };

    const reviewCurrentAlbum = async () => {
        if (!currentItem) return;
        const albumTracks = queue.filter(
            (item) => item.album?.id && item.album.id === currentItem.album?.id,
        );
        const tracks = albumTracks.length ? albumTracks : queue.slice(0, 20);
        if (!tracks.length) return;
        setLoading(true);
        try {
            setAlbumReview(
                await reviewMusicAlbum(
                    currentItem.album?.name ?? "Danh sách chờ",
                    currentItem.artist,
                    tracks,
                ),
            );
        } finally {
            setLoading(false);
        }
    };

    const findRemixes = async () => {
        if (!currentItem) return;
        setLoading(true);
        try {
            const queries = await getRemixDiscoveryQueries(currentItem);
            setRemixItems((await collectCandidates(queries)).slice(0, 20));
        } finally {
            setLoading(false);
        }
    };

    const createRoom = async () => {
        setSyncRoom(await createMusicSyncRoom());
    };

    const joinRoom = async () => {
        if (!inviteCode.trim()) return;
        setSyncRoom(await joinMusicSyncRoom(inviteCode.trim()));
    };

    const buildFriendMix = async () => {
        if (!syncRoom) return;
        const discovery = await discoverMusic(currentItem?.sourceId);
        const candidates = await collectCandidates(discovery.queries);
        const ranked = await getMusicSyncRecommendations(syncRoom.id, candidates);
        setSyncItems(ranked.map((item) => fromBackendMediaItem(item.media_item)));
    };

    return (
        <Box sx={{ maxWidth: 1180, mx: "auto", pb: 12 }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 3 },
                    mb: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: alpha(theme.palette.primary.main, 0.28),
                    background:
                        theme.palette.mode === "light"
                            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.16)}, ${alpha(theme.palette.background.default, 0.96)} 58%)`
                            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)}, ${alpha(theme.palette.background.paper, 0.96)} 58%)`,
                    boxShadow:
                        theme.palette.mode === "light"
                            ? `0 14px 32px ${alpha(theme.palette.primary.main, 0.08)}`
                            : "none",
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: "primary.main", color: "primary.contrastText" }}>
                        <AutoAwesomeIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="h5" fontWeight={900}>
                            AI Music
                        </Typography>
                        <Typography color="text.secondary" fontSize={13}>
                            DJ riêng học từ Listening DNA, không phát ngẫu nhiên.
                        </Typography>
                    </Box>
                </Stack>
                <Tabs
                    value={tab}
                    onChange={(_, value: StudioTab) => setTab(value)}
                    variant="scrollable"
                    sx={{ mt: 2, minHeight: 38 }}
                >
                    <Tab
                        value="dj"
                        icon={<AutoAwesomeIcon />}
                        iconPosition="start"
                        label="AI DJ & Radio"
                    />
                    <Tab
                        value="discover"
                        icon={<ExploreIcon />}
                        iconPosition="start"
                        label="Discover"
                    />
                    <Tab
                        value="insights"
                        icon={<InsightsIcon />}
                        iconPosition="start"
                        label="Journey"
                    />
                    <Tab
                        value="labs"
                        icon={<LightbulbIcon />}
                        iconPosition="start"
                        label="AI Labs"
                    />
                </Tabs>
            </Paper>

            {error && (
                <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {tab === "dj" && (
                <Stack spacing={2}>
                    <Paper sx={{ ...studioSurfaceSx, p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                        <Typography fontWeight={800} mb={1}>
                            Bạn muốn nghe gì?
                        </Typography>
                        <TextField
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            multiline
                            minRows={3}
                            fullWidth
                            placeholder="Ví dụ: Tạo playlist để code Go 4 tiếng, không lời, tempo tăng dần..."
                        />
                        <Stack direction="row" gap={1} flexWrap="wrap" mt={1.5}>
                            {PRESETS.map((preset, index) => (
                                <Chip
                                    key={preset}
                                    label={`Gợi ý ${index + 1}`}
                                    onClick={() => setPrompt(preset)}
                                />
                            ))}
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1} mt={2}>
                            <Button
                                variant="contained"
                                startIcon={<AutoAwesomeIcon />}
                                onClick={() => generate("dj")}
                                disabled={loading || prompt.trim().length < 2}
                            >
                                AI DJ
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<RadioIcon />}
                                onClick={() => generate("radio")}
                                disabled={loading}
                            >
                                Personal Radio 24/7
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={() => generate("dynamic")}
                                disabled={loading}
                            >
                                Dynamic Playlist
                            </Button>
                            {loading && <CircularProgress size={24} sx={{ alignSelf: "center" }} />}
                        </Stack>
                    </Paper>

                    {session && (
                        <>
                            <Paper
                                sx={{ ...studioSurfaceSx, p: { xs: 2, md: 3 }, borderRadius: 3 }}
                            >
                                <Stack
                                    direction={{ xs: "column", md: "row" }}
                                    justifyContent="space-between"
                                    gap={2}
                                >
                                    <Box>
                                        <Typography variant="h6" fontWeight={900}>
                                            {session.session.title}
                                        </Typography>
                                        <Typography color="text.secondary" mt={0.5}>
                                            {session.session.assistant_message}
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="contained"
                                        startIcon={<PlayArrowIcon />}
                                        onClick={() =>
                                            playItems(
                                                timelineItems,
                                                session.session.mode === "radio"
                                                    ? "radio"
                                                    : session.session.mode === "dynamic"
                                                      ? "dynamic"
                                                      : "ai_dj",
                                            )
                                        }
                                        disabled={!timelineItems.length}
                                    >
                                        Phát hành trình
                                    </Button>
                                </Stack>
                                <Stack direction="row" gap={1} flexWrap="wrap" mt={2}>
                                    {session.plan.moods.map((mood) => (
                                        <Chip
                                            key={mood}
                                            label={mood}
                                            color="primary"
                                            variant="outlined"
                                        />
                                    ))}
                                    {session.plan.genres.map((genre) => (
                                        <Chip key={genre} label={genre} />
                                    ))}
                                    <Chip
                                        label={`${Math.round((session.tracks ?? []).reduce((sum, t) => sum + (t.media_item.duration ?? 0), 0) / 60)} phút`}
                                    />
                                    <Chip
                                        label={`${Math.round(session.plan.discovery_level * 100)}% khám phá`}
                                    />
                                </Stack>
                            </Paper>
                            <TimelineView
                                session={session}
                                onPlay={(item) => {
                                    const index = timelineItems.findIndex(
                                        (entry) => entry.id === item.id,
                                    );
                                    replaceQueue(timelineItems, Math.max(index, 0), {
                                        context:
                                            session.session.mode === "radio" ? "radio" : "ai_dj",
                                        sessionId: session.session.id,
                                        searchQueries: session.plan.search_queries,
                                        reasons: Object.fromEntries(
                                            (session.tracks ?? []).map((track) => [
                                                track.media_item.source_id,
                                                track.reason,
                                            ]),
                                        ),
                                        startedAt: Date.now(),
                                    });
                                }}
                            />
                            <Paper sx={{ ...studioSurfaceSx, p: 2, borderRadius: 3 }}>
                                <Stack direction="row" gap={1}>
                                    <TextField
                                        value={followUp}
                                        onChange={(event) => setFollowUp(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" && !event.shiftKey) {
                                                event.preventDefault();
                                                void adjustJourney();
                                            }
                                        }}
                                        fullWidth
                                        size="small"
                                        placeholder='Nói tiếp: "vui hơn", "thêm vocal nữ", "ít bài nổi hơn"...'
                                    />
                                    <IconButton
                                        color="primary"
                                        onClick={adjustJourney}
                                        disabled={loading || !followUp.trim()}
                                    >
                                        <SendIcon />
                                    </IconButton>
                                </Stack>
                            </Paper>
                        </>
                    )}
                </Stack>
            )}

            {tab === "discover" && (
                <DiscoveryPanel
                    discovery={discoveryQuery.data}
                    loading={discoveryQuery.isLoading}
                    onPlay={(items) => playItems(items, "smart_queue", null)}
                    collectCandidates={collectCandidates}
                />
            )}

            {tab === "insights" && (
                <InsightsPanel
                    journey={journeyQuery.data}
                    heatmap={heatmapQuery.data}
                    challenges={challengesQuery.data}
                    loading={
                        journeyQuery.isLoading ||
                        heatmapQuery.isLoading ||
                        challengesQuery.isLoading
                    }
                />
            )}

            {tab === "labs" && (
                <Stack spacing={2}>
                    <Paper sx={{ ...studioSurfaceSx, p: 2.5, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight={850}>
                            AI Music Explain & Compare
                        </Typography>
                        <Typography color="text.secondary" fontSize={13} mb={2}>
                            {currentItem
                                ? `Đang phân tích: ${currentItem.title}`
                                : "Hãy phát một bài trước."}
                        </Typography>
                        <Stack direction="row" gap={1} flexWrap="wrap">
                            <Button
                                startIcon={<LightbulbIcon />}
                                variant="outlined"
                                onClick={explainCurrent}
                                disabled={!currentItem || loading}
                            >
                                Giải thích bài
                            </Button>
                            <Button
                                startIcon={<CompareArrowsIcon />}
                                variant="outlined"
                                onClick={compareCurrent}
                                disabled={!currentItem || loading}
                            >
                                So sánh
                            </Button>
                            <Button
                                startIcon={<GraphicEqIcon />}
                                variant="outlined"
                                onClick={reviewCurrentAlbum}
                                disabled={!currentItem || loading}
                            >
                                Review album/queue
                            </Button>
                            <Button
                                startIcon={<RefreshIcon />}
                                variant="outlined"
                                onClick={findRemixes}
                                disabled={!currentItem || loading}
                            >
                                Tìm remix
                            </Button>
                        </Stack>
                        {explanation && (
                            <ResultCard
                                title={explanation.summary}
                                lines={[...explanation.highlights, explanation.listening_tip]}
                            />
                        )}
                        {comparison && (
                            <ResultCard
                                title={`${comparison.similarity}% giống nhau`}
                                lines={[
                                    ...comparison.shared_traits,
                                    ...comparison.differences,
                                    comparison.transition_note,
                                ]}
                            />
                        )}
                        {albumReview && (
                            <ResultCard
                                title={albumReview.summary}
                                lines={[
                                    ...albumReview.strengths,
                                    `Nên nghe: ${albumReview.must_listen.join(", ")}`,
                                    albumReview.energy_journey,
                                ]}
                            />
                        )}
                    </Paper>
                    {remixItems.length > 0 && (
                        <TrackGrid
                            title="Remix · Cover · Live · Acoustic"
                            items={remixItems}
                            onPlay={(items) => playItems(items, "smart_queue", null)}
                        />
                    )}
                    <Paper sx={{ ...studioSurfaceSx, p: 2.5, borderRadius: 3 }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                            <GroupsIcon color="primary" />
                            <Typography variant="h6" fontWeight={850}>
                                Friend Sync
                            </Typography>
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                            <Button variant="outlined" onClick={createRoom}>
                                Tạo phòng
                            </Button>
                            <TextField
                                value={inviteCode}
                                onChange={(event) =>
                                    setInviteCode(event.target.value.toUpperCase())
                                }
                                size="small"
                                placeholder="Mã mời"
                            />
                            <Button variant="outlined" onClick={joinRoom}>
                                Tham gia
                            </Button>
                            {syncRoom && (
                                <Button variant="contained" onClick={buildFriendMix}>
                                    Tìm giao điểm
                                </Button>
                            )}
                        </Stack>
                        {syncRoom && (
                            <Alert severity="info" sx={{ mt: 1.5 }}>
                                Mã phòng: <strong>{syncRoom.invite_code}</strong> ·{" "}
                                {syncRoom.status === "active" ? "Đã kết nối" : "Đang chờ bạn bè"}
                            </Alert>
                        )}
                    </Paper>
                    {syncItems.length > 0 && (
                        <TrackGrid
                            title="Playlist hợp gu cả hai"
                            items={syncItems}
                            onPlay={(items) => playItems(items, "friend_sync", null)}
                        />
                    )}
                </Stack>
            )}
        </Box>
    );
}

function TimelineView({
    session,
    onPlay,
}: {
    session: MusicAISessionResponse;
    onPlay: (item: MediaItem) => void;
}) {
    const theme = useTheme();
    const currentItem = usePlayerStore((state) => state.currentItem);

    const actualPhases = useMemo(() => {
        const tracks = session.tracks ?? [];
        let elapsedSeconds = 0;
        const phaseSeconds: Record<string, { from: number; to: number }> = {};
        for (const track of tracks) {
            const key = track.phase;
            const dur = track.media_item.duration ?? 0;
            if (!phaseSeconds[key])
                phaseSeconds[key] = { from: elapsedSeconds, to: elapsedSeconds };
            elapsedSeconds += dur;
            phaseSeconds[key].to = elapsedSeconds;
        }
        return session.plan.timeline.map((phase) => ({
            ...phase,
            from_minute:
                phaseSeconds[phase.key] != null
                    ? Math.floor(phaseSeconds[phase.key].from / 60)
                    : phase.from_minute,
            to_minute:
                phaseSeconds[phase.key] != null
                    ? Math.floor(phaseSeconds[phase.key].to / 60)
                    : phase.to_minute,
        }));
    }, [session.tracks, session.plan.timeline]);

    return (
        <Paper sx={{ ...studioSurfaceSx, p: { xs: 2, md: 3 }, borderRadius: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <TimelineIcon color="primary" />
                <Typography variant="h6" fontWeight={850}>
                    Playlist Timeline
                </Typography>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} gap={1} mb={3}>
                {actualPhases.map((phase) => (
                    <Box
                        key={phase.key}
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: alpha(
                                theme.palette.primary.main,
                                0.08 + phase.target_energy * 0.12,
                            ),
                            borderTop: `3px solid ${alpha(theme.palette.primary.main, 0.35 + phase.target_energy * 0.65)}`,
                        }}
                    >
                        <Typography fontWeight={800} fontSize={13} noWrap>
                            {phase.description}
                        </Typography>
                        <Typography color="text.secondary" fontSize={11} noWrap>
                            {phase.from_minute}–{phase.to_minute}' ·{" "}
                            {Math.round(phase.target_energy * 100)}%
                        </Typography>
                    </Box>
                ))}
            </Stack>
            <Stack divider={<Divider flexItem />}>
                {(session.tracks ?? []).map((track, index) => {
                    const item = fromBackendMediaItem(track.media_item);
                    const active =
                        currentItem?.sourceId === item.sourceId && currentItem.type === item.type;
                    const elapsedSeconds = (session.tracks ?? [])
                        .slice(0, index)
                        .reduce((sum, t) => sum + (t.media_item.duration ?? 0), 0);
                    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
                    return (
                        <Stack
                            key={`${track.position}:${item.id}`}
                            direction="row"
                            alignItems="center"
                            gap={{ xs: 0.75, sm: 1.5 }}
                            px={1}
                            py={1}
                            onClick={() => onPlay(item)}
                            sx={{
                                borderLeft: "3px solid",
                                borderLeftColor: active ? "primary.main" : "transparent",
                                bgcolor: active
                                    ? alpha(theme.palette.primary.main, 0.14)
                                    : "transparent",
                                borderRadius: 1.5,
                                transition: "background-color 160ms ease",
                                cursor: "pointer",
                            }}
                        >
                            <Stack direction="row" alignItems="center" width={42} spacing={0.5}>
                                {active && <GraphicEqIcon color="primary" sx={{ fontSize: 15 }} />}
                                <Typography
                                    color={active ? "primary.main" : "text.secondary"}
                                    fontWeight={active ? 800 : 400}
                                    fontSize={12}
                                >
                                    {elapsedMinutes}'
                                </Typography>
                            </Stack>
                            <Avatar
                                src={item.thumbnail}
                                variant="rounded"
                                sx={{ width: 42, height: 42 }}
                            />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography
                                    noWrap
                                    color={active ? "primary.main" : "text.primary"}
                                    fontWeight={active ? 900 : 750}
                                    fontSize={13}
                                >
                                    {item.title}
                                </Typography>
                                <Typography noWrap color="text.secondary" fontSize={11}>
                                    {item.artist} · {track.reason}
                                </Typography>
                            </Box>
                            <AddToPlaylistButton item={item} alwaysVisible iconVariant="circle" />
                            <Typography
                                color="text.secondary"
                                fontSize={12}
                                sx={{ minWidth: 38, textAlign: "right" }}
                            >
                                {formatDuration(item.duration ?? 0)}
                            </Typography>
                            <TrackOptionsButton item={item} alwaysVisible />
                        </Stack>
                    );
                })}
            </Stack>
        </Paper>
    );
}

function DiscoveryPanel({
    discovery,
    loading,
    onPlay,
    collectCandidates,
}: {
    discovery?: MusicDiscovery;
    loading: boolean;
    onPlay: (items: MediaItem[]) => void;
    collectCandidates: (queries: string[]) => Promise<MediaItem[]>;
}) {
    const [queryItems, setQueryItems] = useState<MediaItem[]>(
        () => readSessionStorage<MediaItem[]>(DISCOVERY_STORAGE_KEY) ?? [],
    );
    const [fetching, setFetching] = useState(false);
    const hidden = discovery?.hidden_gems.map(fromBackendMediaItem) ?? [];
    const community = discovery?.community_next.map(fromBackendMediaItem) ?? [];

    useEffect(() => {
        writeSessionStorage(DISCOVERY_STORAGE_KEY, queryItems);
    }, [queryItems]);

    const fetchDiscoveries = async () => {
        if (!discovery) return;
        setFetching(true);
        try {
            setQueryItems((await collectCandidates(discovery.queries)).slice(0, 30));
        } finally {
            setFetching(false);
        }
    };

    if (loading) return <CenteredLoader />;
    return (
        <Stack spacing={2}>
            <Paper sx={{ ...studioSurfaceSx, p: 2.5, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={850}>
                    AI Discover
                </Typography>
                <Typography color="text.secondary" fontSize={13}>
                    Khám phá dựa trên DNA, không chỉ genre. Mức exploration:{" "}
                    {Math.round((discovery?.exploration_target ?? 0) * 100)}%.
                </Typography>
                <Typography color="text.secondary" fontSize={13} mt={0.5}>
                    Có {discovery?.similar_listener_count ?? 0} người nghe gần đây có giao điểm gu
                    với bạn.
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap" mt={1.5}>
                    {discovery?.because.map((value) => (
                        <Chip key={value} label={`Vì bạn nghe ${value}`} />
                    ))}
                </Stack>
                <Button
                    sx={{ mt: 2 }}
                    variant="contained"
                    startIcon={fetching ? <CircularProgress size={16} /> : <ExploreIcon />}
                    onClick={fetchDiscoveries}
                    disabled={fetching || !discovery}
                >
                    Tìm khám phá mới trên Audius
                </Button>
            </Paper>
            {queryItems.length > 0 && (
                <TrackGrid title="Dành riêng cho DNA của bạn" items={queryItems} onPlay={onPlay} />
            )}
            {hidden.length > 0 && (
                <TrackGrid
                    title="Hidden Gems · dưới 1.000 lượt nghe"
                    items={hidden}
                    onPlay={onPlay}
                />
            )}
            {community.length > 0 && (
                <TrackGrid
                    title="Người nghe bài này thường nghe tiếp"
                    items={community}
                    onPlay={onPlay}
                />
            )}
        </Stack>
    );
}

function InsightsPanel({
    journey,
    heatmap,
    challenges,
    loading,
}: {
    journey?: Awaited<ReturnType<typeof getMusicJourney>>;
    heatmap?: Awaited<ReturnType<typeof getMusicHeatmap>>;
    challenges?: Awaited<ReturnType<typeof getListeningChallenges>>;
    loading: boolean;
}) {
    const theme = useTheme();
    if (loading) return <CenteredLoader />;
    const heatByDayHour = new Map(
        heatmap?.cells.map((cell) => [`${cell.day}:${cell.hour}`, cell.play_count]),
    );
    const maxHeat = Math.max(...(heatmap?.cells.map((cell) => cell.play_count) ?? [1]), 1);
    return (
        <Stack spacing={2}>
            <Paper sx={{ ...studioSurfaceSx, p: 2.5, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={850}>
                    Music Journey · 7 ngày
                </Typography>
                <Typography mt={0.5}>{journey?.recent_trend}</Typography>
                <Alert severity="info" icon={<AutoAwesomeIcon />} sx={{ mt: 1.5 }}>
                    {journey?.suggestion}
                </Alert>
                <Stack direction="row" gap={1.5} flexWrap="wrap" mt={2}>
                    <Metric label="Phiên nghe" value={journey?.total_sessions ?? 0} />
                    <Metric label="Phút nghe" value={journey?.total_minutes ?? 0} />
                    <Metric label="Nghe hết" value={`${journey?.completion_rate ?? 0}%`} />
                    <Metric label="Skip" value={`${journey?.skip_rate ?? 0}%`} />
                </Stack>
                <Stack direction="row" gap={1} flexWrap="wrap" mt={2}>
                    {Object.entries(journey?.top_dimensions ?? {}).flatMap(([type, values]) =>
                        values
                            .slice(0, 3)
                            .map((item) => (
                                <Chip
                                    key={`${type}:${item.value}`}
                                    label={`${type}: ${item.value} · ${item.affinity}`}
                                    variant="outlined"
                                />
                            )),
                    )}
                </Stack>
            </Paper>
            <Paper sx={{ ...studioSurfaceSx, p: 2.5, borderRadius: 3, overflowX: "auto" }}>
                <Typography variant="h6" fontWeight={850}>
                    Heatmap Listening
                </Typography>
                <Typography color="text.secondary" fontSize={13} mb={2}>
                    {heatmap?.insight}
                </Typography>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "70px repeat(24, 14px)",
                        gap: "3px",
                        minWidth: 500,
                    }}
                >
                    {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day, dayIndex) => (
                        <Box key={day} sx={{ display: "contents" }}>
                            <Typography fontSize={11}>{day}</Typography>
                            {Array.from({ length: 24 }, (_, hour) => {
                                const count = heatByDayHour.get(`${dayIndex}:${hour}`) ?? 0;
                                return (
                                    <Tooltip key={hour} title={`${day} ${hour}:00 · ${count} lượt`}>
                                        <Box
                                            sx={{
                                                width: 14,
                                                height: 14,
                                                borderRadius: 0.5,
                                                bgcolor: count
                                                    ? alpha(
                                                          theme.palette.primary.main,
                                                          0.15 + (count / maxHeat) * 0.85,
                                                      )
                                                    : alpha(theme.palette.text.primary, 0.06),
                                            }}
                                        />
                                    </Tooltip>
                                );
                            })}
                        </Box>
                    ))}
                </Box>
            </Paper>
            <Paper sx={{ ...studioSurfaceSx, p: 2.5, borderRadius: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <EmojiEventsIcon color="primary" />
                    <Typography variant="h6" fontWeight={850}>
                        Listening Challenges
                    </Typography>
                </Stack>
                <Stack spacing={1.5}>
                    {challenges?.map((challenge) => (
                        <Box key={challenge.key}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography fontWeight={750}>
                                    {challenge.badge} {challenge.title}
                                </Typography>
                                <Typography color="text.secondary" fontSize={12}>
                                    {challenge.progress}/{challenge.target}
                                </Typography>
                            </Stack>
                            <Typography color="text.secondary" fontSize={11}>
                                {challenge.description}
                            </Typography>
                            <LinearProgress
                                value={Math.min((challenge.progress / challenge.target) * 100, 100)}
                                variant="determinate"
                                sx={{ mt: 0.75, borderRadius: 2 }}
                            />
                        </Box>
                    ))}
                </Stack>
            </Paper>
        </Stack>
    );
}

function TrackGrid({
    title,
    items,
    onPlay,
}: {
    title: string;
    items: MediaItem[];
    onPlay: (items: MediaItem[]) => void;
}) {
    return (
        <Paper sx={{ ...studioSurfaceSx, p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight={850}>
                    {title}
                </Typography>
                <Button size="small" startIcon={<PlayArrowIcon />} onClick={() => onPlay(items)}>
                    Phát tất cả
                </Button>
            </Stack>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                    gap: 1.5,
                }}
            >
                {items.slice(0, 30).map((item) => (
                    <Box
                        key={item.id}
                        onClick={() =>
                            onPlay([item, ...items.filter((other) => other.id !== item.id)])
                        }
                        sx={{ cursor: "pointer", minWidth: 0 }}
                    >
                        <Box
                            component="img"
                            src={item.thumbnail}
                            alt=""
                            sx={{
                                width: "100%",
                                aspectRatio: "1",
                                objectFit: "cover",
                                borderRadius: 2,
                            }}
                        />
                        <Typography noWrap fontWeight={750} fontSize={12} mt={0.75}>
                            {item.title}
                        </Typography>
                        <Typography noWrap color="text.secondary" fontSize={11}>
                            {item.artist}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Paper>
    );
}

function Metric({ label, value }: { label: string; value: string | number }) {
    return (
        <Box sx={{ minWidth: 120 }}>
            <Typography color="text.secondary" fontSize={11}>
                {label}
            </Typography>
            <Typography fontSize={24} fontWeight={900}>
                {value}
            </Typography>
        </Box>
    );
}

function ResultCard({ title, lines }: { title: string; lines: string[] }) {
    return (
        <Alert severity="info" icon={<BoltIcon />} sx={{ mt: 2 }}>
            <Typography fontWeight={800}>{title}</Typography>
            {lines.filter(Boolean).map((line) => (
                <Typography key={line} fontSize={12}>
                    • {line}
                </Typography>
            ))}
        </Alert>
    );
}

function CenteredLoader() {
    return (
        <Box sx={{ display: "grid", placeItems: "center", py: 10 }}>
            <CircularProgress />
        </Box>
    );
}

function errorMessage(reason: unknown) {
    if (reason instanceof Error) return reason.message;
    return "Không thể hoàn tất yêu cầu AI Music.";
}

function readSessionStorage<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
        const value = window.sessionStorage.getItem(key);
        return value ? (JSON.parse(value) as T) : null;
    } catch {
        return null;
    }
}

function writeSessionStorage(key: string, value: unknown) {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage can be unavailable in private mode; mounted state still remains intact.
    }
}
