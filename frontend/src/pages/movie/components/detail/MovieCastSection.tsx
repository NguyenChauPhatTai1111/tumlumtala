import { alpha, Box, Stack, Typography, useTheme } from "@mui/material";
import type { TMDBCastMember, TMDBCrewMember } from "@/services/tmdbService";
import { tmdbProfileUrl } from "@/services/tmdbService";

export const MovieCastSection = ({
	tmdbDirectors,
	tmdbCast,
	kkDirectors,
	kkActors,
	onPersonClick,
}: {
	tmdbDirectors: TMDBCrewMember[];
	tmdbCast: TMDBCastMember[];
	kkDirectors: string[];
	kkActors: string[];
	onPersonClick: (id: number) => void;
}) => {
	const theme = useTheme();

	return (
		<>
			{/* ── Directors ── */}
			{(() => {
				if (tmdbDirectors.length > 0) {
					return (
						<Box sx={{ mb: 2 }}>
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{
									display: "block",
									mb: 1,
									fontWeight: 600,
									textTransform: "uppercase",
									letterSpacing: 0.5,
								}}
							>
								Đạo diễn
							</Typography>

							<Box
								sx={{
									display: "grid",
									gridTemplateColumns: {
										xs: "repeat(5, 1fr)",
										sm: "repeat(7, 1fr)",
										md: "repeat(10, 1fr)",
									},
									gap: 1,
								}}
							>
								{tmdbDirectors.map((d) => {
									const avatar = tmdbProfileUrl(d.profile_path, "w185");

									return (
										<Stack
											key={d.id}
											alignItems="center"
											spacing={0.5}
											sx={{
												cursor: "pointer",
												minWidth: 0,
											}}
											onClick={() => onPersonClick(d.id)}
										>
											<Box
												sx={{
													width: "100%",
													aspectRatio: "1/1",
													borderRadius: "50%",
													overflow: "hidden",
													border: `2px solid ${alpha(
														theme.palette.primary.main,
														0.6,
													)}`,
													bgcolor: alpha(theme.palette.common.white, 0.06),
													transition: "border-color 0.2s",
													"&:hover": {
														borderColor: alpha(theme.palette.primary.main, 0.9),
													},
												}}
											>
												{avatar ? (
													<Box
														component="img"
														src={avatar}
														alt={d.name}
														onError={(e) => {
															const img = e.currentTarget as HTMLImageElement;
															img.style.display = "none";
															const fb =
																img.nextElementSibling as HTMLElement | null;
															if (fb) fb.style.display = "flex";
														}}
														sx={{
															width: "100%",
															height: "100%",
															objectFit: "cover",
															display: "block",
														}}
													/>
												) : null}
												<Box
													sx={{
														width: "100%",
														height: "100%",
														display: avatar ? "none" : "flex",
														alignItems: "center",
														justifyContent: "center",
														color: "text.disabled",
														fontSize: 18,
														fontWeight: 700,
													}}
												>
													{d.name.charAt(0)}
												</Box>
											</Box>

											<Typography
												variant="caption"
												align="center"
												fontWeight={700}
												sx={{
													fontSize: 10,
													lineHeight: 1.3,
													display: "-webkit-box",
													WebkitLineClamp: 2,
													WebkitBoxOrient: "vertical",
													overflow: "hidden",
													width: "100%",
												}}
											>
												{d.name}
											</Typography>

											<Typography
												variant="caption"
												align="center"
												color="text.secondary"
												sx={{
													fontSize: 9,
													fontStyle: "italic",
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
													width: "100%",
												}}
											>
												{d.job || "Director"}
											</Typography>
										</Stack>
									);
								})}
							</Box>
						</Box>
					);
				}

				if (kkDirectors.length > 0) {
					return (
						<Typography variant="caption" sx={{ display: "block", mb: 1.5 }}>
							<Box component="span" color="text.secondary">
								Đạo diễn:
							</Box>{" "}
							<Box
								component="span"
								sx={{
									color: "primary.main",
									fontWeight: 600,
								}}
							>
								{kkDirectors.join(", ")}
							</Box>
						</Typography>
					);
				}

				return null;
			})()}

			{/* ── Cast ── */}
			{(() => {
				if (tmdbCast.length > 0) {
					return (
						<Box sx={{ mb: 2 }}>
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{
									display: "block",
									mb: 1,
									fontWeight: 600,
									textTransform: "uppercase",
									letterSpacing: 0.5,
								}}
							>
								Diễn viên
							</Typography>
							<Box
								sx={{
									display: "grid",
									gridTemplateColumns: {
										xs: "repeat(5, 1fr)",
										sm: "repeat(7, 1fr)",
										md: "repeat(10, 1fr)",
									},
									gap: 1,
								}}
							>
								{tmdbCast.map((c) => {
									const avatar = tmdbProfileUrl(c.profile_path, "w185");
									return (
										<Stack
											key={c.id}
											alignItems="center"
											spacing={0.5}
											sx={{ cursor: "pointer", minWidth: 0 }}
											onClick={() => onPersonClick(c.id)}
										>
											<Box
												sx={{
													width: "100%",
													aspectRatio: "1/1",
													borderRadius: "50%",
													overflow: "hidden",
													border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
													bgcolor: alpha(theme.palette.common.white, 0.06),
													transition: "border-color 0.2s",
													"&:hover": {
														borderColor: alpha(theme.palette.primary.main, 0.8),
													},
												}}
											>
												{avatar ? (
													<Box
														component="img"
														src={avatar}
														alt={c.name}
														onError={(e) => {
															const img = e.currentTarget as HTMLImageElement;
															img.style.display = "none";
															const fb =
																img.nextElementSibling as HTMLElement | null;
															if (fb) fb.style.display = "flex";
														}}
														sx={{
															width: "100%",
															height: "100%",
															objectFit: "cover",
															display: "block",
														}}
													/>
												) : null}
												<Box
													sx={{
														width: "100%",
														height: "100%",
														display: avatar ? "none" : "flex",
														alignItems: "center",
														justifyContent: "center",
														color: "text.disabled",
														fontSize: 18,
														fontWeight: 700,
													}}
												>
													{c.name.charAt(0)}
												</Box>
											</Box>
											<Typography
												variant="caption"
												align="center"
												fontWeight={700}
												sx={{
													fontSize: 10,
													lineHeight: 1.3,
													display: "-webkit-box",
													WebkitLineClamp: 2,
													WebkitBoxOrient: "vertical",
													overflow: "hidden",
													width: "100%",
												}}
											>
												{c.name}
											</Typography>
											{c.character && (
												<Typography
													variant="caption"
													align="center"
													color="text.secondary"
													sx={{
														fontSize: 9,
														fontStyle: "italic",
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
														width: "100%",
													}}
												>
													{c.character}
												</Typography>
											)}
										</Stack>
									);
								})}
							</Box>
						</Box>
					);
				}
				if (kkActors.length > 0) {
					return (
						<Typography variant="caption" sx={{ display: "block", mb: 1.5 }}>
							<Box component="span" color="text.secondary">
								Diễn viên:{" "}
							</Box>
							<Box
								component="span"
								sx={{ color: "primary.main", fontWeight: 600 }}
							>
								{kkActors.slice(0, 8).join(", ")}
							</Box>
						</Typography>
					);
				}
				return null;
			})()}
		</>
	);
};
