import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import GroupAddOutlinedIcon from "@mui/icons-material/GroupAddOutlined";
import PersonSearchOutlinedIcon from "@mui/icons-material/PersonSearchOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

const STEPS = [
	{
		number: 1,
		icon: <PersonSearchOutlinedIcon sx={{ fontSize: { xs: 22, md: 30 } }} />,
		title: "Tìm người dùng",
		short: "Tìm trong danh sách",
		description: "Tìm kiếm bạn bè hoặc đồng nghiệp trong danh sách liên hệ",
	},
	{
		number: 2,
		icon: <GroupAddOutlinedIcon sx={{ fontSize: { xs: 22, md: 30 } }} />,
		title: "Tạo cuộc trò chuyện",
		short: "Nhắn riêng hoặc nhóm",
		description: "Nhắn tin riêng tư hoặc tạo nhóm với nhiều người",
	},
	{
		number: 3,
		icon: <SendOutlinedIcon sx={{ fontSize: { xs: 22, md: 30 } }} />,
		title: "Gửi tin nhắn",
		short: "Văn bản, ảnh, file",
		description: "Chia sẻ văn bản, hình ảnh, file và biểu cảm dễ dàng",
	},
];

export const MessengerLanding = () => {
	return (
		<Box
			sx={(theme) => ({
				flex: 1,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: { xs: 2.5, md: 5 },
				p: { xs: 3, md: 5 },
				background: `linear-gradient(160deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${theme.palette.background.default} 55%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
				overflow: "hidden",
				position: "relative",
			})}
		>
			{/* Decorative blobs */}
			<Box
				sx={(theme) => ({
					position: "absolute",
					width: 320,
					height: 320,
					borderRadius: "50%",
					background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.14)} 0%, transparent 70%)`,
					top: -80,
					right: -60,
					pointerEvents: "none",
				})}
			/>
			<Box
				sx={(theme) => ({
					position: "absolute",
					width: 240,
					height: 240,
					borderRadius: "50%",
					background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.12)} 0%, transparent 70%)`,
					bottom: 40,
					left: -40,
					pointerEvents: "none",
				})}
			/>

			{/* Hero icon */}
			<Box sx={{ position: "relative", display: "inline-flex" }}>
				<Box
					sx={(theme) => ({
						width: { xs: 70, md: 100 },
						height: { xs: 70, md: 100 },
						borderRadius: "50%",
						background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.35)}`,
					})}
				>
					<ChatBubbleOutlineIcon
						sx={{ fontSize: { xs: 36, md: 50 }, color: "primary.contrastText" }}
					/>
				</Box>
				{/* Ping ring */}
				<Box
					sx={(theme) => ({
						position: "absolute",
						inset: -8,
						borderRadius: "50%",
						border: "2px solid",
						borderColor: alpha(theme.palette.primary.main, 0.28),
						animation: "ping 2.4s ease-in-out infinite",
						"@keyframes ping": {
							"0%": { transform: "scale(1)", opacity: 0.6 },
							"100%": { transform: "scale(1.5)", opacity: 0 },
						},
					})}
				/>
			</Box>

			{/* Title block */}
			<Box sx={{ textAlign: "center", maxWidth: 420 }}>
				<Typography
					variant="h5"
					fontWeight={800}
					gutterBottom
					sx={{ color: "text.primary", letterSpacing: -0.5 }}
				>
					Chào mừng đến với Messenger
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Chọn một cuộc trò chuyện từ danh sách bên trái hoặc tạo cuộc trò
					chuyện mới để bắt đầu
				</Typography>
			</Box>

			{/* Step cards */}
			<Box
				sx={{
					display: "flex",
					flexDirection: "row",
					gap: { xs: 1, md: 2 },
					justifyContent: "center",
					alignItems: "stretch",
					width: "100%",
					maxWidth: 680,
				}}
			>
				{STEPS.map((step) => (
					<Paper
						key={step.number}
						elevation={0}
						sx={(theme) => ({
							flex: 1,
							p: { xs: 1.5, md: 2.5 },
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: { xs: 0.75, md: 1.5 },
							borderRadius: 4,
							border: "1px solid",
							borderColor: "divider",
							bgcolor: alpha(theme.palette.background.paper, 0.75),
							backdropFilter: "blur(10px)",
							transition: "transform 0.2s ease, box-shadow 0.2s ease",
							"&:hover": {
								transform: "translateY(-5px)",
								boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
							},
						})}
					>
						{/* Number badge */}
						<Box
							sx={(theme) => ({
								width: { xs: 28, md: 38 },
								height: { xs: 28, md: 38 },
								borderRadius: "50%",
								background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: theme.palette.primary.contrastText,
								fontWeight: 800,
								fontSize: { xs: 13, md: 17 },
								boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
								flexShrink: 0,
							})}
						>
							{step.number}
						</Box>

						{/* Feature icon */}
						<Box
							sx={{
								color: "primary.main",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							{step.icon}
						</Box>

						<Box sx={{ textAlign: "center" }}>
							<Typography
								variant="subtitle2"
								fontWeight={700}
								sx={{
									color: "text.primary",
									mb: 0.5,
									fontSize: { xs: "0.7rem", md: "0.875rem" },
								}}
							>
								{step.title}
							</Typography>
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{ lineHeight: 1.5, display: "block" }}
							>
								<Box
									component="span"
									sx={{ display: { xs: "none", sm: "inline" } }}
								>
									{step.description}
								</Box>
								<Box
									component="span"
									sx={{ display: { xs: "inline", sm: "none" } }}
								>
									{step.short}
								</Box>
							</Typography>
						</Box>
					</Paper>
				))}
			</Box>
		</Box>
	);
};
