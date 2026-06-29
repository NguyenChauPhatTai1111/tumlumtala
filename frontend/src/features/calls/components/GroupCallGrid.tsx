import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamOffRoundedIcon from "@mui/icons-material/VideocamOffRounded";
import { Avatar, Box, Typography, useMediaQuery } from "@mui/material";
import {
    type DragEvent as ReactDragEvent,
    type ReactElement,
    useEffect,
    useRef,
    useState,
} from "react";
import { resolveCdnUrl } from "@/utils";
import type { CallParticipant } from "../types/call.types";
import { StreamVideo } from "./StreamVideo";

// Hidden audio element that auto-plays a remote stream
function RemoteAudio({ stream }: { stream: MediaStream }) {
    const ref = useRef<HTMLAudioElement | null>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.srcObject = stream;
        void el.play().catch(() => {});
        return () => {
            el.srcObject = null;
        };
    }, [stream]);
    return <audio ref={ref} autoPlay style={{ display: "none" }} />;
}

type GroupCallTileProps = {
    participant: CallParticipant;
    isLocal?: boolean;
    compact?: boolean;
    draggable?: boolean;
    dragging?: boolean;
    onDragStart?: (event: ReactDragEvent<HTMLDivElement>) => void;
    onDragEnter?: () => void;
    onDragEnd?: () => void;
};

function GroupCallTile({
    participant,
    isLocal,
    compact,
    draggable,
    dragging,
    onDragStart,
    onDragEnter,
    onDragEnd,
}: GroupCallTileProps) {
    const hasVideoTrack = Boolean(
        participant.stream?.getVideoTracks().some((t) => t.enabled && t.readyState === "live"),
    );
    const cameraOff = participant.cameraOn === false;
    const shouldRenderVideo = hasVideoTrack && !cameraOff;
    const label = (isLocal ? "Bạn" : participant.fullname) || "Người dùng";
    const avatarSrc = resolveCdnUrl(participant.avatar);

    return (
        <Box
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnter={onDragEnter}
            onDragOver={(event) => {
                if (draggable !== undefined) event.preventDefault();
            }}
            onDragEnd={onDragEnd}
            sx={{
                position: "relative",
                width: "100%",
                height: "100%",
                bgcolor: "#111827",
                borderRadius: compact ? 1.75 : 2.5,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: draggable ? "grab" : "default",
                opacity: dragging ? 0.58 : 1,
                transform: dragging ? "scale(0.985)" : "scale(1)",
                transition: "transform 160ms ease, opacity 160ms ease, border-color 160ms ease",
                userSelect: "none",
                "&:active": draggable ? { cursor: "grabbing" } : undefined,
                "&:hover": draggable ? { borderColor: "rgba(255,255,255,0.26)" } : undefined,
            }}
        >
            {/* Keep remote audio playing while the camera placeholder is visible. */}
            {!isLocal && participant.stream && !shouldRenderVideo && (
                <RemoteAudio stream={participant.stream} />
            )}

            {shouldRenderVideo && participant.stream ? (
                // Video element carries both video + audio; muted=false for remote
                <StreamVideo stream={participant.stream} muted={isLocal} label={label} />
            ) : (
                <Box
                    sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        background:
                            "radial-gradient(circle at 50% 42%, rgba(51,65,85,0.72), rgba(15,23,42,0.96) 64%)",
                    }}
                >
                    <Avatar
                        src={avatarSrc}
                        sx={{
                            width: compact ? 42 : { xs: 52, sm: 72, md: 88 },
                            height: compact ? 42 : { xs: 52, sm: 72, md: 88 },
                            fontSize: compact ? 18 : { xs: 22, sm: 30, md: 36 },
                            bgcolor: "primary.dark",
                            border: "2px solid rgba(255,255,255,0.16)",
                            boxShadow: "0 14px 34px rgba(2,6,23,0.38)",
                        }}
                    >
                        {!avatarSrc && (participant.fullname?.[0] ?? "?")}
                    </Avatar>
                    {cameraOff && !compact && (
                        <Typography
                            variant="caption"
                            sx={{ color: "rgba(255,255,255,0.66)", fontWeight: 600 }}
                        >
                            Camera đang tắt
                        </Typography>
                    )}
                </Box>
            )}

            {/* Compact identity chip; it stays readable without covering the video. */}
            <Box
                sx={{
                    position: "absolute",
                    bottom: compact ? 6 : { xs: 6, sm: 10 },
                    left: compact ? 6 : { xs: 6, sm: 10 },
                    maxWidth: `calc(100% - ${compact ? 12 : 20}px)`,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: compact ? 0.5 : 0.625,
                    py: compact ? 0.375 : 0.5,
                    borderRadius: 99,
                    bgcolor: "rgba(7, 11, 20, 0.68)",
                    border: "1px solid rgba(255,255,255,0.13)",
                    boxShadow: "0 6px 18px rgba(2,6,23,0.22)",
                    backdropFilter: "blur(10px)",
                }}
            >
                <Avatar
                    src={avatarSrc}
                    sx={{
                        width: compact ? 18 : { xs: 20, sm: 24 },
                        height: compact ? 18 : { xs: 20, sm: 24 },
                        fontSize: compact ? 9 : 11,
                        bgcolor: "primary.dark",
                    }}
                >
                    {!avatarSrc && (participant.fullname?.[0] ?? "?")}
                </Avatar>
                <Typography
                    variant="caption"
                    noWrap
                    sx={{
                        minWidth: 0,
                        color: "#fff",
                        fontSize: compact ? "0.65rem" : undefined,
                        fontWeight: 700,
                        lineHeight: 1.25,
                    }}
                >
                    {label}
                </Typography>
            </Box>

            <Box
                sx={{
                    position: "absolute",
                    top: compact ? 6 : 10,
                    right: compact ? 6 : 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                }}
            >
                {participant.micOn === false && (
                    <MediaStateBadge compact={compact} label="Đã tắt micro">
                        <MicOffIcon />
                    </MediaStateBadge>
                )}
                {participant.cameraOn === false && (
                    <MediaStateBadge compact={compact} label="Đã tắt camera">
                        <VideocamOffRoundedIcon />
                    </MediaStateBadge>
                )}
                {draggable && (
                    <Box
                        aria-hidden
                        sx={{
                            width: 30,
                            height: 30,
                            display: "grid",
                            placeItems: "center",
                            borderRadius: 1.5,
                            color: "rgba(255,255,255,0.88)",
                            bgcolor: "rgba(7,11,20,0.58)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            backdropFilter: "blur(8px)",
                        }}
                    >
                        <DragIndicatorRoundedIcon sx={{ fontSize: 18 }} />
                    </Box>
                )}
            </Box>

            {/* "Đang kết nối" overlay for invited but not yet joined */}
            {participant.status === "invited" && !isLocal && (
                <Box
                    sx={{
                        position: "absolute",
                        inset: 0,
                        bgcolor: "rgba(0,0,0,0.58)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                        Đang kết nối...
                    </Typography>
                </Box>
            )}
        </Box>
    );
}

function MediaStateBadge({
    compact,
    label,
    children,
}: {
    compact?: boolean;
    label: string;
    children: ReactElement;
}) {
    return (
        <Box
            role="img"
            aria-label={label}
            title={label}
            sx={{
                width: compact ? 22 : 30,
                height: compact ? 22 : 30,
                display: "grid",
                placeItems: "center",
                borderRadius: compact ? 1.25 : 1.5,
                color: "#fecaca",
                bgcolor: "rgba(127,29,29,0.78)",
                border: "1px solid rgba(254,202,202,0.24)",
                boxShadow: "0 6px 18px rgba(2,6,23,0.24)",
                backdropFilter: "blur(8px)",
                "& > svg": { fontSize: compact ? 13 : 17 },
            }}
        >
            {children}
        </Box>
    );
}

// -------------------------------------------------------------------------
// Responsive grid layout
//   1 person  → full screen
//   2 people  → desktop side-by-side, mobile stacked
//   3         → mobile: one featured tile + two tiles below
//   4         → 2×2
//   5–6       → 2×3
//   7–8       → 2×4 (mobile: 2 cols, N rows)
// -------------------------------------------------------------------------

function gridConfig(count: number): { cols: number; rows: number } {
    if (count <= 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 2, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    return { cols: 4, rows: 2 };
}

type GroupCallGridProps = {
    participants: CallParticipant[];
    localUserId: number;
    localStream: MediaStream | null;
    compact?: boolean;
};

export function GroupCallGrid({
    participants,
    localUserId,
    localStream,
    compact = false,
}: GroupCallGridProps) {
    const canReorder = useMediaQuery("(min-width:900px)") && !compact;
    const [orderedIds, setOrderedIds] = useState<number[]>(() =>
        participants.map((participant) => participant.user_id),
    );
    const [draggingId, setDraggingId] = useState<number | null>(null);

    // Only accepted/joined participants belong in the room grid.
    const allVisible = participants.filter(
        (participant) => participant.status === "joined" || participant.user_id === localUserId,
    );

    const ordered = [...allVisible].sort((a, b) => {
        const aIndex = orderedIds.indexOf(a.user_id);
        const bIndex = orderedIds.indexOf(b.user_id);
        return (
            (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) -
            (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex)
        );
    });
    const count = ordered.length;
    const { cols, rows } = gridConfig(count);

    // Inject local stream into self tile
    const enriched = ordered.map((p) =>
        p.user_id === localUserId ? { ...p, stream: localStream ?? p.stream } : p,
    );

    const mobileRows = count === 2 ? 2 : Math.ceil(count / 2);
    const moveLocalTile = (targetId: number) => {
        if (draggingId !== localUserId || targetId === localUserId) return;
        const current = ordered.map((participant) => participant.user_id);
        const targetIndex = current.indexOf(targetId);
        const next = current.filter((id) => id !== localUserId);
        next.splice(targetIndex < 0 ? next.length : targetIndex, 0, localUserId);
        setOrderedIds(next);
    };

    return (
        <Box
            sx={{
                display: "grid",
                width: "100%",
                height: "100%",
                gap: compact ? 0.75 : { xs: 0.5, sm: 1 },
                p: compact ? 0.75 : { xs: 0.5, sm: 1 },
                gridTemplateColumns: compact
                    ? count === 1
                        ? "1fr"
                        : "repeat(2, minmax(0, 1fr))"
                    : {
                          xs: count <= 2 ? "1fr" : "repeat(2, minmax(0, 1fr))",
                          sm: `repeat(${Math.min(cols, count)}, minmax(0, 1fr))`,
                      },
                gridTemplateRows: compact
                    ? count <= 2
                        ? "1fr"
                        : `repeat(${mobileRows}, minmax(0, 1fr))`
                    : {
                          xs:
                              count === 1
                                  ? "1fr"
                                  : `repeat(${mobileRows}, minmax(0, 1fr))`,
                          sm: `repeat(${Math.min(
                              rows,
                              Math.ceil(count / cols),
                          )}, minmax(0, 1fr))`,
                      },
                boxSizing: "border-box",
                "& > :first-of-type":
                    !compact && count === 3
                        ? {
                              gridColumn: { xs: "1 / -1", sm: "auto" },
                          }
                        : undefined,
            }}
        >
            {enriched.map((p) => (
                <GroupCallTile
                    key={p.user_id}
                    participant={p}
                    isLocal={p.user_id === localUserId}
                    compact={compact}
                    draggable={canReorder && p.user_id === localUserId}
                    dragging={draggingId === p.user_id}
                    onDragStart={(event) => {
                        if (!canReorder || p.user_id !== localUserId) {
                            event.preventDefault();
                            return;
                        }
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", String(p.user_id));
                        setDraggingId(p.user_id);
                    }}
                    onDragEnter={() => moveLocalTile(p.user_id)}
                    onDragEnd={() => setDraggingId(null)}
                />
            ))}
        </Box>
    );
}
