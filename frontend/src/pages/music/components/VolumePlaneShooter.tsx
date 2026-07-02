import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { alpha, Box, IconButton, Typography } from "@mui/material";
import { memo, useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";

const OVERLAY_Z_INDEX = 3000;
const BULLET_SPEED = 1500; // px/s muzzle velocity
const BULLET_GRAVITY = 750; // px/s² — bullets drop, aim above far targets
const BULLET_RADIUS = 4;
const BULLET_POOL_SIZE = 10; // reusable DOM slots; more than can ever be airborne
const MAG_SIZE = 5; // bullets per magazine
const RELOAD_MS = 1500;
const PLANE_HIT_HALF_W = 40;
const PLANE_HIT_HALF_H = 22;
const PLANE_MIN_SPEED = 80; // |points| = 1 flies this fast
const PLANE_MAX_SPEED = 380; // |points| = 15 flies this fast
const PLANE_MAX_POINTS = 15;
const BOMB_CHANCE = 0.18;
const MIN_PLANES = 3;
const MAX_PLANES = 15;
const DEFAULT_PLANES = 8;
const BOOM_LIFE_MS = 750;
const MUZZLE_FLASH_MS = 90;
const GUN_BOTTOM_OFFSET = 64; // gun pivot sits this far above the screen bottom
const PLANE_COUNT_STORAGE_KEY = "music-plane-shooter-count";

type Plane = {
    id: number;
    points: number; // -15..15 — added onto the current volume % on hit
    bomb: boolean;
    x: number;
    y: number;
    dir: 1 | -1;
    speed: number;
    baseY: number;
    amp: number;
    freq: number;
    phase: number;
};

type Bullet = { x: number; y: number; vx: number; vy: number };

type Boom = { id: number; x: number; y: number; bomb: boolean; label: string };

const getSavedPlaneCount = () => {
    try {
        const parsed = Number(localStorage.getItem(PLANE_COUNT_STORAGE_KEY));
        return Number.isFinite(parsed) && parsed >= MIN_PLANES && parsed <= MAX_PLANES
            ? Math.round(parsed)
            : DEFAULT_PLANES;
    } catch {
        return DEFAULT_PLANES;
    }
};

const savePlaneCount = (count: number) => {
    try {
        localStorage.setItem(PLANE_COUNT_STORAGE_KEY, String(count));
    } catch {
        // The game keeps working without persistence.
    }
};

let planeSeq = 0;

const makePlane = (offscreen: boolean): Plane => {
    const magnitude = 1 + Math.floor(Math.random() * PLANE_MAX_POINTS);
    const points = Math.random() < 0.5 ? -magnitude : magnitude;
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const baseY = 70 + Math.random() * Math.max(window.innerHeight * 0.55, 120);
    return {
        id: ++planeSeq,
        points,
        bomb: Math.random() < BOMB_CHANCE,
        dir,
        // Bigger |points| → faster plane.
        speed:
            PLANE_MIN_SPEED +
            (magnitude / PLANE_MAX_POINTS) * (PLANE_MAX_SPEED - PLANE_MIN_SPEED),
        x: offscreen
            ? dir === 1
                ? -80 - Math.random() * 400
                : window.innerWidth + 80 + Math.random() * 400
            : Math.random() * window.innerWidth,
        y: baseY,
        baseY,
        amp: 18 + Math.random() * 55,
        freq: 0.6 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
    };
};

const planeTransform = (p: Plane) => `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;

// Memoized sprite: re-renders only when its slot gets a new plane (identity
// change). Position updates never touch React — the physics loop writes
// style.transform directly on the registered element.
const PlaneSprite = memo(
    ({
        plane,
        slot,
        registerEl,
    }: {
        plane: Plane;
        slot: number;
        registerEl: (slot: number, el: HTMLDivElement | null) => void;
    }) => {
        const magnitude = Math.abs(plane.points);
        const hue = Math.round(120 - (magnitude / PLANE_MAX_POINTS) * 120);
        const body = plane.bomb ? "#475569" : `hsl(${hue}, 70%, 50%)`;
        const bodyDark = plane.bomb ? "#293548" : `hsl(${hue}, 70%, 36%)`;
        const chipBg = plane.bomb ? "#fbbf24" : plane.points > 0 ? "#4ade80" : "#f87171";
        return (
            <Box
                ref={(el: HTMLDivElement | null) => registerEl(slot, el)}
                style={{ transform: planeTransform(plane) }}
                sx={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    pointerEvents: "none",
                    willChange: "transform",
                    // CSS flicker on the flame only — no SVG filter, no SMIL, so the
                    // sprite never re-rasterizes beyond this tiny group.
                    "& .flame": {
                        animation: "planeFlameFlicker 0.22s ease-in-out infinite",
                    },
                    "@keyframes planeFlameFlicker": {
                        "0%, 100%": { opacity: 1 },
                        "50%": { opacity: 0.4 },
                    },
                }}
            >
                <Box
                    component="svg"
                    viewBox="0 0 76 34"
                    sx={{
                        width: 66,
                        height: 30,
                        overflow: "visible",
                        transform: plane.dir === -1 ? "scaleX(-1)" : "none",
                    }}
                >
                    {/* Jet exhaust flame */}
                    <g className="flame">
                        <path d="M11 15 L-3 11.5 L4.5 15 L-3 18.5 Z" fill="#fb923c" />
                        <path d="M11 15 L1 13 L6 15 L1 17 Z" fill="#fde047" />
                    </g>
                    {/* Tail fin + stabilizer */}
                    <path d="M12 13 L6 2 L15 3 L21 12 Z" fill={bodyDark} />
                    <path d="M10 16 L3 23 L12 23 L18 16.5 Z" fill={bodyDark} />
                    {/* Fuselage */}
                    <ellipse cx="38" cy="15" rx="31" ry="7.5" fill={body} />
                    {/* Nose cone */}
                    <path d="M62 9.5 Q75 13 75.5 15 Q75 17 62 20.5 Z" fill="#fbbf24" />
                    {/* Top highlight + belly shade */}
                    <ellipse cx="36" cy="11.5" rx="27" ry="2.8" fill="#fff" opacity="0.22" />
                    <ellipse cx="36" cy="19" rx="27" ry="2.6" fill="#000" opacity="0.14" />
                    {/* Swept main wing */}
                    <path d="M33 15 L18 28 L31 28 L45 16 Z" fill={bodyDark} />
                    {/* Cockpit glass */}
                    <path
                        d="M44 8.6 Q50 5.2 56 9.6 Q50 11.4 44 10.8 Z"
                        fill="#bae6fd"
                        stroke="#0ea5e9"
                        strokeWidth="0.8"
                    />
                    {/* Roundel */}
                    <circle cx="27" cy="14.5" r="3.4" fill="#fff" opacity="0.85" />
                    <circle cx="27" cy="14.5" r="1.7" fill={bodyDark} />
                    {/* Bomb under the belly */}
                    {plane.bomb && (
                        <g>
                            <ellipse cx="36" cy="28.5" rx="8" ry="3.6" fill="#111827" />
                            <path d="M28 28.5 L23.5 25.6 L23.5 31.4 Z" fill="#374151" />
                            <circle cx="43" cy="28.5" r="1.6" fill="#ef4444" />
                            <ellipse cx="34" cy="27.3" rx="4" ry="1" fill="#fff" opacity="0.25" />
                        </g>
                    )}
                </Box>
                <Box
                    component="span"
                    sx={{
                        mt: "3px",
                        px: 0.6,
                        borderRadius: 1,
                        fontSize: 11,
                        fontWeight: 800,
                        fontVariantNumeric: "tabular-nums",
                        color: "#0b0b0b",
                        bgcolor: chipBg,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
                    }}
                >
                    {plane.bomb ? "💣" : plane.points > 0 ? `+${plane.points}` : plane.points}
                </Box>
            </Box>
        );
    },
);
PlaneSprite.displayName = "PlaneSprite";

// Fixed pool of bullet DOM nodes; the physics loop toggles/moves them. Memoized
// so parent re-renders never reset the imperatively-set display/transform.
const BulletPool = memo(
    ({ registerEl }: { registerEl: (slot: number, el: HTMLDivElement | null) => void }) => (
        <>
            {Array.from({ length: BULLET_POOL_SIZE }, (_, i) => (
                <Box
                    key={i}
                    ref={(el: HTMLDivElement | null) => registerEl(i, el)}
                    style={{ display: "none" }}
                    sx={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: BULLET_RADIUS * 2,
                        height: BULLET_RADIUS * 2,
                        borderRadius: "50%",
                        background: "radial-gradient(circle at 35% 30%, #fff, #fbbf24 65%)",
                        boxShadow: "0 0 8px #fbbf24",
                        pointerEvents: "none",
                        willChange: "transform",
                    }}
                />
            ))}
        </>
    ),
);
BulletPool.displayName = "BulletPool";

// The gun renders once; rotation/recoil/flash are driven imperatively through
// the passed refs, so shots and reloads never re-render this subtree.
const GunAssembly = memo(
    ({
        turretRef,
        flashRef,
    }: {
        turretRef: RefObject<SVGSVGElement | null>;
        flashRef: RefObject<SVGGElement | null>;
    }) => (
        <Box
            sx={{
                position: "absolute",
                left: "50%",
                top: `calc(100% - ${GUN_BOTTOM_OFFSET}px)`,
                pointerEvents: "none",
            }}
        >
            {/* Rotating turret: barrel + receiver + gloved hands, pivot at the mount */}
            <Box
                component="svg"
                ref={turretRef}
                viewBox="0 0 56 104"
                style={{ transform: "translate(-50%, -88%)" }}
                sx={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: 56,
                    height: 104,
                    overflow: "visible",
                    transformOrigin: "50% 88%",
                    willChange: "transform",
                    filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.6))",
                }}
            >
                {/* Muzzle flash — toggled imperatively */}
                <g ref={flashRef} style={{ visibility: "hidden" }}>
                    <polygon
                        points="28,-22 32,-8 42,-12 34,-2 44,6 29,0 20,9 23,-2 12,-8 24,-8"
                        fill="#fde047"
                        opacity="0.95"
                    />
                    <circle cx="28" cy="-6" r="5.5" fill="#fff" />
                </g>
                {/* Muzzle brake */}
                <rect x="20" y="0" width="16" height="12" rx="2.5" fill="#1f2937" />
                <rect x="23" y="2" width="3" height="8" rx="1" fill="#0b0f19" />
                <rect x="30" y="2" width="3" height="8" rx="1" fill="#0b0f19" />
                {/* Barrel */}
                <rect x="23" y="10" width="10" height="48" rx="3" fill="#4b5563" />
                <rect x="24.5" y="10" width="2.5" height="48" rx="1" fill="#9ca3af" opacity="0.8" />
                <rect x="30.5" y="10" width="1.5" height="48" fill="#111827" opacity="0.5" />
                {/* Barrel ring + front sight */}
                <rect x="19" y="30" width="18" height="7" rx="2.5" fill="#374151" />
                <rect x="26.5" y="-5" width="3" height="6" rx="1" fill="#374151" />
                {/* Receiver */}
                <path d="M15 58 h26 l4 20 h-34 Z" fill="#374151" />
                <path d="M15 58 h26 l1 5 h-28 Z" fill="#4b5563" />
                <rect x="13" y="70" width="30" height="4" rx="2" fill="#f97316" />
                <circle cx="28" cy="65" r="3" fill="#111827" />
                {/* Gloved hands gripping both sides */}
                <ellipse cx="9" cy="78" rx="7.5" ry="9" fill="#78350f" />
                <ellipse cx="7.5" cy="74" rx="4" ry="3" fill="#92400e" />
                <ellipse cx="47" cy="78" rx="7.5" ry="9" fill="#78350f" />
                <ellipse cx="48.5" cy="74" rx="4" ry="3" fill="#92400e" />
            </Box>
            {/* Fixed mount under the turret */}
            <Box
                component="svg"
                viewBox="0 0 72 34"
                sx={{
                    position: "absolute",
                    left: 0,
                    top: -8,
                    width: 72,
                    height: 34,
                    transform: "translate(-50%, 0)",
                }}
            >
                <ellipse cx="36" cy="26" rx="34" ry="8" fill="#111827" />
                <ellipse cx="36" cy="22" rx="26" ry="7" fill="#1f2937" />
                <circle cx="36" cy="18" r="10" fill="#111827" stroke="#4b5563" strokeWidth="1.5" />
                <circle cx="36" cy="18" r="4" fill="#374151" />
                <circle cx="16" cy="24" r="1.6" fill="#6b7280" />
                <circle cx="56" cy="24" r="1.6" fill="#6b7280" />
                <circle cx="36" cy="30" r="1.6" fill="#6b7280" />
            </Box>
        </Box>
    ),
);
GunAssembly.displayName = "GunAssembly";

// Crosshair renders once; pointermove writes its transform directly.
const Crosshair = memo(({ elRef }: { elRef: RefObject<HTMLDivElement | null> }) => (
    <Box
        ref={elRef}
        style={{
            transform: `translate(${window.innerWidth / 2}px, ${window.innerHeight / 3}px) translate(-50%, -50%)`,
        }}
        sx={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 34,
            height: 34,
            pointerEvents: "none",
            willChange: "transform",
            "&::before, &::after": {
                content: '""',
                position: "absolute",
                bgcolor: "#f97316",
            },
            "&::before": {
                left: "50%",
                top: 0,
                bottom: 0,
                width: "1.5px",
                transform: "translateX(-50%)",
            },
            "&::after": {
                top: "50%",
                left: 0,
                right: 0,
                height: "1.5px",
                transform: "translateY(-50%)",
            },
        }}
    >
        <Box
            sx={{
                position: "absolute",
                inset: 5,
                borderRadius: "50%",
                border: "1.5px solid #f97316",
                boxShadow: "0 0 8px rgba(249, 115, 22, 0.45)",
            }}
        />
    </Box>
));
Crosshair.displayName = "Crosshair";

export const VolumePlaneShooter = ({
    volume,
    onVolumeChange,
    onClose,
}: {
    volume: number;
    onVolumeChange: (value: number) => void;
    onClose: () => void;
}) => {
    // Physics state lives in refs and is written straight to DOM transforms each
    // frame — React only re-renders on events (hits, respawns, reloads), and the
    // memoized sprites keep even those renders cheap.
    const planesRef = useRef<Plane[]>([]);
    const planeElsRef = useRef<(HTMLDivElement | null)[]>([]);
    const bulletsRef = useRef<(Bullet | null)[]>(Array(BULLET_POOL_SIZE).fill(null));
    const bulletElsRef = useRef<(HTMLDivElement | null)[]>([]);
    const crosshairElRef = useRef<HTMLDivElement | null>(null);
    const turretElRef = useRef<SVGSVGElement | null>(null);
    const flashElRef = useRef<SVGGElement | null>(null);
    const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
    const lastShotAtRef = useRef(0);
    const boomSeqRef = useRef(0);
    const volPctRef = useRef(Math.round(volume * 100));
    const ammoRef = useRef(MAG_SIZE);
    const reloadingRef = useRef(false);
    const reloadTimerRef = useRef<number | null>(null);

    // Bumped whenever a plane slot gets a new identity so React repaints its chip.
    const [, bumpPlanes] = useReducer((c: number) => c + 1, 0);
    const [booms, setBooms] = useState<Boom[]>([]);
    const [ammo, setAmmo] = useState(MAG_SIZE);
    const [reloading, setReloading] = useState(false);
    const [planeCount, setPlaneCount] = useState(getSavedPlaneCount);

    useEffect(() => {
        volPctRef.current = Math.round(volume * 100);
    }, [volume]);

    const registerPlaneEl = useCallback((slot: number, el: HTMLDivElement | null) => {
        planeElsRef.current[slot] = el;
    }, []);

    const registerBulletEl = useCallback((slot: number, el: HTMLDivElement | null) => {
        bulletElsRef.current[slot] = el;
    }, []);

    const changePlaneCount = useCallback((delta: number) => {
        setPlaneCount((prev) => {
            const next = Math.min(Math.max(prev + delta, MIN_PLANES), MAX_PLANES);
            savePlaneCount(next);
            return next;
        });
    }, []);

    // Keep the fleet at the requested size; the first wave spawns mid-screen.
    useEffect(() => {
        const planes = planesRef.current;
        while (planes.length < planeCount) planes.push(makePlane(planes.length > 0));
        if (planes.length > planeCount) planes.length = planeCount;
        bumpPlanes();
    }, [planeCount]);

    useEffect(
        () => () => {
            planesRef.current = [];
            bulletsRef.current = Array(BULLET_POOL_SIZE).fill(null);
            if (reloadTimerRef.current) window.clearTimeout(reloadTimerRef.current);
        },
        [],
    );

    // Esc closes the game. Capture phase + stopPropagation so the expanded
    // player underneath doesn't also close on the same keypress.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            onClose();
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [onClose]);

    const startReload = useCallback(() => {
        reloadingRef.current = true;
        setReloading(true);
        reloadTimerRef.current = window.setTimeout(() => {
            ammoRef.current = MAG_SIZE;
            reloadingRef.current = false;
            setAmmo(MAG_SIZE);
            setReloading(false);
        }, RELOAD_MS);
    }, []);

    const shoot = useCallback(() => {
        if (reloadingRef.current || ammoRef.current <= 0) return;
        const slot = bulletsRef.current.findIndex((b) => b === null);
        if (slot === -1) return;
        const target = mouseRef.current;
        const originX = window.innerWidth / 2;
        const originY = window.innerHeight - GUN_BOTTOM_OFFSET;
        const dx = target.x - originX;
        const dy = target.y - originY;
        const dist = Math.hypot(dx, dy) || 1;
        // Spawn at the muzzle, a bit along the barrel.
        bulletsRef.current[slot] = {
            x: originX + (dx / dist) * 54,
            y: originY + (dy / dist) * 54,
            vx: (dx / dist) * BULLET_SPEED,
            vy: (dy / dist) * BULLET_SPEED,
        };
        lastShotAtRef.current = performance.now();
        ammoRef.current -= 1;
        setAmmo(ammoRef.current);
        if (ammoRef.current === 0) startReload();
    }, [startReload]);

    const registerHit = useCallback(
        (plane: Plane) => {
            let next: number;
            if (plane.bomb) {
                next = 0;
            } else {
                next = volPctRef.current + plane.points;
                // Overflow keeps only the trailing digits (103 → 3); floor at 0.
                if (next > 100) next %= 100;
                if (next < 0) next = 0;
            }
            volPctRef.current = next;
            onVolumeChange(next / 100);
            const id = ++boomSeqRef.current;
            const label = plane.bomb
                ? "BOOM! 0%"
                : `${plane.points > 0 ? "+" : ""}${plane.points} → ${next}%`;
            setBooms((prev) => [...prev, { id, x: plane.x, y: plane.y, bomb: plane.bomb, label }]);
            window.setTimeout(
                () => setBooms((prev) => prev.filter((b) => b.id !== id)),
                BOOM_LIFE_MS,
            );
        },
        [onVolumeChange],
    );

    // Physics loop: mutates DOM transforms directly, no per-frame React renders.
    useEffect(() => {
        let raf = 0;
        let last = performance.now();
        const tick = (now: number) => {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            const t = now / 1000;
            const planes = planesRef.current;
            const bullets = bulletsRef.current;
            let respawned = false;

            for (let i = 0; i < planes.length; i++) {
                const p = planes[i];
                p.x += p.dir * p.speed * dt;
                p.y = p.baseY + Math.sin(t * p.freq + p.phase) * p.amp;
                if ((p.dir === 1 && p.x > window.innerWidth + 120) || (p.dir === -1 && p.x < -120)) {
                    planes[i] = makePlane(true);
                    respawned = true;
                }
            }

            for (let bi = 0; bi < bullets.length; bi++) {
                const b = bullets[bi];
                if (!b) continue;
                b.vy += BULLET_GRAVITY * dt;
                b.x += b.vx * dt;
                b.y += b.vy * dt;
                if (
                    b.y > window.innerHeight + 40 ||
                    b.x < -40 ||
                    b.x > window.innerWidth + 40 ||
                    b.y < -window.innerHeight
                ) {
                    bullets[bi] = null;
                    continue;
                }
                for (let pi = 0; pi < planes.length; pi++) {
                    const p = planes[pi];
                    if (
                        Math.abs(b.x - p.x) <= PLANE_HIT_HALF_W + BULLET_RADIUS &&
                        Math.abs(b.y - p.y) <= PLANE_HIT_HALF_H + BULLET_RADIUS
                    ) {
                        registerHit(p);
                        planes[pi] = makePlane(true);
                        bullets[bi] = null;
                        respawned = true;
                        break;
                    }
                }
            }

            // Write positions straight to the DOM.
            for (let i = 0; i < planes.length; i++) {
                const el = planeElsRef.current[i];
                if (el) el.style.transform = planeTransform(planes[i]);
            }
            for (let i = 0; i < bullets.length; i++) {
                const el = bulletElsRef.current[i];
                if (!el) continue;
                const b = bullets[i];
                if (b) {
                    el.style.display = "block";
                    el.style.transform = `translate(${b.x}px, ${b.y}px) translate(-50%, -50%)`;
                } else {
                    el.style.display = "none";
                }
            }

            const turret = turretElRef.current;
            if (turret) {
                const gunX = window.innerWidth / 2;
                const gunY = window.innerHeight - GUN_BOTTOM_OFFSET;
                const mouse = mouseRef.current;
                const angle = Math.atan2(mouse.y - gunY, mouse.x - gunX) + Math.PI / 2;
                const flashing = now - lastShotAtRef.current < MUZZLE_FLASH_MS;
                turret.style.transform = `translate(-50%, -88%) rotate(${angle}rad)${flashing ? " translateY(4px)" : ""}`;
                if (flashElRef.current) {
                    flashElRef.current.style.visibility = flashing ? "visible" : "hidden";
                }
            }

            if (respawned) bumpPlanes();
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [registerHit]);

    return createPortal(
        <Box
            onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest("[data-shooter-ui]")) return;
                shoot();
            }}
            onPointerMove={(e) => {
                mouseRef.current = { x: e.clientX, y: e.clientY };
                const crosshair = crosshairElRef.current;
                if (crosshair) {
                    crosshair.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
                }
            }}
            onContextMenu={(e) => e.preventDefault()}
            sx={{
                position: "fixed",
                inset: 0,
                zIndex: OVERLAY_Z_INDEX,
                cursor: "none",
                userSelect: "none",
                touchAction: "none",
                overflow: "hidden",
                background:
                    "radial-gradient(ellipse at 50% 120%, rgba(30, 25, 18, 0.9), rgba(8, 8, 10, 0.94))",
            }}
        >
            {/* HUD: volume readout + hints */}
            <Box
                sx={{
                    position: "absolute",
                    top: 18,
                    left: 0,
                    right: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.5,
                    pointerEvents: "none",
                }}
            >
                <Typography
                    sx={{
                        fontSize: 30,
                        fontWeight: 900,
                        color: "#f97316",
                        fontVariantNumeric: "tabular-nums",
                        textShadow: "0 2px 12px rgba(249, 115, 22, 0.5)",
                        lineHeight: 1,
                    }}
                >
                    {Math.round(volume * 100)}%
                </Typography>
                <Typography sx={{ fontSize: 12, color: alpha("#fff", 0.65) }}>
                    Bắn máy bay để cộng/trừ điểm vào âm lượng (quá 100 lấy số dư) — trúng 💣 mất
                    tiếng · ESC để thoát
                </Typography>
            </Box>

            {/* Plane count control */}
            <Box
                data-shooter-ui
                sx={{
                    position: "absolute",
                    top: 16,
                    right: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1,
                    py: 0.25,
                    borderRadius: 2,
                    bgcolor: alpha("#fff", 0.08),
                    cursor: "default",
                }}
            >
                <Typography sx={{ fontSize: 12, color: alpha("#fff", 0.75), mr: 0.5 }}>
                    Máy bay
                </Typography>
                <IconButton
                    size="small"
                    onClick={() => changePlaneCount(-1)}
                    sx={{ color: "#fff", p: 0.25, cursor: "pointer" }}
                >
                    <RemoveIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#fff",
                        width: 20,
                        textAlign: "center",
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    {planeCount}
                </Typography>
                <IconButton
                    size="small"
                    onClick={() => changePlaneCount(1)}
                    sx={{ color: "#fff", p: 0.25, cursor: "pointer" }}
                >
                    <AddIcon sx={{ fontSize: 14 }} />
                </IconButton>
            </Box>

            {/* Planes — memoized sprites; only a respawned slot re-renders */}
            {planesRef.current.map((p, i) => (
                <PlaneSprite key={p.id} plane={p} slot={i} registerEl={registerPlaneEl} />
            ))}

            <BulletPool registerEl={registerBulletEl} />

            {/* Explosions + result labels */}
            {booms.map((bm) => (
                <Box
                    key={bm.id}
                    sx={{
                        position: "absolute",
                        left: bm.x,
                        top: bm.y,
                        transform: "translate(-50%, -50%)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        pointerEvents: "none",
                    }}
                >
                    <Box
                        component="span"
                        sx={{
                            fontSize: bm.bomb ? 46 : 34,
                            lineHeight: 1,
                            animation: `volumeShooterBoom ${BOOM_LIFE_MS}ms ease-out forwards`,
                            "@keyframes volumeShooterBoom": {
                                from: { transform: "scale(0.4)", opacity: 1 },
                                "60%": { transform: "scale(1.15)", opacity: 1 },
                                to: { transform: "scale(1.4)", opacity: 0 },
                            },
                        }}
                    >
                        💥
                    </Box>
                    <Typography
                        sx={{
                            fontSize: bm.bomb ? 16 : 15,
                            fontWeight: 900,
                            color: bm.bomb ? "#ef4444" : "#4ade80",
                            textShadow: "0 1px 6px rgba(0,0,0,0.7)",
                            whiteSpace: "nowrap",
                            animation: `volumeShooterLabel ${BOOM_LIFE_MS}ms ease-out forwards`,
                            "@keyframes volumeShooterLabel": {
                                from: { opacity: 1, translate: "0 0" },
                                to: { opacity: 0, translate: "0 -22px" },
                            },
                        }}
                    >
                        {bm.label}
                    </Typography>
                </Box>
            ))}

            {/* Ammo HUD next to the gun */}
            <Box
                sx={{
                    position: "absolute",
                    left: "50%",
                    bottom: 26,
                    transform: "translateX(56px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                    pointerEvents: "none",
                }}
            >
                <Box sx={{ display: "flex", gap: "4px" }}>
                    {Array.from({ length: MAG_SIZE }, (_, i) => (
                        <Box
                            key={i}
                            sx={{
                                width: 7,
                                height: 16,
                                borderRadius: "3px 3px 1px 1px",
                                bgcolor: i < ammo ? "#fbbf24" : alpha("#fff", 0.15),
                                boxShadow: i < ammo ? "0 0 5px rgba(251,191,36,0.5)" : "none",
                            }}
                        />
                    ))}
                </Box>
                {reloading ? (
                    <Box sx={{ width: "100%" }}>
                        <Typography sx={{ fontSize: 10, color: "#fbbf24", fontWeight: 700 }}>
                            Đang nạp đạn…
                        </Typography>
                        <Box
                            sx={{
                                mt: "2px",
                                height: 3,
                                borderRadius: 2,
                                bgcolor: alpha("#fff", 0.15),
                                overflow: "hidden",
                            }}
                        >
                            <Box
                                sx={{
                                    height: "100%",
                                    bgcolor: "#fbbf24",
                                    animation: `volumeShooterReload ${RELOAD_MS}ms linear forwards`,
                                    "@keyframes volumeShooterReload": {
                                        from: { width: "0%" },
                                        to: { width: "100%" },
                                    },
                                }}
                            />
                        </Box>
                    </Box>
                ) : (
                    <Typography sx={{ fontSize: 10, color: alpha("#fff", 0.5) }}>
                        {ammo}/{MAG_SIZE} viên
                    </Typography>
                )}
            </Box>

            <GunAssembly turretRef={turretElRef} flashRef={flashElRef} />

            <Crosshair elRef={crosshairElRef} />
        </Box>,
        document.body,
    );
};
