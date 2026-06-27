import { useEffect, useRef } from "react";

type StreamAudioProps = {
    stream: MediaStream | null;
};

export function StreamAudio({ stream }: StreamAudioProps) {
    const ref = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        element.srcObject = stream;
        if (stream) void element.play().catch(() => {});

        return () => {
            element.srcObject = null;
        };
    }, [stream]);

    return <audio ref={ref} autoPlay aria-label="Âm thanh cuộc gọi" />;
}
