import AddIcon from "@mui/icons-material/Add";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BoltIcon from "@mui/icons-material/Bolt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LockIcon from "@mui/icons-material/Lock";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
    Alert,
    Avatar,
    Box,
    Button,
    InputBase,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Fade,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from "@mui/material";
import { useCurrentUser } from "@hooks/user/useCurrentUser";
import {
    createWordChainRoom,
    createWordChainSocketTicket,
    getWordChainLeaderboard,
    getWordChainRoom,
    joinWordChainRoom,
    leaveWordChainRoom,
    listWordChainRooms,
    type WordChainEntry,
    type WordChainGameMode,
    type WordChainLeaderboardRow,
    type WordChainRoom,
    type WordChainRoomSummary,
} from "@services/wordChainService";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const TURN_SECONDS = 15;

interface ChatMessage {
    id: number;
    senderId: string;
    senderName: string;
    content: string;
    ts: number;
}

const getErrorMessage = (error: unknown) => {
    const response = error as { response?: { data?: { error?: { message?: string } } } };
    return response.response?.data?.error?.message ?? "Có lỗi xảy ra, vui lòng thử lại.";
};

const getErrorStatus = (error: unknown) =>
    (error as { response?: { status?: number } }).response?.status;

export default function WordChainPage() {
    const { user } = useCurrentUser();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const roomId = searchParams.get("room");
    const currentUserId = String(user?.uuid ?? "");

    const [rooms, setRooms] = useState<WordChainRoomSummary[]>([]);
    const [leaderboard, setLeaderboard] = useState<WordChainLeaderboardRow[]>([]);
    const [room, setRoom] = useState<WordChainRoom | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [acceptDelay, setAcceptDelay] = useState(false);
    const acceptDelayTimerRef = useRef<number | null>(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [noticeSeverity, setNoticeSeverity] = useState<"info" | "success" | "error">("info");
    const [word, setWord] = useState("");
    const [remainingMs, setRemainingMs] = useState(TURN_SECONDS * 1000);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [createName, setCreateName] = useState("");
    const [createPassword, setCreatePassword] = useState("");
    const [createMaxPlayers, setCreateMaxPlayers] = useState(4);
    const [createGameMode, setCreateGameMode] = useState<WordChainGameMode>("traditional");
    const [joinTarget, setJoinTarget] = useState<WordChainRoomSummary | null>(null);
    const [joinPassword, setJoinPassword] = useState("");
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);

    const refreshLobby = useCallback(async () => {
        try {
            const [roomRows, scoreRows] = await Promise.all([
                listWordChainRooms(),
                getWordChainLeaderboard(),
            ]);
            setRooms(roomRows);
            setLeaderboard(scoreRows);
            setError("");
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (roomId) return;
        const initial = window.setTimeout(() => void refreshLobby(), 0);
        const timer = window.setInterval(() => void refreshLobby(), 5000);
        return () => {
            window.clearTimeout(initial);
            window.clearInterval(timer);
        };
    }, [refreshLobby, roomId]);

    useEffect(() => {
        if (!roomId) return;
        let disposed = false;
        let reconnectAttempt = 0;
        let stopReconnect = false;

        const connect = async () => {
            try {
                const state = await getWordChainRoom(roomId);
                if (disposed) return;
                setRoom(state);
                const ticket = await createWordChainSocketTicket(roomId);
                if (disposed) return;
                const protocol = window.location.protocol === "https:" ? "wss" : "ws";
                const ws = new WebSocket(
                    `${protocol}://${window.location.host}/ws/word-chain?ticket=${encodeURIComponent(ticket.ticket)}`,
                );
                socketRef.current = ws;
                ws.onopen = () => {
                    reconnectAttempt = 0;
                    setConnected(true);
                    setError("");
                };
                ws.onmessage = (event) => {
                    const message = JSON.parse(event.data) as {
                        type: string;
                        data: WordChainRoom | WordChainEntry | { message?: string; explanation?: string; seconds?: number };
                    };
                    if (
                        message.type === "room_state" ||
                        message.type === "game_started" ||
                        message.type === "game_over"
                    ) {
                        setRoom(message.data as WordChainRoom);
                        setSubmitting(false);
                        if (message.type === "game_started") {
                            setCountdown(null);
                            setNoticeSeverity("info");
                            setNotice("Ván mới đã bắt đầu.");
                        }
                        return;
                    }
                    if (message.type === "countdown") {
                        const seconds = (message.data as { seconds?: number }).seconds ?? 3;
                        setCountdown(seconds);
                        let remaining = seconds;
                        const tick = window.setInterval(() => {
                            remaining -= 1;
                            if (remaining <= 0) {
                                window.clearInterval(tick);
                                setCountdown(null);
                            } else {
                                setCountdown(remaining);
                            }
                        }, 1000);
                        return;
                    }
                    if (message.type === "word_checking") {
                        setSubmitting(true);
                        setNoticeSeverity("info");
                        setNotice("Groq đang kiểm tra nghĩa của cụm từ...");
                        return;
                    }
                    if (message.type === "word_accepted") {
                        const accepted = message.data as WordChainEntry;
                        setWord("");
                        setSubmitting(false);
                        setNoticeSeverity("success");
                        setNotice(`${accepted.word}: ${accepted.explanation}`);
                        // Delay 2s before allowing next input
                        setAcceptDelay(true);
                        if (acceptDelayTimerRef.current) window.clearTimeout(acceptDelayTimerRef.current);
                        acceptDelayTimerRef.current = window.setTimeout(() => {
                            setAcceptDelay(false);
                            acceptDelayTimerRef.current = null;
                        }, 2000);
                        return;
                    }
                    if (message.type === "word_rejected") {
                        const rejected = message.data as { explanation?: string };
                        setSubmitting(false);
                        setNoticeSeverity("error");
                        setNotice(rejected.explanation ?? "Cụm từ chưa được xác nhận.");
                        return;
                    }
                    if (message.type === "player_eliminated") {
                        const eliminated = message.data as { name?: string };
                        setSubmitting(false);
                        setNoticeSeverity("error");
                        setNotice(`${eliminated.name ?? "Một người chơi"} đã bị loại.`);
                        return;
                    }
                    if (message.type === "error") {
                        setSubmitting(false);
                        setError((message.data as { message?: string }).message ?? "Thao tác thất bại.");
                        return;
                    }
                    if (message.type === "kicked" || message.type === "room_closed") {
                        stopReconnect = true;
                        setNotice((message.data as { message?: string }).message ?? "Phòng đã đóng.");
                        navigate("/word-chain", { replace: true });
                    }
                    if (message.type === "chat") {
                        const cm = message.data as { senderId: string; senderName: string; content: string };
                        setChatMessages((prev) => [
                            ...prev,
                            { id: Date.now() + Math.random(), senderId: cm.senderId, senderName: cm.senderName, content: cm.content, ts: Date.now() },
                        ]);
                        return;
                    }
                };
                ws.onclose = () => {
                    if (disposed || stopReconnect) return;
                    setConnected(false);
                    reconnectAttempt++;
                    reconnectTimerRef.current = window.setTimeout(
                        () => void connect(),
                        Math.min(1000 * 2 ** reconnectAttempt, 8000),
                    );
                };
                ws.onerror = () => ws.close();
            } catch (requestError) {
                if (disposed) return;
                const status = getErrorStatus(requestError);
                if (status === 403 || status === 404) {
                    stopReconnect = true;
                    setError("Phòng không còn tồn tại hoặc bạn không còn ở trong phòng.");
                    setLoading(false);
                    navigate("/word-chain", { replace: true });
                    return;
                }
                setError(getErrorMessage(requestError));
                setLoading(false);
                reconnectAttempt++;
                reconnectTimerRef.current = window.setTimeout(
                    () => void connect(),
                    Math.min(1000 * 2 ** reconnectAttempt, 8000),
                );
            } finally {
                if (!disposed) setLoading(false);
            }
        };
        void connect();
        return () => {
            disposed = true;
            if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
            if (acceptDelayTimerRef.current) window.clearTimeout(acceptDelayTimerRef.current);
            socketRef.current?.close();
            socketRef.current = null;
        };
    }, [navigate, roomId]);

    useEffect(() => {
        if (!room?.deadline || room.status !== "playing") return;
        const localDeadline =
            Date.now() +
            Math.max(0, Math.min(room.remainingMs ?? TURN_SECONDS * 1000, TURN_SECONDS * 1000));
        const update = () => setRemainingMs(Math.max(localDeadline - Date.now(), 0));
        const initial = window.setTimeout(update, 0);
        const timer = window.setInterval(update, 100);
        return () => {
            window.clearTimeout(initial);
            window.clearInterval(timer);
        };
    }, [room?.deadline, room?.remainingMs, room?.status]);

    const send = (payload: object) => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) {
            setError("Kết nối đang được khôi phục.");
            return;
        }
        socketRef.current.send(JSON.stringify(payload));
    };

    const handleCreate = async () => {
        if (!createName.trim()) return;
        setSubmitting(true);
        try {
            const created = await createWordChainRoom(
                createName.trim(),
                createPassword,
                createMaxPlayers,
                createGameMode,
            );
            setLoading(true);
            navigate(`/word-chain?room=${created.id}`);
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setSubmitting(false);
        }
    };

    const handleJoin = async () => {
        if (!joinTarget) return;
        setSubmitting(true);
        try {
            await joinWordChainRoom(joinTarget.id, joinPassword);
            setJoinTarget(null);
            setJoinPassword("");
            setLoading(true);
            navigate(`/word-chain?room=${joinTarget.id}`);
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setSubmitting(false);
        }
    };

    if (roomId) {
        return (
            <GameRoom
                room={room}
                currentUserId={currentUserId}
                connected={connected}
                loading={loading}
                error={error}
                notice={notice}
                noticeSeverity={noticeSeverity}
                word={word}
                submitting={submitting}
                acceptDelay={acceptDelay}
                remainingMs={remainingMs}
                countdown={countdown}
                onWordChange={setWord}
                onClearError={() => setError("")}
                onBack={() => {
                    void leaveWordChainRoom(roomId).finally(() => navigate("/word-chain"));
                }}
                onReady={() => send({ type: "ready" })}
                onStart={() => send({ type: "start" })}
                onChangeMode={(mode) => send({ type: "change_mode", word: mode })}
                chatMessages={chatMessages}
                onSendChat={(content) => send({ type: "chat", content })}
                onKick={(userId) => send({ type: "kick", userId })}
                onSubmit={() => {
                    if (!word.trim()) return;
                    setError("");
                    setNotice("");
                    send({ type: "submit", word: word.trim() });
                }}
            />
        );
    }

    return (
        <Box sx={{ maxWidth: 1240, mx: "auto", px: { xs: 1.5, md: 3 }, py: { xs: 2, md: 4 } }}>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 300px" },
                    gap: 3,
                }}
            >
                <Stack spacing={3}>
                    <Box>
                        <Chip icon={<BoltIcon />} label="Đối kháng 2–6 người" color="primary" size="small" />
                        <Typography
                            component="h1"
                            sx={{
                                mt: 1.5,
                                fontSize: { xs: 32, md: 52 },
                                lineHeight: 0.98,
                                letterSpacing: "-0.045em",
                                fontWeight: 900,
                            }}
                        >
                            Nối từ trong 15 giây.
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 580, fontSize: { xs: 15, md: 17 } }}>
                            Tạo phòng truyền thống hoặc mở màn Sáp lá cà tốc độ cao.
                        </Typography>
                    </Box>

                    {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight={800}>Tạo phòng mới</Typography>
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                                gap: 1.5,
                                mt: 2,
                            }}
                        >
                            <TextField
                                label="Tên phòng"
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                                fullWidth
                                inputProps={{ maxLength: 40 }}
                            />
                            <TextField
                                label="Mật khẩu (tùy chọn)"
                                type="password"
                                value={createPassword}
                                onChange={(e) => setCreatePassword(e.target.value)}
                                fullWidth
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start"><LockIcon fontSize="small" /></InputAdornment>
                                    ),
                                }}
                            />
                            <FormControl fullWidth>
                                <InputLabel>Số người tối đa</InputLabel>
                                <Select
                                    label="Số người tối đa"
                                    value={createMaxPlayers}
                                    onChange={(e) => {
                                        const n = Number(e.target.value);
                                        setCreateMaxPlayers(n);
                                        if (n === 2) setCreateGameMode("traditional");
                                    }}
                                >
                                    {[2, 3, 4, 5, 6].map((n) => (
                                        <MenuItem key={n} value={n}>{n} người</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Chế độ chơi</InputLabel>
                                <Select
                                    label="Chế độ chơi"
                                    value={createGameMode}
                                    disabled={createMaxPlayers === 2}
                                    onChange={(e) => setCreateGameMode(e.target.value as WordChainGameMode)}
                                >
                                    <MenuItem value="traditional">Truyền thống · Lần lượt</MenuItem>
                                    <MenuItem value="brawl">Sáp lá cà · Ai nhanh thắng</MenuItem>
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => void handleCreate()}
                                disabled={!createName.trim() || submitting}
                                sx={{ gridColumn: { sm: "1 / -1" }, py: 1.25 }}
                            >
                                Tạo phòng
                            </Button>
                        </Box>
                    </Paper>

                    <Box>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                            <Typography variant="h6" fontWeight={800}>Phòng đang chờ</Typography>
                            <Tooltip title="Làm mới">
                                <IconButton onClick={() => void refreshLobby()}><RefreshIcon /></IconButton>
                            </Tooltip>
                        </Stack>
                        {loading ? (
                            <LobbySkeleton />
                        ) : rooms.length === 0 ? (
                            <Paper
                                variant="outlined"
                                sx={{ p: 5, textAlign: "center", borderRadius: 3, borderStyle: "dashed" }}
                            >
                                <Typography fontWeight={750}>Chưa có phòng đang chờ.</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Bạn có thể trở thành chủ phòng đầu tiên.
                                </Typography>
                            </Paper>
                        ) : (
                            <Stack spacing={1}>
                                {rooms.map((item) => (
                                    <Paper
                                        key={item.id}
                                        variant="outlined"
                                        sx={{
                                            p: { xs: 1.5, sm: 2 },
                                            borderRadius: 2.5,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 2,
                                            "&:hover": { borderColor: "primary.main" },
                                        }}
                                    >
                                        <Avatar sx={{ bgcolor: "primary.main", color: "primary.contrastText", flexShrink: 0 }}>
                                            {item.name.slice(0, 1).toUpperCase()}
                                        </Avatar>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Stack direction="row" spacing={0.75} alignItems="center">
                                                <Typography fontWeight={750} noWrap>{item.name}</Typography>
                                                {item.hasPassword && <LockIcon sx={{ fontSize: 14, color: "text.secondary" }} />}
                                            </Stack>
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                {item.hostName} · {item.playerCount}/{item.maxPlayers} · {item.gameMode === "brawl" ? "Sáp lá cà" : "Truyền thống"}
                                            </Typography>
                                        </Box>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<LoginIcon />}
                                            onClick={() => { setJoinTarget(item); setJoinPassword(""); }}
                                            sx={{ flexShrink: 0 }}
                                        >
                                            Vào
                                        </Button>
                                    </Paper>
                                ))}
                            </Stack>
                        )}
                    </Box>
                </Stack>

                <Leaderboard rows={leaderboard} currentUserId={currentUserId} />
            </Box>

            <Dialog open={Boolean(joinTarget)} onClose={() => setJoinTarget(null)} fullWidth maxWidth="xs">
                <DialogTitle>Vào "{joinTarget?.name}"</DialogTitle>
                <DialogContent>
                    {joinTarget?.hasPassword ? (
                        <TextField
                            autoFocus fullWidth type="password" label="Mật khẩu phòng"
                            value={joinPassword}
                            onChange={(e) => setJoinPassword(e.target.value)}
                            sx={{ mt: 1 }}
                        />
                    ) : (
                        <Typography color="text.secondary">Phòng này không yêu cầu mật khẩu.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" onClick={() => setJoinTarget(null)}>Hủy</Button>
                    <Button variant="contained" onClick={() => void handleJoin()} disabled={submitting}>Vào phòng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ─── GameRoom ────────────────────────────────────────────────────────────────

function GameRoom({
    room, currentUserId, connected, loading, error, notice, noticeSeverity,
    word, submitting, acceptDelay, remainingMs, countdown,
    chatMessages, onSendChat,
    onWordChange, onClearError, onBack, onReady, onStart, onChangeMode, onKick, onSubmit,
}: {
    room: WordChainRoom | null;
    currentUserId: string;
    connected: boolean;
    loading: boolean;
    error: string;
    notice: string;
    noticeSeverity: "info" | "success" | "error";
    word: string;
    submitting: boolean;
    acceptDelay: boolean;
    remainingMs: number;
    countdown: number | null;
    chatMessages: ChatMessage[];
    onSendChat: (content: string) => void;
    onWordChange: (v: string) => void;
    onClearError: () => void;
    onBack: () => void;
    onReady: () => void;
    onStart: () => void;
    onChangeMode: (mode: WordChainGameMode) => void;
    onKick: (userId: string) => void;
    onSubmit: () => void;
}) {
    const theme = useTheme();
    const isHost = room?.hostId === currentUserId;
    const currentPlayer = room?.players.find((p) => p.id === currentUserId);
    const isBrawl = room?.gameMode === "brawl";
    const isMyTurn = Boolean(
        room && currentPlayer && !currentPlayer.eliminated &&
        (isBrawl || room.turnUserId === currentUserId),
    );
    const winner = room?.players.find((p) => p.id === room.winnerId);
    const chain = room?.chain ?? [];
    const latest = chain.at(-1);
    const gameRanking = [...(room?.players ?? [])].sort((a, b) =>
        b.gamePoints - a.gamePoints || b.gameScore - a.gameScore || a.order - b.order,
    );
    const turnProgress = Math.max(0, Math.min(100, (remainingMs / (TURN_SECONDS * 1000)) * 100));
    const wordInputRef = useRef<HTMLInputElement | null>(null);

    // All non-host players ready?
    const nonHostPlayers = room?.players.filter((p) => p.id !== room.hostId) ?? [];
    const allReady = nonHostPlayers.length > 0 && nonHostPlayers.every((p) => p.ready);
    const isReady = currentPlayer?.ready ?? false;

    useEffect(() => {
        if (!isMyTurn || submitting || !connected || room?.status !== "playing") return;
        const frame = window.requestAnimationFrame(() => wordInputRef.current?.focus());
        return () => window.cancelAnimationFrame(frame);
    }, [connected, isMyTurn, room?.status, submitting]);

    if (loading && !room) {
        return <Stack alignItems="center" justifyContent="center" sx={{ minHeight: "60dvh" }}><CircularProgress /></Stack>;
    }
    if (!room) {
        return (
            <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
                <Alert severity="error">{error || "Không tìm thấy phòng."}</Alert>
                <Button onClick={onBack}>Quay lại sảnh</Button>
            </Stack>
        );
    }

    return (
        <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 1, sm: 2, md: 3 }, py: { xs: 1.5, md: 3 }, position: "relative" }}>
            <RoomChatPanel messages={chatMessages} currentUserId={currentUserId} onSend={onSendChat} />
            {/* Countdown overlay */}
            {countdown !== null && (
                <Fade in>
                    <Box
                        sx={{
                            position: "fixed",
                            inset: 0,
                            zIndex: 1400,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: alpha(theme.palette.background.default, 0.88),
                            backdropFilter: "blur(6px)",
                        }}
                    >
                        <Stack alignItems="center" spacing={2}>
                            <Typography
                                sx={{
                                    fontSize: { xs: 96, md: 160 },
                                    fontWeight: 900,
                                    lineHeight: 1,
                                    color: "primary.main",
                                    animation: "pulse 1s ease-in-out infinite",
                                    "@keyframes pulse": {
                                        "0%, 100%": { transform: "scale(1)", opacity: 1 },
                                        "50%": { transform: "scale(1.12)", opacity: 0.8 },
                                    },
                                }}
                            >
                                {countdown}
                            </Typography>
                            <Typography variant="h5" fontWeight={700} color="text.secondary">
                                Chuẩn bị...
                            </Typography>
                        </Stack>
                    </Box>
                </Fade>
            )}

            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: { xs: 1.5, md: 2 } }}>
                <IconButton onClick={onBack} size="small"><ArrowBackIcon /></IconButton>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={850} noWrap sx={{ fontSize: { xs: "0.95rem", md: "1.25rem" } }}>
                        {room.name}
                    </Typography>
                    <Typography variant="caption" color={connected ? "success.main" : "warning.main"}>
                        {connected ? `Kết nối · ${room.id}` : "Đang nối lại..."}
                    </Typography>
                </Box>
                <Chip size="small" color={isBrawl ? "error" : "primary"} label={isBrawl ? "Sáp lá cà" : "Truyền thống"} />
                <Button color="inherit" size="small" startIcon={<LogoutIcon />} onClick={onBack} sx={{ display: { xs: "none", sm: "flex" } }}>
                    Rời
                </Button>
                <IconButton size="small" onClick={onBack} sx={{ display: { xs: "flex", sm: "none" } }}><LogoutIcon fontSize="small" /></IconButton>
            </Stack>

            {error && <Alert severity="error" onClose={onClearError} sx={{ mb: 1.5 }}>{error}</Alert>}

            {/* Main layout */}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "200px minmax(0,1fr) 200px" },
                    gridTemplateRows: { md: "repeat(3, auto)" },
                    gap: { xs: 1.5, md: 2 },
                }}
            >
                {/* Player cards */}
                {Array.from({ length: room.maxPlayers }, (_, slot) => {
                    const p = room.players[slot];
                    const isPlaying = room.status === "playing";
                    const isMe = p?.id === currentUserId;
                    // Traditional: border on whose turn it is
                    const isTurnActive = !isBrawl && p?.id === room.turnUserId && !p?.eliminated && isPlaying;
                    // Brawl: glow on all alive players
                    const isBrawlActive = isBrawl && Boolean(p) && !p?.eliminated && isPlaying;

                    const desktopPositions =
                        room.maxPlayers === 2 ? [[1, 1], [3, 1]]
                        : room.maxPlayers === 3 ? [[1, 1], [1, 3], [3, 1]]
                        : room.maxPlayers === 4 ? [[1, 1], [1, 3], [3, 3], [3, 1]]
                        : room.maxPlayers === 5 ? [[1, 1], [1, 2], [1, 3], [3, 3], [3, 1]]
                        : [[1, 1], [1, 2], [1, 3], [3, 3], [3, 2], [3, 1]];
                    const [col, row] = desktopPositions[slot];

                    return (
                        <Paper
                            key={slot}
                            variant="outlined"
                            sx={{
                                p: { xs: 1.5, md: 2 },
                                borderRadius: 3,
                                textAlign: "center",
                                position: "relative",
                                gridColumn: { xs: slot % 2 === 0 ? 1 : 2, md: col },
                                gridRow: { xs: 2 + Math.floor(slot / 2), md: row },
                                display: { xs: "flex", md: "block" },
                                flexDirection: { xs: "row", md: "unset" },
                                alignItems: { xs: "center", md: "unset" },
                                gap: { xs: 1.5, md: 0 },
                                opacity: p?.eliminated ? 0.5 : 1,
                                // Traditional: solid primary border on active turn
                                borderColor: isTurnActive ? "primary.main" : isMe ? "primary.light" : "divider",
                                borderWidth: isTurnActive ? 2 : isMe ? 1.5 : 1,
                                // Brawl: animated glow on alive players
                                boxShadow: isTurnActive
                                    ? (t) => `0 0 0 2px ${t.palette.primary.main}, 0 8px 28px ${alpha(t.palette.primary.main, 0.25)}`
                                    : isBrawlActive
                                    ? (t) => `0 0 16px 2px ${alpha(t.palette.warning.main, 0.35)}`
                                    : "none",
                                animation: isBrawlActive ? "brawlPulse 2s ease-in-out infinite" : "none",
                                "@keyframes brawlPulse": {
                                    "0%, 100%": { boxShadow: (t: { palette: { warning: { main: string } } }) => `0 0 12px 1px ${alpha(t.palette.warning.main, 0.25)}` },
                                    "50%": { boxShadow: (t: { palette: { warning: { main: string } } }) => `0 0 24px 4px ${alpha(t.palette.warning.main, 0.55)}` },
                                },
                                transition: "border-color 0.2s, box-shadow 0.2s",
                            }}
                        >
                            {/* "Bạn" badge */}
                            {isMe && p && (
                                <Chip
                                    label="Bạn"
                                    size="small"
                                    color="primary"
                                    sx={{
                                        position: "absolute",
                                        top: -10,
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        height: 20,
                                        fontSize: "0.68rem",
                                        fontWeight: 800,
                                        zIndex: 1,
                                    }}
                                />
                            )}
                            {p ? (
                                <>
                                    <Box sx={{ flexShrink: 0, display: { xs: "flex", md: "block" }, alignItems: "center", justifyContent: "center" }}>
                                        <Avatar
                                            sx={{
                                                width: { xs: 40, md: 52 },
                                                height: { xs: 40, md: 52 },
                                                bgcolor: isTurnActive ? "primary.main" : isBrawlActive ? "warning.dark" : "action.selected",
                                                fontWeight: 850,
                                                mx: { md: "auto" },
                                                mt: { md: isMe ? 1 : 0 },
                                            }}
                                        >
                                            {p.name.slice(0, 1).toUpperCase()}
                                        </Avatar>
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: "left", md: "center" } }}>
                                        <Typography fontWeight={800} noWrap sx={{ fontSize: { xs: "0.85rem", md: "1rem" }, mt: { md: 1 } }}>
                                            {p.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {p.id === room.hostId ? "Chủ phòng" : `Lượt ${p.order}`}
                                        </Typography>
                                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent={{ xs: "flex-start", md: "center" }} sx={{ mt: { xs: 0.5, md: 1 } }}>
                                            <Typography sx={{ fontSize: { xs: 18, md: 28 }, fontWeight: 900, lineHeight: 1 }}>
                                                {p.gameScore}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">từ</Typography>
                                            <Typography sx={{ fontSize: { xs: 14, md: 18 }, fontWeight: 850, color: "primary.main", ml: 0.5 }}>
                                                {p.gamePoints ?? 0}đ
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }} justifyContent={{ xs: "flex-start", md: "center" }}>
                                            {p.eliminated && <Chip label="Bị loại" color="error" size="small" />}
                                            {!p.connected && <Chip label="Mất kết" color="warning" size="small" />}
                                            {room.status === "waiting" && !p.eliminated && p.id !== room.hostId && (
                                                <Chip
                                                    label={p.ready ? "Sẵn sàng" : "Chờ..."}
                                                    color={p.ready ? "success" : "default"}
                                                    size="small"
                                                    icon={p.ready ? <CheckCircleIcon /> : undefined}
                                                />
                                            )}
                                            {room.status === "waiting" && p.id === room.hostId && (
                                                <Chip label="Chủ phòng" color="primary" size="small" variant="outlined" />
                                            )}
                                        </Stack>
                                        {isHost && p.id !== currentUserId && (
                                            <Button color="error" size="small" startIcon={<PersonRemoveIcon />} onClick={() => onKick(p.id)} sx={{ mt: 0.5, fontSize: "0.7rem" }}>
                                                Mời ra
                                            </Button>
                                        )}
                                    </Box>
                                </>
                            ) : (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
                                    <Avatar sx={{ width: { xs: 40, md: 52 }, height: { xs: 40, md: 52 }, bgcolor: "action.hover", flexShrink: 0, mx: { md: "auto" } }}>?</Avatar>
                                    <Box sx={{ textAlign: { xs: "left", md: "center" } }}>
                                        <Typography fontWeight={700} variant="body2">Vị trí #{slot + 1}</Typography>
                                        <Typography variant="caption" color="text.secondary">Mã: {room.id}</Typography>
                                    </Box>
                                </Box>
                            )}
                        </Paper>
                    );
                })}

                {/* Center panel */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 3 },
                        borderRadius: 3,
                        gridColumn: { xs: "1 / -1", md: 2 },
                        gridRow: { xs: 1, md: "1 / span 3" },
                        display: "flex",
                        flexDirection: "column",
                        minHeight: { xs: 320, md: 440 },
                    }}
                >
                    {room.status === "waiting" || room.status === "countdown" ? (
                        <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ flex: 1, textAlign: "center" }}>
                            <BoltIcon color="primary" sx={{ fontSize: { xs: 40, md: 52 } }} />
                            <Typography variant="h5" fontWeight={850} sx={{ fontSize: { xs: "1.1rem", md: "1.5rem" } }}>
                                Đấu trường đang chờ
                            </Typography>
                            <Typography color="text.secondary" sx={{ maxWidth: 400, fontSize: { xs: "0.85rem", md: "1rem" } }}>
                                {isBrawl
                                    ? "Từ 3 người có thể bắt đầu. Mọi người cùng tranh đáp án."
                                    : "Từ 2 người có thể bắt đầu. Thứ tự lượt theo thời gian vào phòng."}
                            </Typography>

                            {/* Ready / Start buttons */}
                            {room.status === "waiting" && (
                                <>
                                    {!isHost && (
                                        <Button
                                            variant={isReady ? "outlined" : "contained"}
                                            color={isReady ? "success" : "primary"}
                                            startIcon={isReady ? <CheckCircleIcon /> : undefined}
                                            onClick={onReady}
                                            disabled={!connected}
                                            size="large"
                                            sx={{ minWidth: 180 }}
                                        >
                                            {isReady ? "Đã sẵn sàng" : "Sẵn sàng"}
                                        </Button>
                                    )}
                                    {isHost && (
                                        <Stack spacing={1.5} alignItems="center" sx={{ width: "100%", maxWidth: 280 }}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Chế độ chơi</InputLabel>
                                                <Select
                                                    label="Chế độ chơi"
                                                    value={room.gameMode}
                                                    disabled={room.maxPlayers === 2}
                                                    onChange={(e) => onChangeMode(e.target.value as WordChainGameMode)}
                                                >
                                                    <MenuItem value="traditional">Truyền thống · Lần lượt</MenuItem>
                                                    <MenuItem value="brawl" disabled={room.maxPlayers === 2}>Sáp lá cà · Ai nhanh thắng</MenuItem>
                                                </Select>
                                            </FormControl>
                                            {nonHostPlayers.length > 0 && !allReady && (
                                                <Typography variant="body2" color="text.secondary">
                                                    Đang chờ {nonHostPlayers.filter((p) => !p.ready).length} người sẵn sàng...
                                                </Typography>
                                            )}
                                            <Button
                                                variant="contained"
                                                size="large"
                                                startIcon={<PlayArrowIcon />}
                                                fullWidth
                                                disabled={
                                                    room.players.length < 2 ||
                                                    !connected ||
                                                    (nonHostPlayers.length > 0 && !allReady)
                                                }
                                                onClick={onStart}
                                            >
                                                Bắt đầu ván
                                            </Button>
                                        </Stack>
                                    )}
                                </>
                            )}
                        </Stack>
                    ) : room.status === "finished" ? (
                        <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ flex: 1, textAlign: "center" }}>
                            <EmojiEventsIcon color="warning" sx={{ fontSize: { xs: 48, md: 64 } }} />
                            <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: "1.4rem", md: "2.125rem" } }}>
                                {winner?.name ?? "Không có người thắng"}
                            </Typography>
                            <Typography color="text.secondary" sx={{ fontSize: { xs: "0.85rem", md: "1rem" } }}>
                                {room.endReason === "no_answer"
                                    ? "Không có đáp án hợp lệ trong 15 giây."
                                    : room.endReason === "timeout"
                                    ? "Chỉ còn một người chưa bị loại."
                                    : "Ván chơi đã kết thúc."}
                            </Typography>
                            {isBrawl && (
                                <Stack spacing={0.75} sx={{ width: "100%", maxWidth: 380 }}>
                                    {gameRanking.map((p, i) => (
                                        <Paper key={p.id} variant="outlined" sx={{
                                            display: "grid",
                                            gridTemplateColumns: "32px 1fr auto",
                                            alignItems: "center",
                                            gap: 1, px: 1.5, py: 1,
                                            borderColor: i === 0 ? "warning.main" : "divider",
                                        }}>
                                            <Typography fontWeight={900}>#{i + 1}</Typography>
                                            <Typography textAlign="left" fontWeight={750} noWrap>{p.name}</Typography>
                                            <Typography fontWeight={850} color="primary.main" sx={{ fontSize: "0.8rem" }}>
                                                {p.gamePoints}đ · {p.gameScore} từ
                                            </Typography>
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                            {isHost && (
                                <Button variant="contained" startIcon={<RefreshIcon />} onClick={onStart}>Chơi ván mới</Button>
                            )}
                        </Stack>
                    ) : (
                        /* Playing */
                        <>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        {isBrawl ? "Ai nhanh nhất?" : isMyTurn ? "Lượt của bạn" : "Lượt đối thủ"}
                                    </Typography>
                                    <Typography sx={{ fontSize: { xs: 34, md: 46 }, fontWeight: 950, lineHeight: 1 }}>
                                        {(remainingMs / 1000).toFixed(1)}
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: "right" }}>
                                    <Typography variant="caption" color="text.secondary">Âm bắt đầu</Typography>
                                    <Typography variant="h4" color="primary" fontWeight={900} sx={{ fontSize: { xs: "1.5rem", md: "2.125rem" } }}>
                                        {room.requiredSyllable || "Tự do"}
                                    </Typography>
                                </Box>
                            </Stack>
                            <LinearProgress
                                variant="determinate"
                                value={turnProgress}
                                color={remainingMs < 5000 ? "error" : "primary"}
                                sx={{ mt: 1.5, height: 6, borderRadius: 1 }}
                            />

                            <Box sx={{ flex: 1, minHeight: { xs: 100, md: 160 }, py: 2, overflow: "auto" }}>
                                {chain.length === 0 ? (
                                    <Typography color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
                                        Cụm từ hợp lệ đầu tiên sẽ mở chuỗi.
                                    </Typography>
                                ) : (
                                    <Stack spacing={0.75}>
                                        {chain.slice(-5).map((entry, i) => (
                                            <Box key={`${entry.word}-${i}`}>
                                                <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
                                                    <Typography fontWeight={850} color="primary.main">{entry.word}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{entry.playerName}</Typography>
                                                    <Chip label={`+${entry.points ?? 0}đ`} size="small" color="primary" variant="outlined" />
                                                </Stack>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>{entry.explanation}</Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                            </Box>

                            {notice && (
                                <Alert severity={noticeSeverity} sx={{ mb: 1.5, py: 0.5 }}>{notice}</Alert>
                            )}

                            <Stack
                                component="form"
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1}
                                onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
                            >
                                <TextField
                                    inputRef={wordInputRef}
                                    fullWidth
                                    size="small"
                                    value={word}
                                    onChange={(e) => onWordChange(e.target.value)}
                                    placeholder={
                                        room.requiredSyllable
                                            ? `Âm thứ hai hoặc "${room.requiredSyllable} ..."`
                                            : "Nhập âm thứ hai"
                                    }
                                    // Only disable when it's not my turn in traditional mode
                                    // In brawl: always enabled unless eliminated
                                    disabled={
                                        (!isBrawl && !isMyTurn) ||
                                        (isBrawl && (currentPlayer?.eliminated ?? true)) ||
                                        submitting || acceptDelay || !connected
                                    }
                                    inputProps={{ maxLength: 60 }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={!isMyTurn || !word.trim() || submitting || acceptDelay || !connected}
                                    sx={{ minWidth: { xs: "100%", sm: 110 }, py: { xs: 1, sm: 0 } }}
                                >
                                    {submitting ? <CircularProgress size={18} color="inherit" /> : "Gửi từ"}
                                </Button>
                            </Stack>
                            {latest && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>
                                    Điểm tốc độ: 10–100 điểm tuỳ thời gian còn lại.
                                </Typography>
                            )}
                        </>
                    )}
                </Paper>
            </Box>
        </Box>
    );
}

// ─── RoomChatPanel ───────────────────────────────────────────────────────────

function RoomChatPanel({
    messages,
    currentUserId,
    onSend,
}: {
    messages: ChatMessage[];
    currentUserId: string;
    onSend: (content: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const [unread, setUnread] = useState(0);
    const listRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const prevLen = useRef(0);

    // Track new messages: scroll if open, count unread if closed
    useEffect(() => {
        const newCount = messages.length - prevLen.current;
        if (newCount <= 0) return;
        prevLen.current = messages.length;
        if (open) {
            if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
        } else {
            setUnread((u) => u + newCount);
        }
    }, [messages, open]);

    // Focus input and scroll when panel opens
    const handleOpen = () => {
        setOpen(true);
        setUnread(0);
        setTimeout(() => {
            inputRef.current?.focus();
            if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
        }, 50);
    };

    // Toggle with C key (only when not typing in other inputs)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;
            if (e.key === "c" || e.key === "C") setOpen((v) => { if (!v) { setUnread(0); setTimeout(() => { inputRef.current?.focus(); if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, 50); } return !v; });
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    const handleSend = () => {
        const text = draft.trim();
        if (!text) return;
        onSend(text);
        setDraft("");
    };

    return (
        <Box sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1300 }}>
            {/* Floating toggle button */}
            <Fade in={!open}>
                <Box sx={{ position: "absolute", bottom: 0, right: 0, display: open ? "none" : "block" }}>
                    <IconButton
                        onClick={handleOpen}
                        size="large"
                        sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            boxShadow: 4,
                            "&:hover": { bgcolor: "primary.dark" },
                            width: 52,
                            height: 52,
                        }}
                    >
                        <ChatIcon />
                        {unread > 0 && (
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: 4,
                                    right: 4,
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    bgcolor: "error.main",
                                    color: "white",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    lineHeight: 1,
                                }}
                            >
                                {unread > 9 ? "9+" : unread}
                            </Box>
                        )}
                    </IconButton>
                </Box>
            </Fade>

            {/* Chat panel */}
            <Fade in={open}>
                <Paper
                    elevation={8}
                    sx={{
                        display: open ? "flex" : "none",
                        flexDirection: "column",
                        width: { xs: "calc(100vw - 48px)", sm: 340 },
                        height: 420,
                        borderRadius: 3,
                        overflow: "hidden",
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                    }}
                >
                    {/* Header */}
                    <Box
                        sx={{
                            px: 2,
                            py: 1.25,
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexShrink: 0,
                        }}
                    >
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <ChatIcon fontSize="small" />
                            <Typography fontWeight={700} fontSize="0.9rem">Chat phòng</Typography>
                        </Stack>
                        <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: "inherit", p: 0.5 }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    {/* Message list */}
                    <Box
                        ref={listRef}
                        sx={{
                            flex: 1,
                            overflowY: "auto",
                            px: 1.5,
                            py: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.75,
                        }}
                    >
                        {messages.length === 0 && (
                            <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", mt: 4 }}>
                                Chưa có tin nhắn nào. Nhấn <strong>C</strong> để mở/đóng.
                            </Typography>
                        )}
                        {messages.map((m) => {
                            const isMe = m.senderId === currentUserId;
                            return (
                                <Box key={m.id} sx={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                                    {!isMe && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25, px: 0.5 }}>
                                            {m.senderName}
                                        </Typography>
                                    )}
                                    <Box
                                        sx={{
                                            px: 1.5,
                                            py: 0.75,
                                            borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                            bgcolor: isMe ? "primary.main" : "action.hover",
                                            color: isMe ? "primary.contrastText" : "text.primary",
                                            maxWidth: "80%",
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ lineHeight: 1.4 }}>{m.content}</Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>

                    {/* Input */}
                    <Box
                        component="form"
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        sx={{ px: 1.5, py: 1, display: "flex", gap: 1, borderTop: 1, borderColor: "divider", flexShrink: 0 }}
                    >
                        <InputBase
                            inputRef={inputRef}
                            value={draft}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
                            placeholder="Nhập tin nhắn..."
                            inputProps={{ maxLength: 300 }}
                            sx={{
                                flex: 1,
                                fontSize: "0.875rem",
                                px: 1.5,
                                py: 0.75,
                                borderRadius: 99,
                                bgcolor: "action.hover",
                            }}
                        />
                        <IconButton type="submit" size="small" color="primary" disabled={!draft.trim()}>
                            <SendIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Paper>
            </Fade>
        </Box>
    );
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

function Leaderboard({ rows, currentUserId }: { rows: WordChainLeaderboardRow[]; currentUserId: string }) {
    return (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, alignSelf: "start", position: { lg: "sticky" }, top: 88 }}>
            <Stack direction="row" spacing={1} alignItems="center">
                <EmojiEventsIcon color="warning" />
                <Typography variant="h6" fontWeight={850}>Bảng xếp hạng</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Điểm tốc độ tích luỹ.</Typography>
            <Divider sx={{ my: 1.5 }} />
            {rows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Chưa có điểm.</Typography>
            ) : (
                <Stack spacing={0.5}>
                    {rows.map((row) => (
                        <Box
                            key={row.userId}
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "24px 1fr auto",
                                alignItems: "center",
                                gap: 1, p: 0.75, borderRadius: 1.5,
                                bgcolor: row.userId === currentUserId ? "action.selected" : "transparent",
                            }}
                        >
                            <Typography fontWeight={900} color={row.rank <= 3 ? "warning.main" : "text.secondary"} sx={{ fontSize: "0.85rem" }}>
                                {row.rank}
                            </Typography>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography noWrap fontWeight={row.userId === currentUserId ? 800 : 600} sx={{ fontSize: "0.85rem" }}>
                                    {row.name || "Người chơi"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">{row.words ?? 0} từ</Typography>
                            </Box>
                            <Chip label={`${row.points ?? 0}đ`} size="small" color={row.userId === currentUserId ? "primary" : "default"} />
                        </Box>
                    ))}
                </Stack>
            )}
        </Paper>
    );
}

function LobbySkeleton() {
    return (
        <Stack spacing={1}>
            {[0, 1, 2].map((i) => (
                <Paper key={i} variant="outlined" sx={{ height: 72, borderRadius: 2.5, opacity: 0.5 }} />
            ))}
        </Stack>
    );
}
