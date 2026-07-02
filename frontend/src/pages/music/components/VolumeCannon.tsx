import AirIcon from "@mui/icons-material/Air";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { alpha, Box, IconButton, Tooltip } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const RAIL_WIDTH = 100;
const MAX_DRAG_PX = 90;
const LAUNCH_POWER = 7; // px/s velocity per px of drag
const GRAVITY = 1800; // px/s²
const WIND_MAX_ACCEL = 420; // px/s² at full wind strength
const TAP_THRESHOLD_MS = 200;
const TAP_THRESHOLD_PX = 6;
const FLIGHT_TIMEOUT_MS = 4000;
const MARBLE_SIZE = 12;
const RAIL_EDGE_TOLERANCE_PX = 6;
const PORTAL_Z_INDEX = 2000;
const RACKET_RESTITUTION = 0.55; // speed kept after the racket smacks the marble back
const RACKET_SHOW_MS = 450;
const ROLL_FRICTION = 340; // px/s² deceleration while rolling on the rail
const ROLL_STOP_SPEED = 12; // px/s — below this the marble settles
const ROLL_VOLUME_UPDATE_MS = 70; // throttle live volume updates while rolling

type Phase = "idle" | "aiming" | "flying" | "impact";
type Impact = { type: "hit"; pct: number; color: string } | { type: "miss" };
type Point = { x: number; y: number };

const powerColor = (power: number) => `hsl(${Math.round(120 - power * 120)}, 90%, 52%)`;
const randomWind = () => Math.round((Math.random() * 2 - 1) * 10) / 10; // -1 (west) .. 1 (east)

export const VolumeCannon = ({
    volume,
    onVolumeChange,
}: {
    volume: number;
    onVolumeChange: (value: number) => void;
}) => {
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const railRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const phaseRef = useRef<Phase>("idle");
    const anchorRef = useRef<Point>({ x: 0, y: 0 });
    const aimRef = useRef<Point | null>(null);
    const aimStartRef = useRef(0);
    const windRef = useRef(0);

    const [phase, setPhaseState] = useState<Phase>("idle");
    const [wind, setWind] = useState(() => randomWind());
    const [aim, setAimState] = useState<Point | null>(null);
    const [marble, setMarble] = useState<(Point & { color: string }) | null>(null);
    const [trail, setTrail] = useState<Point[]>([]);
    const [impact, setImpact] = useState<Impact | null>(null);
    const [streakRegion, setStreakRegion] = useState<(Point & { w: number; h: number }) | null>(
        null,
    );
    // The racket that smacks the marble back when it tries to fly past the rail's end.
    const racketTimeoutRef = useRef<number | null>(null);
    const racketIdRef = useRef(0);
    const [racket, setRacket] = useState<(Point & { id: number }) | null>(null);

    const showRacket = useCallback((x: number, y: number) => {
        racketIdRef.current += 1;
        setRacket({ x, y, id: racketIdRef.current });
        if (racketTimeoutRef.current) window.clearTimeout(racketTimeoutRef.current);
        racketTimeoutRef.current = window.setTimeout(() => setRacket(null), RACKET_SHOW_MS);
    }, []);

    useEffect(
        () => () => {
            if (racketTimeoutRef.current) window.clearTimeout(racketTimeoutRef.current);
        },
        [],
    );

    const setPhase = useCallback((next: Phase) => {
        phaseRef.current = next;
        setPhaseState(next);
    }, []);

    const setAim = useCallback((next: Point | null) => {
        aimRef.current = next;
        setAimState(next);
    }, []);

    useEffect(() => {
        windRef.current = wind;
    }, [wind]);

    // Wind drifts to a new random value while nobody is shooting.
    useEffect(() => {
        if (phase !== "idle") return;
        const timer = window.setInterval(() => setWind(randomWind()), 5000);
        return () => window.clearInterval(timer);
    }, [phase]);

    const stopAnimation = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
    }, []);

    useEffect(() => stopAnimation, [stopAnimation]);

    const finishShot = useCallback(
        (result: Impact) => {
            stopAnimation();
            setTrail([]);
            setImpact(result);
            setPhase("impact");
            if (result.type === "hit") {
                onVolumeChange(Math.round(result.pct * 100) / 100);
            } else {
                setMarble(null);
                onVolumeChange(0);
            }
            window.setTimeout(
                () => {
                    setMarble(null);
                    setImpact(null);
                    setStreakRegion(null);
                    setWind(randomWind());
                    setPhase("idle");
                },
                result.type === "hit" ? 650 : 1000,
            );
        },
        [onVolumeChange, setPhase, stopAnimation],
    );

    const launch = useCallback(
        (velocity: Point, color: string) => {
            const railRect = railRef.current?.getBoundingClientRect();
            if (!railRect) {
                setPhase("idle");
                return;
            }
            const railY = railRect.top + railRect.height / 2;
            const railEndX = railRect.right;
            const railPct = (x: number) =>
                Math.min(Math.max((x - railRect.left) / railRect.width, 0), 1);
            const pos = { ...anchorRef.current };
            const vel = { ...velocity };
            const startedAt = performance.now();
            let lastTime = startedAt;
            let rolling = false;
            let fellOffRail = false;
            let lastVolumeUpdate = 0;
            setPhase("flying");
            setMarble({ ...pos, color });
            setTrail([]);
            const tick = (now: number) => {
                const dt = Math.min((now - lastTime) / 1000, 0.032);
                lastTime = now;

                if (rolling) {
                    // Inertia keeps the marble rolling; friction bleeds it off.
                    const dir = Math.sign(vel.x);
                    vel.x = Math.max(Math.abs(vel.x) - ROLL_FRICTION * dt, 0) * dir;
                    pos.x += vel.x * dt;
                    pos.y = railY;

                    if (pos.x >= railEndX) {
                        pos.x = railEndX;
                        vel.x = -Math.abs(vel.x) * RACKET_RESTITUTION;
                        showRacket(railEndX, railY - MARBLE_SIZE / 2);
                    }

                    if (pos.x < railRect.left) {
                        // Rolled past 0% — the marble drops off the rail edge.
                        rolling = false;
                        fellOffRail = true;
                        vel.y = 0;
                    } else if (Math.abs(vel.x) <= ROLL_STOP_SPEED) {
                        setMarble({ x: pos.x, y: railY, color });
                        finishShot({ type: "hit", pct: railPct(pos.x), color });
                        return;
                    } else {
                        if (now - lastVolumeUpdate >= ROLL_VOLUME_UPDATE_MS) {
                            lastVolumeUpdate = now;
                            onVolumeChange(Math.round(railPct(pos.x) * 100) / 100);
                        }
                        setMarble({ ...pos, color });
                        setTrail((t) => [...t.slice(-9), { x: pos.x, y: pos.y }]);
                        rafRef.current = requestAnimationFrame(tick);
                        return;
                    }
                }

                vel.x += windRef.current * WIND_MAX_ACCEL * dt;
                vel.y += GRAVITY * dt;
                const prev = { ...pos };
                pos.x += vel.x * dt;
                pos.y += vel.y * dt;

                // The rail's end is a no-fly line at any height: the racket smacks
                // the marble back so it can never leave the bar on the right.
                let bounced = false;
                if (vel.x > 0 && prev.x <= railEndX && pos.x >= railEndX) {
                    const f = pos.x === prev.x ? 0 : (railEndX - prev.x) / (pos.x - prev.x);
                    const yCross = prev.y + (pos.y - prev.y) * f;
                    if (yCross <= railY + MARBLE_SIZE / 2) {
                        pos.x = railEndX - (pos.x - railEndX) * RACKET_RESTITUTION;
                        vel.x = -vel.x * RACKET_RESTITUTION;
                        bounced = true;
                        showRacket(railEndX, yCross);
                    }
                }

                // Falling across the rail line: did we land on the volume bar?
                if (!bounced && !fellOffRail && vel.y > 0 && prev.y <= railY && pos.y >= railY) {
                    const f = pos.y === prev.y ? 0 : (railY - prev.y) / (pos.y - prev.y);
                    const xHit = prev.x + (pos.x - prev.x) * f;
                    if (
                        xHit >= railRect.left - RAIL_EDGE_TOLERANCE_PX &&
                        xHit <= railRect.right + RAIL_EDGE_TOLERANCE_PX
                    ) {
                        // Land on the rail and keep the horizontal inertia to roll on.
                        rolling = true;
                        pos.x = Math.min(xHit, railEndX);
                        pos.y = railY;
                        vel.y = 0;
                        onVolumeChange(Math.round(railPct(pos.x) * 100) / 100);
                        setMarble({ x: pos.x, y: railY, color });
                        setTrail((t) => [...t.slice(-9), { x: pos.x, y: pos.y }]);
                        rafRef.current = requestAnimationFrame(tick);
                        return;
                    }
                }

                const missed =
                    pos.y >= window.innerHeight - 6 ||
                    pos.x < -40 ||
                    pos.x > window.innerWidth + 40 ||
                    now - startedAt > FLIGHT_TIMEOUT_MS;
                setMarble({ ...pos, color });
                setTrail((t) => [...t.slice(-9), { x: pos.x, y: pos.y }]);
                if (missed) {
                    finishShot({ type: "miss" });
                    return;
                }
                rafRef.current = requestAnimationFrame(tick);
            };
            rafRef.current = requestAnimationFrame(tick);
        },
        [finishShot, onVolumeChange, setPhase, showRacket],
    );

    const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (phaseRef.current !== "idle") return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const buttonRect = event.currentTarget.getBoundingClientRect();
        anchorRef.current = {
            x: buttonRect.left + buttonRect.width / 2,
            y: buttonRect.top + buttonRect.height / 2,
        };
        aimStartRef.current = performance.now();
        const railRect = railRef.current?.getBoundingClientRect();
        if (railRect) {
            setStreakRegion({
                x: railRect.right - 340,
                y: railRect.top - 140,
                w: 340,
                h: 132,
            });
        }
        setAim({ x: event.clientX, y: event.clientY });
        setPhase("aiming");
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (phaseRef.current !== "aiming") return;
        const anchor = anchorRef.current;
        let dx = event.clientX - anchor.x;
        let dy = event.clientY - anchor.y;
        const dist = Math.hypot(dx, dy);
        if (dist > MAX_DRAG_PX) {
            dx = (dx / dist) * MAX_DRAG_PX;
            dy = (dy / dist) * MAX_DRAG_PX;
        }
        setAim({ x: anchor.x + dx, y: anchor.y + dy });
    };

    const handlePointerUp = () => {
        if (phaseRef.current !== "aiming") return;
        const anchor = anchorRef.current;
        const aimPoint = aimRef.current ?? anchor;
        setAim(null);
        const dx = aimPoint.x - anchor.x;
        const dy = aimPoint.y - anchor.y;
        const dist = Math.hypot(dx, dy);
        const heldMs = performance.now() - aimStartRef.current;
        if (dist < TAP_THRESHOLD_PX && heldMs < TAP_THRESHOLD_MS) {
            setStreakRegion(null);
            setPhase("idle");
            onVolumeChange(volume === 0 ? 1 : 0);
            return;
        }
        // Slingshot: fire opposite to the pull direction.
        launch(
            { x: -dx * LAUNCH_POWER, y: -dy * LAUNCH_POWER },
            powerColor(dist / MAX_DRAG_PX),
        );
    };

    const volumeIcon =
        volume === 0 ? (
            <VolumeOffIcon sx={{ fontSize: 18 }} />
        ) : volume < 0.5 ? (
            <VolumeDownIcon sx={{ fontSize: 18 }} />
        ) : (
            <VolumeUpIcon sx={{ fontSize: 18 }} />
        );

    const aiming = phase === "aiming";
    const anchor = anchorRef.current;
    const dragDx = aiming && aim ? aim.x - anchor.x : 0;
    const dragDy = aiming && aim ? aim.y - anchor.y : 0;
    const dragDist = Math.hypot(dragDx, dragDy);
    const dragColor = powerColor(dragDist / MAX_DRAG_PX);
    const windStrength = Math.abs(Math.round(wind * 10));
    const windColor = windStrength >= 7 ? "#ef4444" : windStrength >= 4 ? "#f97316" : "#94a3b8";
    const showStreaks =
        (phase === "aiming" || phase === "flying") && streakRegion && windStrength > 0;

    const previewDots =
        aiming && aim && dragDist >= TAP_THRESHOLD_PX
            ? Array.from({ length: 8 }, (_, i) => {
                const t = (i + 1) * 0.055;
                return {
                    x: anchor.x - dragDx * LAUNCH_POWER * t,
                    y: anchor.y - dragDy * LAUNCH_POWER * t + 0.5 * GRAVITY * t * t,
                    opacity: 0.85 - i * 0.09,
                };
            })
            : null;

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {/* Wind gauge — the wind bends the marble's flight */}
            <Tooltip
                title={`Gió ${wind === 0 ? "lặng" : wind > 0 ? "thổi sang phải" : "thổi sang trái"} (cấp ${windStrength}/10) — làm lệch đường bay của viên bi`}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                        px: 0.75,
                        py: "2px",
                        borderRadius: 1,
                        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.06),
                        color: windColor,
                        fontSize: 10,
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        userSelect: "none",
                        animation:
                            windStrength >= 7 ? "volumeWindPulse 0.9s ease-in-out infinite" : "none",
                        "@keyframes volumeWindPulse": {
                            "0%, 100%": { opacity: 1 },
                            "50%": { opacity: 0.55 },
                        },
                    }}
                >
                    <AirIcon
                        sx={{
                            fontSize: 13,
                            transform: wind < 0 ? "scaleX(-1)" : "none",
                        }}
                    />
                    {wind === 0 ? "0" : `${wind > 0 ? "→" : "←"}${windStrength}`}
                </Box>
            </Tooltip>

            {/* Slingshot speaker button */}
            <IconButton
                ref={buttonRef}
                size="small"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onContextMenu={(e) => e.preventDefault()}
                sx={{
                    color: aiming ? dragColor : "text.secondary",
                    "&:hover": { color: aiming ? dragColor : "text.primary" },
                    cursor: aiming ? "grabbing" : "grab",
                    touchAction: "none",
                    opacity: aiming ? 0.4 : 1,
                }}
            >
                {volumeIcon}
            </IconButton>

            {/* Volume rail — display-only landing zone; the marble is the only way to set volume */}
            <Box
                ref={railRef}
                sx={{
                    position: "relative",
                    width: RAIL_WIDTH,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        height: 4,
                        borderRadius: 2,
                        bgcolor: (theme) =>
                            impact?.type === "miss"
                                ? alpha("#ef4444", 0.5)
                                : alpha(theme.palette.text.secondary, 0.3),
                        overflow: "hidden",
                        transition: "background-color 0.2s",
                    }}
                >
                    <Box
                        sx={{
                            width: `${volume * 100}%`,
                            height: "100%",
                            borderRadius: 2,
                            bgcolor: "#f97316",
                            transition:
                                phase === "impact"
                                    ? "width 0.15s ease-out"
                                    : phase === "flying"
                                      ? "width 0.09s linear"
                                      : "none",
                        }}
                    />
                </Box>
                <Box
                    sx={{
                        position: "absolute",
                        left: `${volume * 100}%`,
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: "#f97316",
                        opacity: impact?.type === "hit" ? 1 : 0,
                        transition: "opacity 0.15s",
                        pointerEvents: "none",
                    }}
                />
                {impact?.type === "hit" && (
                    <>
                        <Box
                            sx={{
                                position: "absolute",
                                left: `${impact.pct * 100}%`,
                                top: "50%",
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                border: `2px solid ${impact.color}`,
                                transform: "translate(-50%, -50%)",
                                pointerEvents: "none",
                                animation: "volumeCannonRipple 0.45s ease-out forwards",
                                "@keyframes volumeCannonRipple": {
                                    from: {
                                        opacity: 0.9,
                                        transform: "translate(-50%, -50%) scale(0.6)",
                                    },
                                    to: {
                                        opacity: 0,
                                        transform: "translate(-50%, -50%) scale(3)",
                                    },
                                },
                            }}
                        />
                        <Box
                            component="span"
                            sx={{
                                position: "absolute",
                                left: `${impact.pct * 100}%`,
                                bottom: "100%",
                                transform: "translateX(-50%)",
                                fontSize: 10,
                                fontWeight: 700,
                                color: impact.color,
                                fontVariantNumeric: "tabular-nums",
                                whiteSpace: "nowrap",
                                pointerEvents: "none",
                                animation: "volumeCannonLabel 0.5s ease-out forwards",
                                "@keyframes volumeCannonLabel": {
                                    from: { opacity: 1, translate: "0 0" },
                                    to: { opacity: 0, translate: "0 -8px" },
                                },
                            }}
                        >
                            {Math.round(impact.pct * 100)}%
                        </Box>
                    </>
                )}
                {impact?.type === "miss" && (
                    <Box
                        component="span"
                        sx={{
                            position: "absolute",
                            left: "50%",
                            bottom: "100%",
                            transform: "translateX(-50%)",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#ef4444",
                            whiteSpace: "nowrap",
                            pointerEvents: "none",
                            animation: "volumeCannonMiss 1s ease-out forwards",
                            "@keyframes volumeCannonMiss": {
                                "0%": { opacity: 0, translate: "0 4px" },
                                "15%": { opacity: 1, translate: "0 0" },
                                "80%": { opacity: 1 },
                                "100%": { opacity: 0, translate: "0 -6px" },
                            },
                        }}
                    >
                        Trượt! Mất tiếng 🔇
                    </Box>
                )}
            </Box>

            {/* Slingshot overlay — portal so the player bar's overflow:hidden doesn't clip anything */}
            {createPortal(
                <>
                    {/* Racket flash — swings in to smack the marble back onto the bar */}
                    {racket && (
                        <Box
                            key={racket.id}
                            sx={{
                                position: "fixed",
                                left: racket.x,
                                top: racket.y,
                                pointerEvents: "none",
                                zIndex: PORTAL_Z_INDEX + 2,
                                transformOrigin: "50% 85%",
                                animation: `volumeRacketSwing ${RACKET_SHOW_MS}ms ease-out forwards`,
                                "@keyframes volumeRacketSwing": {
                                    "0%": {
                                        opacity: 0,
                                        transform: "translate(-50%, -60%) rotate(60deg)",
                                    },
                                    "25%": {
                                        opacity: 1,
                                        transform: "translate(-50%, -60%) rotate(-30deg)",
                                    },
                                    "60%": {
                                        opacity: 1,
                                        transform: "translate(-50%, -60%) rotate(-18deg)",
                                    },
                                    "100%": {
                                        opacity: 0,
                                        transform: "translate(-50%, -60%) rotate(-18deg)",
                                    },
                                },
                            }}
                        >
                            {/* Racket head with strings */}
                            <Box
                                sx={{
                                    width: 16,
                                    height: 20,
                                    borderRadius: "50%",
                                    border: "2.5px solid #a16207",
                                    background:
                                        "repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,0.55) 2px 3px), repeating-linear-gradient(90deg, transparent 0 2px, rgba(255,255,255,0.55) 2px 3px)",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                                }}
                            />
                            {/* Handle */}
                            <Box
                                sx={{
                                    width: 3.5,
                                    height: 11,
                                    mx: "auto",
                                    mt: "-1px",
                                    borderRadius: 1,
                                    bgcolor: "#a16207",
                                }}
                            />
                        </Box>
                    )}
                    {showStreaks && streakRegion && (
                        <Box
                            sx={{
                                position: "fixed",
                                left: streakRegion.x,
                                top: streakRegion.y,
                                width: streakRegion.w,
                                height: streakRegion.h,
                                overflow: "hidden",
                                pointerEvents: "none",
                                zIndex: PORTAL_Z_INDEX,
                            }}
                        >
                            {[0, 1, 2, 3].map((i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        position: "absolute",
                                        top: `${12 + i * 24}%`,
                                        width: 46,
                                        height: 2,
                                        borderRadius: 1,
                                        background: `linear-gradient(${wind > 0 ? 90 : 270}deg, transparent, ${alpha(windColor, 0.8)}, transparent)`,
                                        animation: `volumeWindStreak ${Math.max(1.7 - Math.abs(wind), 0.5)}s linear infinite`,
                                        animationDelay: `${i * 0.35}s`,
                                        animationDirection: wind > 0 ? "normal" : "reverse",
                                        "@keyframes volumeWindStreak": {
                                            from: {
                                                transform: "translateX(-46px)",
                                                opacity: 0,
                                            },
                                            "25%": { opacity: 1 },
                                            "75%": { opacity: 1 },
                                            to: {
                                                transform: `translateX(${streakRegion.w}px)`,
                                                opacity: 0,
                                            },
                                        },
                                    }}
                                />
                            ))}
                        </Box>
                    )}
                    {aiming && aim && dragDist >= TAP_THRESHOLD_PX && (
                        <>
                            {/* Rubber band */}
                            <Box
                                sx={{
                                    position: "fixed",
                                    left: anchor.x,
                                    top: anchor.y,
                                    width: dragDist,
                                    height: 3,
                                    borderRadius: 2,
                                    bgcolor: "#a16207",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
                                    transformOrigin: "0 50%",
                                    transform: `translateY(-50%) rotate(${Math.atan2(dragDy, dragDx)}rad)`,
                                    pointerEvents: "none",
                                    zIndex: PORTAL_Z_INDEX,
                                }}
                            />
                            {/* Trajectory preview (no wind — the wind is the surprise) */}
                            {previewDots?.map((dot, i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        position: "fixed",
                                        left: dot.x,
                                        top: dot.y,
                                        width: 4,
                                        height: 4,
                                        borderRadius: "50%",
                                        bgcolor: "#fff",
                                        opacity: dot.opacity,
                                        boxShadow: "0 0 3px rgba(0,0,0,0.5)",
                                        transform: "translate(-50%, -50%)",
                                        pointerEvents: "none",
                                        zIndex: PORTAL_Z_INDEX,
                                    }}
                                />
                            ))}
                            {/* Pulled marble */}
                            <Box
                                sx={{
                                    position: "fixed",
                                    left: aim.x,
                                    top: aim.y,
                                    width: MARBLE_SIZE + 2,
                                    height: MARBLE_SIZE + 2,
                                    transform: "translate(-50%, -50%)",
                                    borderRadius: "50%",
                                    background: `radial-gradient(circle at 32% 30%, #fff8, ${dragColor} 60%)`,
                                    boxShadow: `0 0 10px ${dragColor}`,
                                    pointerEvents: "none",
                                    zIndex: PORTAL_Z_INDEX + 1,
                                }}
                            />
                        </>
                    )}
                    {trail.map((dot, i) => (
                        <Box
                            key={i}
                            sx={{
                                position: "fixed",
                                left: dot.x,
                                top: dot.y,
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                bgcolor: marble?.color ?? "#f97316",
                                opacity: ((i + 1) / trail.length) * 0.35,
                                transform: "translate(-50%, -50%)",
                                pointerEvents: "none",
                                zIndex: PORTAL_Z_INDEX,
                            }}
                        />
                    ))}
                    {marble && (
                        <Box
                            sx={{
                                position: "fixed",
                                left: marble.x,
                                top: marble.y,
                                width: MARBLE_SIZE,
                                height: MARBLE_SIZE,
                                transform: "translate(-50%, -50%)",
                                borderRadius: "50%",
                                background: `radial-gradient(circle at 32% 30%, #fff8, ${marble.color} 60%)`,
                                boxShadow: `0 0 10px ${marble.color}, 0 0 3px ${marble.color}`,
                                pointerEvents: "none",
                                zIndex: PORTAL_Z_INDEX + 1,
                            }}
                        />
                    )}
                </>,
                document.body,
            )}
        </Box>
    );
};
