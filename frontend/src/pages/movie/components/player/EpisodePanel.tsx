import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import WestIcon from "@mui/icons-material/West";
import {
	alpha,
	Box,
	Chip,
	CircularProgress,
	IconButton,
	List,
	ListItemButton,
	ListItemText,
	Stack,
	Typography,
	useTheme,
} from "@mui/material";
import type { OphimEpisodeData, OphimEpisodeServer } from "@pages/movie/types";
import type React from "react";
import type {
	CachedSeason,
	UpsertSeasonInput,
} from "@/services/movieBackendService";
import { upsertCachedSeasons } from "@/services/movieBackendService";
import type { TMDBEpisode } from "@/services/tmdbService";
import { tmdbStillUrl } from "@/services/tmdbService";

interface EpisodePanelProps {
	open: boolean;
	isTMDBSeries: boolean;
	totalSeasons: number;
	playingSeason: number;
	activeSeason: number;
	tmdbSeasonName: string;
	tmdbEpisodes: TMDBEpisode[];
	tmdbLoading: boolean;
	kkActiveServers: OphimEpisodeServer[];
	validServers: OphimEpisodeServer[];
	validEpisodes: OphimEpisodeData[];
	currentEpSlug?: string;
	currentEpRef: React.RefObject<HTMLDivElement | null>;
	selectedServer: number;
	selectedTMDBServer: number;
	hasMultipleEpisodes: boolean;
	hasMultipleServers: boolean;
	hasPrev: boolean;
	hasNext: boolean;
	flatEps: Array<{ server: OphimEpisodeServer; ep: OphimEpisodeData }>;
	currentFlatIdx: number;
	seasonSelectorOpen: boolean;
	activeEpisodeProgressMap?: Map<
		string,
		{ position: number; duration: number }
	>;
	title: string;
	baseMovieSlug: string;
	savedSeasonsRef: React.MutableRefObject<Set<string>>;
	onClose: () => void;
	onSetActiveSeason: (s: number) => void;
	onSetSeasonSelectorOpen: (v: boolean) => void;
	onSetSelectedServer: (idx: number) => void;
	onSetSelectedTMDBServer: (idx: number) => void;
	onPlayEpisode?: (server: OphimEpisodeServer, ep: OphimEpisodeData) => void;
	onTMDBEpisodeClick: (ep: TMDBEpisode) => void;
	onPrev: () => void;
	onNext: () => void;
	upsertCachedSeasons: (
		slug: string,
		seasons: UpsertSeasonInput[],
	) => Promise<CachedSeason[]>;
}

export function EpisodePanel({
	open,
	isTMDBSeries,
	totalSeasons,
	playingSeason,
	activeSeason,
	tmdbSeasonName,
	tmdbEpisodes,
	tmdbLoading,
	kkActiveServers,
	validServers,
	validEpisodes,
	currentEpSlug,
	currentEpRef,
	selectedServer,
	selectedTMDBServer,
	hasMultipleEpisodes,
	hasMultipleServers: _hasMultipleServers,
	hasPrev,
	hasNext,
	flatEps,
	currentFlatIdx,
	seasonSelectorOpen,
	activeEpisodeProgressMap,
	title,
	baseMovieSlug,
	savedSeasonsRef,
	onClose,
	onSetActiveSeason,
	onSetSeasonSelectorOpen,
	onSetSelectedServer,
	onSetSelectedTMDBServer,
	onPlayEpisode,
	onTMDBEpisodeClick,
	onPrev,
	onNext,
}: EpisodePanelProps) {
	const theme = useTheme();
	const currentServer = validServers[selectedServer];

	return (
		<Box
			sx={{
				position: "absolute",
				top: 0,
				right: 0,
				bottom: 0,
				width: { xs: "100%", sm: 500 },
				bgcolor: "rgba(255,255,255,0.05)",
				backdropFilter: "blur(16px)",
				WebkitBackdropFilter: "blur(16px)",
				zIndex: 9,
				transform: open ? "translateX(0)" : "translateX(105%)",
				transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
				display: "flex",
				flexDirection: "column",
				borderLeft: "1px solid rgba(255,255,255,0.08)",
				boxShadow: "-16px 0 40px rgba(0,0,0,0.7)",
				overflow: "hidden",
			}}
		>
			{/* ── Season selector view (full overlay) ── */}
			{isTMDBSeries && seasonSelectorOpen ? (
				<>
					{/* Season selector header: show title */}
					<Box
						sx={{
							px: 2,
							py: 1.75,
							borderBottom: "1px solid rgba(255,255,255,0.08)",
							flexShrink: 0,
						}}
					>
						<Typography
							variant="h6"
							fontWeight={700}
							noWrap
							sx={{ color: "white", fontSize: "1.15rem" }}
						>
							{title.split(" - ")[0]}
						</Typography>
					</Box>

					{/* Season list */}
					<List disablePadding sx={{ overflowY: "auto", flex: 1 }}>
						{Array.from({ length: totalSeasons }, (_, i) => i + 1).map((s) => {
							const isPlaying = playingSeason === s;
							return (
								<ListItemButton
									key={s}
									onClick={() => {
										onSetActiveSeason(s);
										onSetSeasonSelectorOpen(false);
									}}
									sx={{
										px: 2.5,
										py: 1.5,
										"&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
									}}
								>
									{isPlaying && (
										<Box
											component="span"
											sx={{
												color: "primary.main",
												fontSize: 15,
												mr: 1.5,
												lineHeight: 1,
												flexShrink: 0,
											}}
										>
											✓
										</Box>
									)}
									<ListItemText
										primary={`Phần ${s}`}
										slotProps={{
											primary: {
												sx: {
													color: isPlaying ? "primary.main" : "white",
													fontWeight: isPlaying ? 700 : 400,
													fontSize: "0.95rem",
												},
											},
										}}
									/>
								</ListItemButton>
							);
						})}
					</List>
				</>
			) : (
				<>
					{/* ── Episode list view ── */}

					{/* Header: back arrow + season name (clickable if multiple seasons) */}
					<Stack
						direction="row"
						alignItems="center"
						spacing={1}
						sx={{
							px: 1.25,
							py: 1.25,
							borderBottom: "1px solid rgba(255,255,255,0.08)",
							flexShrink: 0,
						}}
					>
						<IconButton
							size="small"
							onClick={onClose}
							sx={{ color: "rgba(255,255,255,0.8)", flexShrink: 0 }}
						>
							<WestIcon sx={{ fontSize: 18 }} />
						</IconButton>

						{isTMDBSeries ? (
							<Stack
								direction="row"
								alignItems="center"
								spacing={0.5}
								onClick={() => {
									if (totalSeasons <= 1) return;
									onSetSeasonSelectorOpen(true);
									if (
										baseMovieSlug &&
										!savedSeasonsRef.current.has(`${baseMovieSlug}:seasons`)
									) {
										savedSeasonsRef.current.add(`${baseMovieSlug}:seasons`);
										const seasonInputs = Array.from(
											{ length: totalSeasons },
											(_, i) => ({
												season_number: i + 1,
												season_slug:
													i === 0
														? baseMovieSlug
														: `${baseMovieSlug}-phan-${i + 1}`,
												name: `Phần ${i + 1}`,
											}),
										);
										void upsertCachedSeasons(baseMovieSlug, seasonInputs);
									}
								}}
								sx={{
									flex: 1,
									minWidth: 0,
									cursor: totalSeasons > 1 ? "pointer" : "default",
									"&:hover .chevron":
										totalSeasons > 1 ? { color: "white" } : {},
								}}
							>
								<Typography
									variant="subtitle1"
									fontWeight={700}
									noWrap
									sx={{ color: "white", lineHeight: 1.3 }}
								>
									{tmdbSeasonName || `Phần ${activeSeason}`}
								</Typography>
								{totalSeasons > 1 && (
									<ExpandMoreIcon
										className="chevron"
										sx={{
											fontSize: 20,
											color: "rgba(255,255,255,0.5)",
											flexShrink: 0,
											transition: "color 0.15s ease",
										}}
									/>
								)}
							</Stack>
						) : (
							<Typography
								variant="subtitle1"
								fontWeight={700}
								sx={{ color: "white", flex: 1 }}
							>
								{hasMultipleEpisodes ? "Danh sách tập" : "Chọn nguồn"}
							</Typography>
						)}
					</Stack>

					{/* Server selector (non-TMDB) */}
					{!isTMDBSeries && validServers.length > 1 && (
						<Box
							sx={{
								px: 1.5,
								pt: 1,
								pb: 0.75,
								display: "flex",
								gap: 0.75,
								flexWrap: "wrap",
								borderBottom: "1px solid rgba(255,255,255,0.08)",
								flexShrink: 0,
							}}
						>
							{validServers.map((server, idx) => (
								<Chip
									key={server.server_name}
									label={server.server_name}
									size="small"
									color={selectedServer === idx ? "primary" : "default"}
									variant={selectedServer === idx ? "filled" : "outlined"}
									onClick={() => {
										onSetSelectedServer(idx);
										if (idx !== selectedServer && onPlayEpisode) {
											const newServer = validServers[idx];
											const ep =
												newServer.server_data.find(
													(e) => e.slug === currentEpSlug,
												) ?? newServer.server_data[Math.max(0, currentFlatIdx)];
											if (ep) onPlayEpisode(newServer, ep);
										}
									}}
									sx={{ fontSize: 11, height: 24, cursor: "pointer" }}
								/>
							))}
						</Box>
					)}

					{/* Server selector (TMDB series) */}
					{isTMDBSeries && kkActiveServers.length > 1 && (
						<Box
							sx={{
								px: 1.5,
								pt: 1,
								pb: 0.75,
								display: "flex",
								gap: 0.75,
								flexWrap: "wrap",
								borderBottom: "1px solid rgba(255,255,255,0.08)",
								flexShrink: 0,
							}}
						>
							{kkActiveServers.map((server, idx) => (
								<Chip
									key={server.server_name}
									label={server.server_name}
									size="small"
									color={selectedTMDBServer === idx ? "primary" : "default"}
									variant={selectedTMDBServer === idx ? "filled" : "outlined"}
									onClick={() => onSetSelectedTMDBServer(idx)}
									sx={{ fontSize: 11, height: 24, cursor: "pointer" }}
								/>
							))}
						</Box>
					)}

					{/* TMDB episode list */}
					{isTMDBSeries ? (
						<Box sx={{ flex: 1, overflowY: "auto" }}>
							{tmdbLoading ? (
								<Box
									sx={{
										display: "flex",
										justifyContent: "center",
										pt: 5,
									}}
								>
									<CircularProgress
										size={32}
										sx={{ color: "rgba(255,255,255,0.5)" }}
									/>
								</Box>
							) : (
								tmdbEpisodes.map((ep) => {
									const stillUrl = tmdbStillUrl(ep.still_path, "w300");
									const isCurrentEp =
										activeSeason === playingSeason &&
										Boolean(
											currentEpSlug &&
												(currentEpSlug.endsWith(
													`-tap-${String(ep.episode_number).padStart(2, "0")}`,
												) ||
													currentEpSlug.endsWith(`-tap-${ep.episode_number}`) ||
													currentEpSlug ===
														`tap-${String(ep.episode_number).padStart(2, "0")}` ||
													currentEpSlug === `tap-${ep.episode_number}`),
										);
									const showDetail =
										isCurrentEp ||
										(activeSeason !== playingSeason && ep.episode_number === 1);
									const hasDetail =
										showDetail && Boolean(stillUrl || ep.overview);
									const showPause =
										isCurrentEp ||
										(activeSeason !== playingSeason && ep.episode_number === 1);
									return (
										<Box
											key={ep.episode_number}
											onClick={() => onTMDBEpisodeClick(ep)}
											sx={{
												cursor: "pointer",
												transition: "color 0.15s ease",
												"&:hover .ep-number, &:hover .ep-name": {
													color: "primary.main",
												},
											}}
										>
											{/* Top row: number + title + dash */}
											<Stack
												direction="row"
												alignItems="center"
												sx={{ px: 2, pt: 2, pb: hasDetail ? 1 : 1.5 }}
											>
												<Typography
													className="ep-number"
													variant="body2"
													sx={{
														color: isCurrentEp
															? "primary.main"
															: "rgba(255,255,255,0.55)",
														minWidth: 22,
														flexShrink: 0,
														transition: "color 0.15s ease",
													}}
												>
													{ep.episode_number}
												</Typography>
												<Typography
													className="ep-name"
													variant="body2"
													fontWeight={isCurrentEp ? 700 : 600}
													noWrap
													sx={{
														color: isCurrentEp ? "primary.main" : "white",
														flex: 1,
														mx: 0.75,
														transition: "color 0.15s ease",
													}}
												>
													{ep.name}
												</Typography>
												{/* progress bar */}
												{(() => {
													const epSlug = `tap-${String(ep.episode_number).padStart(2, "0")}`;
													const prog = activeEpisodeProgressMap?.get(epSlug);
													const pct =
														prog && prog.duration > 0
															? Math.min(
																	100,
																	(prog.position / prog.duration) * 100,
																)
															: 0;
													return (
														<Box
															sx={{
																width: 150,
																flexShrink: 0,
																position: "relative",
															}}
														>
															<Box
																className="ep-dash"
																sx={{
																	width: "100%",
																	height: 2,
																	bgcolor: "rgba(255,255,255,0.15)",
																	borderRadius: 1,
																}}
															/>
															{pct > 0 && (
																<Box
																	sx={{
																		position: "absolute",
																		top: 0,
																		left: 0,
																		width: `${pct}%`,
																		height: 2,
																		bgcolor: "primary.main",
																		borderRadius: 1,
																	}}
																/>
															)}
														</Box>
													);
												})()}
											</Stack>

											{/* Thumbnail + overview */}
											{hasDetail && (
												<Stack
													direction="row"
													spacing={1.5}
													sx={{ px: 2, pb: 2 }}
												>
													{stillUrl && (
														<Box
															sx={{
																position: "relative",
																flexShrink: 0,
															}}
														>
															<Box
																component="img"
																src={stillUrl}
																alt={ep.name}
																sx={{
																	width: 200,
																	height: 120,
																	borderRadius: 2,
																	objectFit: "cover",
																	display: "block",
																	bgcolor: "rgba(255,255,255,0.05)",
																}}
															/>
															{showPause && (
																<Box
																	sx={{
																		position: "absolute",
																		inset: 0,
																		display: "flex",
																		alignItems: "center",
																		justifyContent: "center",
																		bgcolor: "rgba(0,0,0,0.5)",
																		borderRadius: 1,
																	}}
																>
																	{isCurrentEp ? (
																		<PauseIcon
																			sx={{
																				color: "white",
																				fontSize: 28,
																			}}
																		/>
																	) : (
																		<PlayArrowIcon
																			sx={{
																				color: "white",
																				fontSize: 28,
																			}}
																		/>
																	)}
																</Box>
															)}
														</Box>
													)}
													{ep.overview && (
														<Typography
															variant="caption"
															sx={{
																color: isCurrentEp
																	? "text.secondary"
																	: "rgba(255,255,255,0.4)",
																lineHeight: 1.55,
																display: "-webkit-box",
																WebkitLineClamp: 4,
																WebkitBoxOrient: "vertical",
																overflow: "hidden",
																fontSize: "0.72rem",
															}}
														>
															{ep.overview}
														</Typography>
													)}
												</Stack>
											)}
										</Box>
									);
								})
							)}
						</Box>
					) : (
						/* Non-TMDB: original episode grid */
						<Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
							<Box
								sx={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
									gap: 0.5,
								}}
							>
								{validEpisodes.map((ep) => {
									const isCurrent = ep.slug === currentEpSlug;
									return (
										<Box
											key={ep.slug}
											ref={isCurrent ? currentEpRef : undefined}
											onClick={() =>
												currentServer && onPlayEpisode?.(currentServer, ep)
											}
											sx={{
												height: 34,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												borderRadius: 1,
												cursor: "pointer",
												fontSize: 12,
												fontWeight: isCurrent ? 700 : 400,
												bgcolor: isCurrent ? "primary.main" : "transparent",
												color: isCurrent
													? "primary.contrastText"
													: "text.primary",
												border: "1px solid",
												borderColor: isCurrent ? "primary.main" : "divider",
												transition: "all 0.15s ease",
												"&:hover": {
													bgcolor: isCurrent
														? "primary.dark"
														: alpha(theme.palette.primary.main, 0.18),
													borderColor: "primary.main",
												},
												userSelect: "none",
											}}
										>
											{ep.name}
										</Box>
									);
								})}
							</Box>
						</Box>
					)}

					{/* Prev / Next episode CTA (non-TMDB) */}
					{!isTMDBSeries && (hasPrev || hasNext) && (
						<Box
							sx={{
								px: 1.5,
								py: 1,
								borderTop: "1px solid rgba(255,255,255,0.08)",
								flexShrink: 0,
								display: "flex",
								gap: 1,
							}}
						>
							{hasPrev && (
								<Box
									onClick={onPrev}
									sx={{
										flex: 1,
										display: "flex",
										alignItems: "center",
										gap: 1,
										px: 1.25,
										py: 0.75,
										borderRadius: 1.5,
										cursor: "pointer",
										bgcolor: alpha(theme.palette.primary.main, 0.1),
										border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
										"&:hover": {
											bgcolor: alpha(theme.palette.primary.main, 0.18),
										},
										transition: "background-color 0.15s ease",
									}}
								>
									<SkipPreviousIcon
										sx={{
											fontSize: 18,
											color: "primary.main",
											flexShrink: 0,
										}}
									/>
									<Box sx={{ minWidth: 0 }}>
										<Typography
											variant="caption"
											color="text.secondary"
											sx={{ display: "block", lineHeight: 1.2 }}
										>
											Tập trước
										</Typography>
										<Typography
											variant="caption"
											fontWeight={700}
											noWrap
											sx={{ display: "block", lineHeight: 1.3 }}
										>
											Tập {flatEps[currentFlatIdx - 1]?.ep.name}
										</Typography>
									</Box>
								</Box>
							)}
							{hasNext && (
								<Box
									onClick={onNext}
									sx={{
										flex: 1,
										display: "flex",
										alignItems: "center",
										gap: 1,
										px: 1.25,
										py: 0.75,
										borderRadius: 1.5,
										cursor: "pointer",
										bgcolor: alpha(theme.palette.primary.main, 0.1),
										border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
										"&:hover": {
											bgcolor: alpha(theme.palette.primary.main, 0.18),
										},
										transition: "background-color 0.15s ease",
									}}
								>
									<SkipNextIcon
										sx={{
											fontSize: 18,
											color: "primary.main",
											flexShrink: 0,
										}}
									/>
									<Box sx={{ minWidth: 0 }}>
										<Typography
											variant="caption"
											color="text.secondary"
											sx={{ display: "block", lineHeight: 1.2 }}
										>
											Tập tiếp
										</Typography>
										<Typography
											variant="caption"
											fontWeight={700}
											noWrap
											sx={{ display: "block", lineHeight: 1.3 }}
										>
											Tập {flatEps[currentFlatIdx + 1]?.ep.name}
										</Typography>
									</Box>
								</Box>
							)}
						</Box>
					)}
				</>
			)}
		</Box>
	);
}
