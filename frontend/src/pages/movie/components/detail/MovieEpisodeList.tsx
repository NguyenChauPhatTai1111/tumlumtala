import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
	alpha,
	Box,
	Button,
	CircularProgress,
	Collapse,
	FormControl,
	IconButton,
	MenuItem,
	Select,
	Stack,
	Typography,
	useTheme,
} from "@mui/material";
import type {
	OphimEpisodeData,
	OphimEpisodeServer,
	OphimMovieDetail,
	OphimMovieItem,
} from "@pages/movie/types";
import type { TMDBEpisode } from "@/services/tmdbService";
import { tmdbStillUrl } from "@/services/tmdbService";

const isValidEp = (ep: OphimEpisodeData) =>
	Boolean(ep.link_embed || ep.link_m3u8 || ep.slug);

export const MovieEpisodeList = ({
	movie,
	detail,
	episodes,
	activeEpisodes,
	currentServer,
	selectedServer,
	setSelectedServer,
	episodesExpanded,
	setEpisodesExpanded,
	isTMDBSeries,
	totalSeasons,
	activeSeason,
	setActiveSeason,
	tmdbSeasonName,
	tmdbEpisodes,
	tmdbEpisodesLoading,
	isMultiEpisodeMovie,
	activeSeasonProgressMap,
	activeSeasonSlug,
	activeSeasonQuery,
	playingSeason,
	handlePlayEpisode,
}: {
	movie: OphimMovieItem;
	detail: OphimMovieDetail | undefined;
	episodes: OphimEpisodeServer[];
	activeEpisodes: OphimEpisodeServer[];
	currentServer: OphimEpisodeServer | undefined;
	selectedServer: number;
	setSelectedServer: (idx: number) => void;
	episodesExpanded: boolean;
	setEpisodesExpanded: (fn: (v: boolean) => boolean) => void;
	isTMDBSeries: boolean;
	totalSeasons: number;
	activeSeason: number;
	setActiveSeason: (season: number) => void;
	tmdbSeasonName: string;
	tmdbEpisodes: TMDBEpisode[];
	tmdbEpisodesLoading: boolean;
	isMultiEpisodeMovie: boolean;
	activeSeasonProgressMap:
		| Map<string, { position: number; duration: number }>
		| undefined;
	activeSeasonSlug: string | null;
	activeSeasonQuery: { data?: { movie?: OphimMovieDetail | null } | null };
	playingSeason: number;
	handlePlayEpisode: (
		m: OphimMovieItem,
		d: OphimMovieDetail,
		server: OphimEpisodeServer,
		ep: OphimEpisodeData,
	) => void;
}) => {
	const theme = useTheme();

	return (
		<Box>
			<Stack
				direction="row"
				alignItems="center"
				justifyContent="space-between"
				onClick={() => setEpisodesExpanded((v) => !v)}
				sx={{
					mb: episodesExpanded ? 1 : 0,
					mx: -1,
					p: 1,
					cursor: "pointer",
					userSelect: "none",
					borderRadius: 1,
					"&:hover": {
						bgcolor: alpha(theme.palette.common.white, 0.04),
					},
				}}
			>
				<Stack direction="row" alignItems="center" spacing={0.5}>
					<Typography variant="h6" fontWeight={800}>
						{isMultiEpisodeMovie ? "Danh sách tập phim" : "Nguồn chiếu"}
					</Typography>
					<IconButton
						size="small"
						tabIndex={-1}
						sx={{
							color: "text.secondary",
							transition: "transform 0.25s ease",
							transform: episodesExpanded ? "rotate(0deg)" : "rotate(-90deg)",
							pointerEvents: "none",
						}}
					>
						<ExpandMoreIcon fontSize="small" />
					</IconButton>
				</Stack>
				{isTMDBSeries && totalSeasons > 1 && (
					<FormControl size="small" onClick={(e) => e.stopPropagation()}>
						<Select
							value={activeSeason}
							onChange={(e) => setActiveSeason(Number(e.target.value))}
							sx={{
								fontSize: 13,
								fontWeight: 600,
								".MuiOutlinedInput-notchedOutline": {
									borderColor: "divider",
								},
								"&:hover .MuiOutlinedInput-notchedOutline": {
									borderColor: "text.secondary",
								},
								minWidth: 150,
							}}
							IconComponent={ExpandMoreIcon}
						>
							{Array.from({ length: totalSeasons }, (_, i) => i + 1).map(
								(s) => (
									<MenuItem key={s} value={s}>
										{`Phần ${s}`}
									</MenuItem>
								),
							)}
						</Select>
					</FormControl>
				)}
				{isTMDBSeries && totalSeasons === 1 && tmdbSeasonName && (
					<Typography variant="body2" color="text.secondary" fontWeight={600}>
						{tmdbSeasonName}
					</Typography>
				)}
			</Stack>

			<Collapse in={episodesExpanded} timeout={250}>
				{/* TMDB episode list */}
				{isTMDBSeries ? (
					tmdbEpisodesLoading ? (
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								py: 4,
							}}
						>
							<CircularProgress size={28} />
						</Box>
					) : (
						<Box>
							{/* Server selector — chỉ hiện khi có nhiều nguồn */}
							{episodes.filter((s) => s.server_data.some(isValidEp)).length >
								1 && (
								<Stack
									direction="row"
									spacing={1}
									sx={{ mb: 1.5, overflowX: "auto", pb: 0.5 }}
								>
									{episodes.map((server, idx) =>
										server.server_data.some(isValidEp) ? (
											<Button
												key={server.server_name}
												variant={
													selectedServer === idx ? "contained" : "outlined"
												}
												size="small"
												onClick={() => setSelectedServer(idx)}
												sx={{
													whiteSpace: "nowrap",
													flexShrink: 0,
												}}
											>
												{server.server_name}
											</Button>
										) : null,
									)}
								</Stack>
							)}

							{tmdbEpisodes.map((ep) => {
								const stillUrl = tmdbStillUrl(ep.still_path, "w300");
								const epSlugSuffix = `tap-${String(ep.episode_number).padStart(2, "0")}`;
								const isCurrentEp =
									activeSeason === playingSeason &&
									Boolean(
										movie?.watchProgress?.episodeSlug &&
											(movie.watchProgress.episodeSlug.endsWith(
												`-${epSlugSuffix}`,
											) ||
												movie.watchProgress.episodeSlug === epSlugSuffix ||
												movie.watchProgress.episodeSlug.endsWith(
													`-tap-${ep.episode_number}`,
												) ||
												movie.watchProgress.episodeSlug ===
													`tap-${ep.episode_number}`),
									);
								const prog = activeSeasonProgressMap?.get(epSlugSuffix);
								const pct =
									prog && prog.duration > 0
										? Math.min(100, (prog.position / prog.duration) * 100)
										: 0;
								const runtimeMin = ep.runtime ? `${ep.runtime}ph` : null;

								return (
									<Box
										key={ep.episode_number}
										onClick={() => {
											if (!detail) return;
											const server = activeEpisodes[
												selectedServer
											]?.server_data.some(isValidEp)
												? activeEpisodes[selectedServer]
												: activeEpisodes.find((s) =>
														s.server_data.some(isValidEp),
													);
											const epData =
												server?.server_data.find(
													(e) =>
														isValidEp(e) &&
														(e.slug?.endsWith(`-${epSlugSuffix}`) ||
															e.slug === epSlugSuffix ||
															e.slug?.endsWith(`-tap-${ep.episode_number}`) ||
															e.slug === `tap-${ep.episode_number}`),
												) ?? server?.server_data.find(isValidEp);
											if (!server || !epData) return;
											const rawTargetDetail =
												activeSeason === playingSeason
													? detail
													: (activeSeasonQuery.data?.movie ?? detail);
											const originalTotalSeasons =
												detail?.tmdb?.season ?? movie?.tmdb?.season;
											const targetDetail =
												rawTargetDetail &&
												rawTargetDetail !== detail &&
												originalTotalSeasons &&
												rawTargetDetail.tmdb
													? {
															...rawTargetDetail,
															tmdb: {
																...rawTargetDetail.tmdb,
																season: originalTotalSeasons,
															},
														}
													: rawTargetDetail;
											const targetMovie =
												activeSeason === playingSeason
													? movie
													: {
															...movie,
															slug: activeSeasonSlug ?? movie.slug,
															name:
																activeSeasonQuery.data?.movie?.name ??
																movie.name,
														};
											handlePlayEpisode(
												targetMovie,
												targetDetail,
												server,
												epData,
											);
										}}
										sx={{
											cursor: "pointer",
											borderRadius: 1,
											"&:hover": {
												bgcolor: alpha(theme.palette.common.white, 0.05),
											},
											transition: "background-color 0.15s ease",
										}}
									>
										<Stack
											direction="row"
											alignItems="center"
											sx={{
												px: 1,
												pt: stillUrl || ep.overview ? 1.5 : 1,
												pb: stillUrl || ep.overview ? 1.5 : 1,
											}}
										>
											{/* Số thứ tự ngoài cùng trái */}
											<Typography
												sx={{
													minWidth: 32,
													flexShrink: 0,
													fontSize: 25,
													color: isCurrentEp
														? "primary.main"
														: "text.secondary",
													fontWeight: isCurrentEp ? 700 : 400,
													textAlign: "center",
													alignSelf: "center",
												}}
											>
												{ep.episode_number}
											</Typography>

											{/* Ảnh still */}
											{stillUrl && (
												<Box
													sx={{
														position: "relative",
														flexShrink: 0,
														mx: 1.5,
														"&:hover .ep-play-overlay": {
															opacity: 1,
														},
													}}
												>
													<Box
														component="img"
														src={stillUrl}
														alt={ep.name}
														sx={{
															width: 160,
															height: 90,
															borderRadius: 1,
															objectFit: "cover",
															display: "block",
															bgcolor: "rgba(255,255,255,0.05)",
														}}
													/>
													<Box
														className="ep-play-overlay"
														sx={{
															position: "absolute",
															inset: 0,
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															opacity: isCurrentEp ? 1 : 0,
															transition: "opacity 0.15s",
															bgcolor: "rgba(0,0,0,0.45)",
															borderRadius: 1,
														}}
													>
														<PlayArrowIcon
															sx={{
																color: "white",
																fontSize: 24,
															}}
														/>
													</Box>
												</Box>
											)}

											{/* Cột phải: tên + overview */}
											<Box
												sx={{
													flex: 1,
													minWidth: 0,
													display: "flex",
													flexDirection: "column",
													justifyContent: stillUrl ? "flex-start" : "center",
												}}
											>
												<Typography
													variant="body2"
													fontWeight={isCurrentEp ? 700 : 600}
													sx={{
														color: isCurrentEp
															? "primary.main"
															: "text.primary",
														lineHeight: 1.4,
														mb: ep.overview ? 0.5 : 0,
													}}
												>
													{ep.name}
												</Typography>
												{ep.overview && (
													<Typography
														variant="caption"
														sx={{
															color: "text.secondary",
															lineHeight: 1.55,
															display: "-webkit-box",
															WebkitLineClamp: stillUrl ? 3 : 4,
															WebkitBoxOrient: "vertical",
															overflow: "hidden",
															fontSize: "0.72rem",
															pr: 3,
														}}
													>
														{ep.overview}
													</Typography>
												)}
											</Box>
											{/* Cột ngoài cùng phải: runtime trên, progress bar dưới */}
											<Box
												sx={{
													width: 150,
													flexShrink: 0,
													display: "flex",
													flexDirection: "column",
													alignItems: "flex-end",
													gap: 0.5,
												}}
											>
												{runtimeMin && (
													<Typography
														variant="caption"
														color="text.secondary"
														sx={{ lineHeight: 1.2 }}
													>
														{runtimeMin}
													</Typography>
												)}
												<Box sx={{ width: "100%", position: "relative" }}>
													<Box
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
											</Box>
										</Stack>
									</Box>
								);
							})}
						</Box>
					)
				) : (
					/* Non-TMDB: server tabs + episode grid */
					<>
						{episodes.length > 1 && (
							<Stack
								direction="row"
								spacing={1}
								sx={{ mb: 1.5, overflowX: "auto", pb: 0.5 }}
							>
								{episodes.map((server, idx) =>
									server.server_data.some(isValidEp) ? (
										<Button
											key={server.server_name}
											variant={
												selectedServer === idx ? "contained" : "outlined"
											}
											size="small"
											onClick={() => setSelectedServer(idx)}
											sx={{
												whiteSpace: "nowrap",
												flexShrink: 0,
											}}
										>
											{server.server_name}
										</Button>
									) : null,
								)}
							</Stack>
						)}
						{isMultiEpisodeMovie && currentServer && (
							<Box>
								{currentServer.server_data.filter(isValidEp).map((ep) => {
									const prog = activeSeasonProgressMap?.get(ep.slug);
									const pct =
										prog && prog.duration > 0
											? Math.min(100, (prog.position / prog.duration) * 100)
											: 0;
									const isCurrentEp =
										ep.slug === movie?.watchProgress?.episodeSlug;
									return (
										<Box
											key={ep.slug}
											onClick={() => {
												if (!detail) return;
												handlePlayEpisode(movie, detail, currentServer, ep);
											}}
											sx={{
												cursor: "pointer",
												borderRadius: 1,
												"&:hover": {
													bgcolor: alpha(theme.palette.common.white, 0.05),
												},
												transition: "background-color 0.15s ease",
											}}
										>
											<Stack
												direction="row"
												alignItems="center"
												sx={{
													px: 1,
													py: 1.25,
													bgcolor: isCurrentEp
														? alpha(theme.palette.primary.main, 0.12)
														: "transparent",
													borderRadius: 1,
													border: isCurrentEp
														? `1px solid ${alpha(theme.palette.primary.main, 0.4)}`
														: "1px solid transparent",
												}}
											>
												<Typography
													sx={{
														minWidth: 28,
														flexShrink: 0,
														fontSize: 14,
														color: isCurrentEp
															? "primary.main"
															: "text.secondary",
														fontWeight: isCurrentEp ? 700 : 400,
													}}
												>
													{ep.name.replace(/^[Tt]ập\s*/i, "")}
												</Typography>
												<Typography
													variant="body2"
													fontWeight={isCurrentEp ? 700 : 500}
													sx={{
														flex: 1,
														color: isCurrentEp
															? "primary.main"
															: "text.primary",
														mx: 1,
													}}
												>
													{ep.name}
												</Typography>
												{/* Progress bar */}
												<Box
													sx={{
														width: 150,
														flexShrink: 0,
														position: "relative",
													}}
												>
													<Box
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
											</Stack>
										</Box>
									);
								})}
							</Box>
						)}
					</>
				)}
			</Collapse>
		</Box>
	);
};
