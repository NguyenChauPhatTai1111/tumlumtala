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
const RACKET_RESTITUTION = 0.32; // speed kept after the racket smacks the marble back
const RACKET_SWING_MS = 300;
const RACKET_READY_LEAD_S = 0.3; // wind-up shows when impact is less than this far away
const ROLL_FRICTION = 340; // px/s² deceleration while rolling on the rail
const ROLL_STOP_SPEED = 12; // px/s — below this the marble settles
const ROLL_VOLUME_UPDATE_MS = 70; // throttle live volume updates while rolling
const PCT_BADGE_HIDE_MS = 10000; // hover badge auto-hides after this long
const PCT_BADGE_FALL_MS = 950; // how long the broken pieces take to rain off-screen
const PCT_BADGE_HIT_HALF_W = 16; // marble-vs-badge hit box half extents
const PCT_BADGE_HIT_HALF_H = 12;
const PCT_BADGE_OFFSET_Y = 12; // badge center sits about this far above the rail top

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
    // "ready" = wind-up pose while the marble closes in, "swing" = the actual smack.
    const racketTimeoutRef = useRef<number | null>(null);
    const racketIdRef = useRef(0);
    const [racket, setRacket] = useState<(Point & { id: number; pose: "ready" | "swing" }) | null>(
        null,
    );

    const readyRacket = useCallback((x: number, y: number) => {
        if (racketTimeoutRef.current) {
            window.clearTimeout(racketTimeoutRef.current);
            racketTimeoutRef.current = null;
        }
        setRacket((prev) =>
            prev?.pose === "ready"
                ? { ...prev, x, y }
                : { x, y, id: ++racketIdRef.current, pose: "ready" },
        );
    }, []);

    const hideReadyRacket = useCallback(() => {
        setRacket((prev) => (prev?.pose === "ready" ? null : prev));
    }, []);

    const swingRacket = useCallback((x: number, y: number) => {
        racketIdRef.current += 1;
        setRacket({ x, y, id: racketIdRef.current, pose: "swing" });
        if (racketTimeoutRef.current) window.clearTimeout(racketTimeoutRef.current);
        racketTimeoutRef.current = window.setTimeout(() => setRacket(null), RACKET_SWING_MS);
    }, []);

    // Hover badge showing the volume % frozen at hover time. A marble smashing into
    // it (or a shot landing on exactly that number) shatters it: the pieces rain
    // down past the bottom of the screen via the portal burst below.
    const badgeHideTimerRef = useRef<number | null>(null);
    const badgeBurstTimerRef = useRef<number | null>(null);
    const badgeBurstIdRef = useRef(0);
    const pctBadgeRef = useRef<{ value: number } | null>(null);
    const [pctBadge, setPctBadgeState] = useState<{ value: number } | null>(null);
    const [badgeBurst, setBadgeBurst] = useState<
        (Point & { value: number; id: number }) | null
    >(null);

    const setPctBadge = useCallback((next: { value: number } | null) => {
        pctBadgeRef.current = next;
        setPctBadgeState(next);
    }, []);

    const showPctBadge = useCallback(
        (value: number) => {
            // A fresh hover always replaces the badge, even while shards still fall.
            setPctBadge({ value });
            if (badgeHideTimerRef.current) window.clearTimeout(badgeHideTimerRef.current);
            badgeHideTimerRef.current = window.setTimeout(
                () => setPctBadge(null),
                PCT_BADGE_HIDE_MS,
            );
        },
        [setPctBadge],
    );

    const shatterPctBadge = useCallback(() => {
        const badge = pctBadgeRef.current;
        const railRect = railRef.current?.getBoundingClientRect();
        if (!badge || !railRect) return;
        if (badgeHideTimerRef.current) window.clearTimeout(badgeHideTimerRef.current);
        setPctBadge(null);
        setBadgeBurst({
            x: railRect.left + (railRect.width * badge.value) / 100,
            y: railRect.top - PCT_BADGE_OFFSET_Y,
            value: badge.value,
            id: ++badgeBurstIdRef.current,
        });
        if (badgeBurstTimerRef.current) window.clearTimeout(badgeBurstTimerRef.current);
        badgeBurstTimerRef.current = window.setTimeout(
            () => setBadgeBurst(null),
            PCT_BADGE_FALL_MS + 100,
        );
    }, [setPctBadge]);

    const shatterPctBadgeOnHit = useCallback(
        (hitPct: number) => {
            if (pctBadgeRef.current?.value === hitPct) shatterPctBadge();
        },
        [shatterPctBadge],
    );

    useEffect(
        () => () => {
            if (racketTimeoutRef.current) window.clearTimeout(racketTimeoutRef.current);
            if (badgeHideTimerRef.current) window.clearTimeout(badgeHideTimerRef.current);
            if (badgeBurstTimerRef.current) window.clearTimeout(badgeBurstTimerRef.current);
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
            setRacket((prev) => (prev?.pose === "ready" ? null : prev));
            setImpact(result);
            setPhase("impact");
            if (result.type === "hit") {
                onVolumeChange(Math.round(result.pct * 100) / 100);
                shatterPctBadgeOnHit(Math.round(result.pct * 100));
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
        [onVolumeChange, setPhase, shatterPctBadgeOnHit, stopAnimation],
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
            let racketReadyShown = false;
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
                        racketReadyShown = false;
                        swingRacket(railEndX, railY - MARBLE_SIZE / 2);
                    } else if (vel.x > 0 && (railEndX - pos.x) / vel.x <= RACKET_READY_LEAD_S) {
                        racketReadyShown = true;
                        readyRacket(railEndX, railY - MARBLE_SIZE / 2);
                    } else if (racketReadyShown) {
                        racketReadyShown = false;
                        hideReadyRacket();
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

                // Direct hit on the hover badge: it shatters and rains down the screen.
                const badge = pctBadgeRef.current;
                if (badge) {
                    const badgeX = railRect.left + (railRect.width * badge.value) / 100;
                    const badgeY = railRect.top - PCT_BADGE_OFFSET_Y;
                    if (
                        Math.abs(pos.x - badgeX) <= PCT_BADGE_HIT_HALF_W &&
                        Math.abs(pos.y - badgeY) <= PCT_BADGE_HIT_HALF_H
                    ) {
                        shatterPctBadge();
                    }
                }

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
                        racketReadyShown = false;
                        swingRacket(railEndX, yCross);
                    }
                }

                // Wind-up: raise the racket when the marble is about to reach the rail's end.
                if (!bounced) {
                    const tCross = vel.x > 0 ? (railEndX - pos.x) / vel.x : Infinity;
                    const yCrossPred =
                        pos.y + vel.y * tCross + 0.5 * GRAVITY * tCross * tCross;
                    if (tCross <= RACKET_READY_LEAD_S && yCrossPred <= railY + MARBLE_SIZE / 2) {
                        racketReadyShown = true;
                        readyRacket(railEndX, Math.min(yCrossPred, railY - MARBLE_SIZE / 2));
                    } else if (racketReadyShown) {
                        racketReadyShown = false;
                        hideReadyRacket();
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
        [finishShot, hideReadyRacket, onVolumeChange, readyRacket, setPhase, shatterPctBadge, swingRacket],
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
                onMouseEnter={() => showPctBadge(Math.round(volume * 100))}
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
                {/* Hover badge — tilted graffiti chip frozen at hover-time %; the
                    marble smashing into it makes it shatter and rain off-screen */}
                {pctBadge && (
                    <Box
                        sx={{
                            position: "absolute",
                            left: `${pctBadge.value}%`,
                            bottom: "calc(100% + 4px)",
                            transform: "translateX(-50%)",
                            pointerEvents: "none",
                            animation: "volumePctFloat 1.8s ease-in-out 0.4s infinite alternate",
                            "@keyframes volumePctFloat": {
                                from: { transform: "translate(-50%, 0)" },
                                to: { transform: "translate(-50%, -3px)" },
                            },
                        }}
                    >
                        <Box
                            sx={{
                                px: 0.5,
                                borderRadius: "7px 2px 7px 2px",
                                background: "linear-gradient(135deg, #f97316, #f43f5e)",
                                boxShadow: "0 2px 10px rgba(249, 115, 22, 0.45)",
                                transform: "rotate(-8deg)",
                                fontSize: 9,
                                fontWeight: 900,
                                lineHeight: 1.4,
                                color: "#fff",
                                fontVariantNumeric: "tabular-nums",
                                textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                                whiteSpace: "nowrap",
                                animation: "volumePctPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                "@keyframes volumePctPop": {
                                    from: { opacity: 0, transform: "rotate(8deg) scale(0.4)" },
                                    to: { opacity: 1, transform: "rotate(-8deg) scale(1)" },
                                },
                            }}
                        >
                            {pctBadge.value}%
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Slingshot overlay — portal so the player bar's overflow:hidden doesn't clip anything */}
            {createPortal(
                <>
                    {/* Broken badge — characters and chip shards rain down off-screen */}
                    {badgeBurst && (
                        <Box
                            key={badgeBurst.id}
                            sx={{
                                position: "fixed",
                                left: badgeBurst.x,
                                top: badgeBurst.y,
                                pointerEvents: "none",
                                zIndex: PORTAL_Z_INDEX + 2,
                            }}
                        >
                            {[
                                ...`${badgeBurst.value}%`.split("").map((ch, i, arr) => ({
                                    ch,
                                    dx: (i - (arr.length - 1) / 2) * 26,
                                    spin: (i % 2 ? 1 : -1) * (220 + i * 90),
                                    delay: i * 25,
                                    shard: false,
                                })),
                                ...[0, 1, 2, 3].map((i) => ({
                                    ch: "",
                                    dx: (i - 1.5) * 34,
                                    spin: (i % 2 ? -1 : 1) * (320 + i * 70),
                                    delay: i * 18,
                                    shard: true,
                                })),
                            ].map((piece, i) => (
                                <Box
                                    key={i}
                                    component="span"
                                    style={
                                        {
                                            "--fall-x": `${piece.dx}px`,
                                            "--fall-y": `${window.innerHeight - badgeBurst.y + 40}px`,
                                            "--fall-r": `${piece.spin}deg`,
                                        } as React.CSSProperties
                                    }
                                    sx={{
                                        position: "absolute",
                                        left: 0,
                                        top: 0,
                                        display: "inline-block",
                                        ...(piece.shard
                                            ? {
                                                width: 5,
                                                height: 7,
                                                borderRadius: "1px",
                                                background:
                                                    i % 2
                                                        ? "#f43f5e"
                                                        : "#f97316",
                                            }
                                            : {
                                                fontSize: 10,
                                                fontWeight: 900,
                                                color: "#fff",
                                                fontVariantNumeric: "tabular-nums",
                                                textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                                            }),
                                        // Ease-in fall: gravity drags every piece past the screen bottom.
                                        animation: `volumeBadgeFall ${PCT_BADGE_FALL_MS}ms cubic-bezier(0.45, 0.05, 0.85, 0.5) ${piece.delay}ms forwards`,
                                        "@keyframes volumeBadgeFall": {
                                            from: {
                                                transform:
                                                    "translate(-50%, -50%) translate(0, 0) rotate(0deg)",
                                            },
                                            to: {
                                                transform:
                                                    "translate(-50%, -50%) translate(var(--fall-x), var(--fall-y)) rotate(var(--fall-r))",
                                            },
                                        },
                                    }}
                                >
                                    {piece.ch}
                                </Box>
                            ))}
                        </Box>
                    )}
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
                                animation:
                                    racket.pose === "swing"
                                        ? `volumeRacketSwing ${RACKET_SWING_MS}ms ease-out forwards`
                                        : "volumeRacketReady 0.25s ease-in-out infinite alternate",
                                "@keyframes volumeRacketSwing": {
                                    "0%": {
                                        opacity: 1,
                                        transform: "translate(-50%, -60%) rotate(65deg)",
                                    },
                                    "20%": {
                                        opacity: 1,
                                        transform: "translate(-50%, -60%) rotate(-32deg)",
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
                                "@keyframes volumeRacketReady": {
                                    from: {
                                        opacity: 0.95,
                                        transform: "translate(-50%, -60%) rotate(58deg)",
                                    },
                                    to: {
                                        opacity: 1,
                                        transform: "translate(-50%, -60%) rotate(72deg)",
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
