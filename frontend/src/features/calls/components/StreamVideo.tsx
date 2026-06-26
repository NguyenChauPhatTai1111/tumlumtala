import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

type StreamVideoProps = {
	stream: MediaStream | null;
	muted?: boolean;
	label: string;
	sx?: CSSProperties;
};

export function StreamVideo({ stream, muted, label, sx }: StreamVideoProps) {
	const ref = useRef<HTMLVideoElement | null>(null);

	useEffect(() => {
		if (ref.current) ref.current.srcObject = stream;
	}, [stream]);

	return (
		<video
			ref={ref}
			autoPlay
			playsInline
			muted={muted}
			aria-label={label}
			style={{
				width: "100%",
				height: "100%",
				objectFit: "cover",
				background: "#0f172a",
				...sx,
			}}
		/>
	);
}
