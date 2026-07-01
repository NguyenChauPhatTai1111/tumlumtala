import { alpha } from "@mui/material";
import type { Theme } from "@mui/material";

export const LOAD_MORE_TRIGGER_INDEX = 39;

export const SP_GREEN = "#f97316";
export const SIDEBAR_W = 280;
export const SIDEBAR_COLLAPSED_W = 96;
export const QUEUE_W = 320;
export const LYRICS_W = 450;
export const TRACK_INFO_W = 360;

export const MUSIC_CARD_SURFACE_SX = {
    bgcolor: (theme: Theme) =>
        theme.palette.mode === "light"
            ? alpha(theme.palette.primary.main, 0.04)
            : theme.palette.background.paper,
    border: "1px solid",
    borderColor: (theme: Theme) =>
        theme.palette.mode === "light" ? alpha(theme.palette.primary.main, 0.12) : "transparent",
    boxShadow: (theme: Theme) =>
        theme.palette.mode === "light"
            ? `0 10px 24px ${alpha(theme.palette.primary.main, 0.05)}`
            : "none",
};

export const MUSIC_CARD_HOVER_SX = {
    bgcolor: (theme: Theme) =>
        theme.palette.mode === "light"
            ? alpha(theme.palette.primary.main, 0.075)
            : theme.palette.action.selected,
};

export const MUSIC_CONTROL_OVERLAY_SX = {
    borderRadius: "50%",
    bgcolor: (theme: Theme) =>
        theme.palette.mode === "light"
            ? alpha(theme.palette.background.default, 0.92)
            : "rgba(12,12,12,0.72)",
    border: "1px solid",
    borderColor: (theme: Theme) =>
        theme.palette.mode === "light" ? alpha(theme.palette.primary.main, 0.14) : "transparent",
    boxShadow: (theme: Theme) =>
        theme.palette.mode === "light"
            ? `0 10px 24px ${alpha(theme.palette.primary.main, 0.12)}`
            : "none",
    backdropFilter: "blur(10px)",
};

export const MUSIC_3D_CARD_SX = {
    perspective: "1400px",
    transformStyle: "preserve-3d",
    transition: "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)",
    "& .card-bg": {
        transformStyle: "preserve-3d",
        transition:
            "transform 360ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 360ms ease, background-color 0.2s, border-color 0.2s",
    },
    "& .card-cover": {
        transform: "translateZ(0px)",
        transition: "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform",
    },
    "& .card-title": {
        transform: "translateZ(0px)",
        transition: "transform 360ms cubic-bezier(0.22, 1, 0.36, 1), color 0.2s ease",
    },
    "& .card-subtitle, & .card-badge": {
        transform: "translateZ(0px)",
        transition: "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)",
    },
    "&:hover": {
        transform: "translateY(-6px)",
    },
    "&:hover .card-bg": {
        transform: "rotateX(6deg) rotateY(-5deg) translateY(-2px)",
        boxShadow: "0 22px 36px rgba(0,0,0,0.24)",
    },
    "&:hover .card-cover": {
        transform: "translateZ(26px) scale(1.025)",
    },
    "&:hover .card-title": {
        transform: "translateZ(18px)",
    },
    "&:hover .card-subtitle": {
        transform: "translateZ(12px)",
    },
    "&:hover .card-badge": {
        transform: "translateZ(14px)",
    },
};

export const MUSIC_MENU_BACKGROUND_SX = {
    position: "relative",
    isolation: "isolate",
    background: (theme: Theme) =>
        theme.palette.mode === "light"
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.045)} 0%, ${theme.palette.background.default} 52%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.065)} 0%, ${theme.palette.background.default} 48%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
    backgroundSize: "220% 220%",
    animation: "musicMenuGradientShift 32s ease-in-out infinite",
    "@keyframes musicMenuGradientShift": {
        "0%": { backgroundPosition: "0% 50%" },
        "50%": { backgroundPosition: "100% 50%" },
        "100%": { backgroundPosition: "0% 50%" },
    },
    "&::before": {
        content: '""',
        position: "absolute",
        inset: "-18%",
        background: (theme: Theme) =>
            `linear-gradient(105deg, transparent 30%, ${alpha(
                theme.palette.common.white,
                theme.palette.mode === "light" ? 0.14 : 0.045,
            )} 48%, transparent 66%)`,
        filter: "blur(24px)",
        opacity: 0.42,
        transform: "translateX(-165%) skewX(-18deg)",
        transformOrigin: "center",
        animation: "musicMenuSheen 9s ease-in-out infinite",
        pointerEvents: "none",
        zIndex: 0,
    },
    "&::after": {
        content: '""',
        position: "absolute",
        inset: "-10%",
        background: (theme: Theme) =>
            `radial-gradient(circle at 18% 16%, ${alpha(
                theme.palette.primary.main,
                theme.palette.mode === "light" ? 0.06 : 0.045,
            )} 0%, transparent 24%), radial-gradient(circle at 82% 78%, ${alpha(
                theme.palette.secondary.main,
                theme.palette.mode === "light" ? 0.05 : 0.035,
            )} 0%, transparent 22%)`,
        pointerEvents: "none",
        zIndex: 0,
        transform: "perspective(1400px) rotateX(72deg) rotateZ(-10deg) translate3d(-4%, 8%, 0)",
        transformOrigin: "center center",
        animation: "musicAmbientDepth 28s ease-in-out infinite",
        opacity: 0.92,
    },
    "@keyframes musicMenuSheen": {
        "0%": {
            opacity: 0,
            transform: "translateX(-165%) skewX(-18deg)",
        },
        "16%": {
            opacity: 0.45,
        },
        "42%": {
            opacity: 0,
            transform: "translateX(165%) skewX(-18deg)",
        },
        "100%": {
            opacity: 0,
            transform: "translateX(165%) skewX(-18deg)",
        },
    },
    "@keyframes musicAmbientDepth": {
        "0%, 100%": {
            opacity: 0.82,
            transform: "perspective(1400px) rotateX(72deg) rotateZ(-10deg) translate3d(-4%, 8%, 0)",
        },
        "50%": {
            opacity: 1,
            transform: "perspective(1400px) rotateX(66deg) rotateZ(6deg) translate3d(4%, -6%, 0)",
        },
    },
    "& > *": {
        position: "relative",
        zIndex: 1,
    },
};

export const MUSIC_CHROME_SURFACE_SX = {
    position: "relative",
    isolation: "isolate",
    overflow: "hidden",
    "&::before": {
        content: '""',
        position: "absolute",
        inset: "-28%",
        background: (theme: Theme) =>
            `linear-gradient(110deg, transparent 32%, ${alpha(
                theme.palette.common.white,
                theme.palette.mode === "light" ? 0.07 : 0.035,
            )} 49%, transparent 67%)`,
        filter: "blur(22px)",
        opacity: 0.34,
        transform: "translateX(-170%) skewX(-18deg)",
        animation: "musicChromeSheen 14s ease-in-out infinite",
        pointerEvents: "none",
        zIndex: 0,
    },
    "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        background: (theme: Theme) =>
            `radial-gradient(circle at 14% 12%, ${alpha(
                theme.palette.primary.main,
                theme.palette.mode === "light" ? 0.05 : 0.035,
            )} 0%, transparent 28%)`,
        pointerEvents: "none",
        zIndex: 0,
    },
    "@keyframes musicChromeSheen": {
        "0%": {
            opacity: 0,
            transform: "translateX(-170%) skewX(-18deg)",
        },
        "18%": {
            opacity: 0.34,
        },
        "48%": {
            opacity: 0,
            transform: "translateX(170%) skewX(-18deg)",
        },
        "100%": {
            opacity: 0,
            transform: "translateX(170%) skewX(-18deg)",
        },
    },
    "& > *": {
        position: "relative",
        zIndex: 1,
    },
};
