import type { AdminKeyBadgeProps } from "@components/messenger/types/components";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import { Avatar, Box } from "@mui/material";

export function AdminKeyBadge({
	src,
	fallback,
	size = 32,
	onClick,
	cursor = "default",
	showBadge = true,
}: AdminKeyBadgeProps) {
	return (
		<Box
			sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}
		>
			<Avatar
				src={src}
				onClick={onClick as React.MouseEventHandler<HTMLDivElement>}
				sx={{ width: size, height: size, cursor }}
			>
				{!src && fallback ? fallback : null}
			</Avatar>

			{showBadge && (
				<Box
					sx={{
						position: "absolute",
						top: -6,
						right: -6,
						width: 20,
						height: 20,
						borderRadius: "50%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						pointerEvents: "none",
					}}
				>
					<VpnKeyIcon
						sx={{
							fontSize: 18,
							color: "warning.main",
							transform: "rotate(45deg)",
							filter: `
			drop-shadow(0 0 2px #fff)
			drop-shadow(0 0 4px rgba(0,0,0,0.9))
			drop-shadow(0 0 8px rgba(0,0,0,0.8))
		`,
							animation: "adminKeyShine 1.8s infinite ease-in-out",

							"@keyframes adminKeyShine": {
								"0%, 100%": {
									filter: `
					drop-shadow(0 0 2px #fff)
					drop-shadow(0 0 4px rgba(0,0,0,0.9))
					drop-shadow(0 0 8px rgba(0,0,0,0.8))
				`,
									transform: "rotate(45deg) scale(1)",
								},
								"50%": {
									filter: `
					drop-shadow(0 0 3px #fff)
					drop-shadow(0 0 4px rgba(255,193,7,0.9))
					drop-shadow(0 0 5px rgba(255,193,7,0.8))
					drop-shadow(0 0 6px rgba(255,193,7,0.6))
				`,
									transform: "rotate(45deg) scale(1.15)",
								},
							},
						}}
					/>
				</Box>
			)}
		</Box>
	);
}
