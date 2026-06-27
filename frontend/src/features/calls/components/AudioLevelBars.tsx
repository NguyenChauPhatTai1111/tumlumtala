import { Box } from "@mui/material";
import { useEffect, useRef } from "react";

const BAR_COUNT = 5;
const MIN_HEIGHT = 8;
const MAX_HEIGHT = 56;

export function AudioLevelBars({ stream }: { stream: MediaStream | null }) {
    const barsRef = useRef<Array<HTMLSpanElement | null>>([]);

    useEffect(() => {
        if (!stream?.getAudioTracks().length) {
            setBars(barsRef.current, Array(BAR_COUNT).fill(0));
            return;
        }

        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        const frequencies = new Uint8Array(analyser.frequencyBinCount);
        let animationFrame = 0;
        let lastPaint = 0;

        analyser.fftSize = 256;
        analyser.minDecibels = -70;
        analyser.maxDecibels = -20;
        analyser.smoothingTimeConstant = 0.78;
        source.connect(analyser);
        void audioContext.resume().catch(() => {});

        const paint = (timestamp: number) => {
            animationFrame = requestAnimationFrame(paint);
            if (timestamp - lastPaint < 50) return;
            lastPaint = timestamp;

            analyser.getByteFrequencyData(frequencies);
            const minBin = Math.max(
                1,
                Math.floor((100 * analyser.fftSize) / audioContext.sampleRate),
            );
            const maxBin = Math.min(
                frequencies.length - 1,
                Math.ceil((4000 * analyser.fftSize) / audioContext.sampleRate),
            );
            const levels = Array.from({ length: BAR_COUNT }, (_, index) => {
                const start = Math.floor(minBin * (maxBin / minBin) ** (index / BAR_COUNT));
                const end = Math.max(
                    start + 1,
                    Math.floor(minBin * (maxBin / minBin) ** ((index + 1) / BAR_COUNT)),
                );
                let total = 0;
                for (let bin = start; bin < end; bin += 1) {
                    total += frequencies[bin] ?? 0;
                }
                const average = total / (end - start);
                return Math.max(0, (average - 18) / 237);
            });
            setBars(barsRef.current, levels);
        };

        animationFrame = requestAnimationFrame(paint);
        return () => {
            cancelAnimationFrame(animationFrame);
            source.disconnect();
            analyser.disconnect();
            void audioContext.close();
        };
    }, [stream]);

    return (
        <Box
            role="img"
            aria-label="Mức âm lượng của người đang nói"
            sx={{
                height: MAX_HEIGHT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.75,
            }}
        >
            {Array.from({ length: BAR_COUNT }, (_, index) => (
                <Box
                    key={index}
                    component="span"
                    ref={(element: HTMLSpanElement | null) => {
                        barsRef.current[index] = element;
                    }}
                    sx={{
                        display: "block",
                        width: 6,
                        height: MIN_HEIGHT,
                        borderRadius: 999,
                        bgcolor: "currentColor",
                        opacity: 0.55,
                        transition: "height 80ms ease-out, opacity 80ms ease-out",
                    }}
                />
            ))}
        </Box>
    );
}

function setBars(bars: Array<HTMLSpanElement | null>, levels: number[]) {
    bars.forEach((bar, index) => {
        if (!bar) return;
        const level = levels[index] ?? 0;
        bar.style.height = `${MIN_HEIGHT + level * (MAX_HEIGHT - MIN_HEIGHT)}px`;
        bar.style.opacity = String(0.55 + level * 0.45);
    });
}
