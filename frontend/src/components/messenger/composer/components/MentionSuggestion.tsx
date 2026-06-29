import { Avatar, Box, Paper, Popper, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { resolveCdnUrl } from "@/utils/urlUtils";
import type { Participant } from "@/types/messenger";

type Props = {
    suggestions: Participant[];
    highlightIndex: number;
    onSelect: (p: Participant) => void;
    anchorEl?: HTMLElement | null;
};

export function MentionSuggestion({ suggestions, highlightIndex, onSelect, anchorEl }: Props) {
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        itemRefs.current[highlightIndex]?.scrollIntoView({ block: "nearest" });
    }, [highlightIndex]);

    if (suggestions.length === 0) return null;

    const list = (
        <Paper
            elevation={8}
            sx={{
                zIndex: 1400,
                maxHeight: 240,
                overflowY: "auto",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
            }}
        >
            {suggestions.map((p, idx) => {
                const isActive = idx === highlightIndex;
                return (
                    <Box
                        key={p.id}
                        ref={(el: HTMLDivElement | null) => { itemRefs.current[idx] = el; }}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            onSelect(p);
                        }}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            px: 2,
                            py: 1,
                            cursor: "pointer",
                            bgcolor: isActive ? "primary.main" : "background.paper",
                            color: isActive ? "primary.contrastText" : "text.primary",
                            "&:hover": {
                                bgcolor: isActive ? "primary.dark" : "action.hover",
                            },
                            transition: "background-color 0.12s",
                        }}
                    >
                        <Avatar
                            src={resolveCdnUrl(p.avatar)}
                            sx={{
                                width: 32,
                                height: 32,
                                fontSize: 14,
                                outline: isActive ? "2px solid rgba(255,255,255,0.6)" : "none",
                            }}
                        >
                            {(p.nickname || p.fullname)?.[0]}
                        </Avatar>
                        <Typography variant="body2" fontWeight={isActive ? 700 : 500}>
                            {p.nickname || p.fullname}
                        </Typography>
                    </Box>
                );
            })}
        </Paper>
    );

    // If anchorEl is provided, use Popper (portal) to escape overflow:hidden containers
    if (anchorEl) {
        return (
            <Popper
                open
                anchorEl={anchorEl}
                placement="top-start"
                modifiers={[{ name: "offset", options: { offset: [0, 8] } }]}
                sx={{ zIndex: 1400, width: anchorEl.offsetWidth }}
            >
                {list}
            </Popper>
        );
    }

    // Fallback: inline absolute positioning (for non-clipped contexts)
    return (
        <Box
            sx={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: 0,
                right: 0,
                zIndex: 1400,
            }}
        >
            {list}
        </Box>
    );
}
