import CloseIcon from "@mui/icons-material/Close";
import CropLandscapeIcon from "@mui/icons-material/CropLandscape";
import CropPortraitIcon from "@mui/icons-material/CropPortrait";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import {
	alpha,
	Box,
	Chip,
	Collapse,
	Dialog,
	DialogContent,
	Divider,
	Grow,
	IconButton,
	Skeleton,
	Stack,
	Tab,
	Tabs,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import {
	useTMDBPerson,
	useTMDBPersonCredits,
} from "@pages/movie/hooks/useTMDBImages";
import { useMemo, useState } from "react";
import type {
	TMDBPersonCreditItem,
	TMDBPersonCredits,
} from "@/services/tmdbService";
import {
	tmdbBackdropUrl,
	tmdbPosterUrl,
	tmdbProfileUrl,
} from "@/services/tmdbService";

type ImageMode = "poster" | "thumb";

const INFO_SKELETON_IDS = ["i0", "i1", "i2", "i3"];
const FEATURED_SKELETON_IDS = ["f0", "f1", "f2", "f3", "f4", "f5"];
const CREDIT_SKELETON_IDS = [
	"cr0",
	"cr1",
	"cr2",
	"cr3",
	"cr4",
	"cr5",
	"cr6",
	"cr7",
	"cr8",
	"cr9",
];

const readImageMode = (): ImageMode =>
	(localStorage.getItem("imageMode") as ImageMode) ?? "poster";
const saveImageMode = (mode: ImageMode) =>
	localStorage.setItem("imageMode", mode);

const GENDER: Record<number, string> = { 1: "Nữ", 2: "Nam", 3: "Non-binary" };

const DEPT_VI: Record<string, string> = {
	Acting: "Diễn viên",
	Directing: "Đạo diễn",
	Writing: "Biên kịch",
	Production: "Sản xuất",
	Editing: "Biên tập",
	Camera: "Quay phim",
	Sound: "Âm thanh",
	Art: "Nghệ thuật",
	"Costume & Make-Up": "Trang phục & Hoá trang",
	"Visual Effects": "Hiệu ứng hình ảnh",
	Lighting: "Ánh sáng",
	Crew: "Đoàn phim",
	Creator: "Sáng tác",
};

const vi = (dept: string | null | undefined): string =>
	dept ? (DEPT_VI[dept] ?? dept) : "";

const calcAge = (
	birthday: string | null,
	deathday: string | null,
): number | null => {
	if (!birthday) return null;
	const end = deathday ? new Date(deathday) : new Date();
	const birth = new Date(birthday);
	let age = end.getFullYear() - birth.getFullYear();
	if (
		end.getMonth() < birth.getMonth() ||
		(end.getMonth() === birth.getMonth() && end.getDate() < birth.getDate())
	)
		age--;
	return age;
};

const formatDate = (d: string | null): string | null => {
	if (!d) return null;
	try {
		return new Intl.DateTimeFormat("vi-VN", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		}).format(new Date(d));
	} catch {
		return d;
	}
};

// ── helpers ──────────────────────────────────────────────────────────────────

const mergeCastCrew = (
	credits: TMDBPersonCredits,
	mediaType: "movie" | "tv",
) => {
	const seen = new Set<number>();
	const result: (TMDBPersonCreditItem & {
		role: string;
		mediaType: "movie" | "tv";
	})[] = [];
	for (const c of credits.cast) {
		if (!seen.has(c.id)) {
			seen.add(c.id);
			result.push({ ...c, role: c.character || "", mediaType });
		}
	}
	for (const c of credits.crew) {
		if (!seen.has(c.id)) {
			seen.add(c.id);
			result.push({ ...c, role: c.job || "", mediaType });
		}
	}
	return result
		.filter(
			(c) =>
				(c.title || c.name) &&
				(c.poster_path || c.release_date || c.first_air_date),
		)
		.sort((a, b) => {
			const da = a.release_date || a.first_air_date || "";
			const db = b.release_date || b.first_air_date || "";
			return db.localeCompare(da);
		});
};

// ── CreditCard ────────────────────────────────────────────────────────────────

const CreditCard = ({
	item,
	imageMode,
	onClick,
}: {
	item: TMDBPersonCreditItem & { role: string };
	imageMode: ImageMode;
	onClick?: () => void;
}) => {
	const theme = useTheme();
	const imgUrl =
		imageMode === "poster"
			? tmdbPosterUrl(item.poster_path, "w342")
			: (tmdbBackdropUrl(item.backdrop_path, "w780") ??
				tmdbPosterUrl(item.poster_path, "w342"));
	const title = item.title || item.name || "";
	const year = (item.release_date || item.first_air_date || "").slice(0, 4);
	const aspectRatio = imageMode === "poster" ? "2/3" : "16/9";

	return (
		<Box
			onClick={onClick}
			sx={{
				borderRadius: 1.5,
				overflow: "hidden",
				bgcolor: "background.paper",
				border: "1px solid",
				borderColor: "divider",
				transition: "border-color 0.2s, transform 0.2s",
				cursor: onClick ? "pointer" : "default",
				"&:hover": onClick
					? {
							borderColor: alpha(theme.palette.primary.main, 0.55),
							transform: "scale(1.02)",
						}
					: {
							borderColor: alpha(theme.palette.primary.main, 0.55),
							transform: "scale(1.02)",
						},
			}}
		>
			<Box
				sx={{
					aspectRatio,
					position: "relative",
					bgcolor: alpha(theme.palette.common.white, 0.05),
					overflow: "hidden",
				}}
			>
				{imgUrl ? (
					<Box
						component="img"
						src={imgUrl}
						alt={title}
						loading="lazy"
						onError={(e) => {
							const img = e.currentTarget as HTMLImageElement;
							const ph =
								imageMode === "poster"
									? "/placeholder-poster.svg"
									: "/placeholder-backdrop.svg";
							if (!img.src.endsWith(ph)) {
								img.onerror = null;
								img.src = ph;
							}
						}}
						sx={{
							position: "absolute",
							inset: 0,
							width: "100%",
							height: "100%",
							objectFit: "cover",
							objectPosition:
								imageMode === "poster" ? "center top" : "center center",
						}}
					/>
				) : (
					<Box
						sx={{
							position: "absolute",
							inset: 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "text.disabled",
						}}
					>
						<PersonOutlineIcon sx={{ fontSize: 32 }} />
					</Box>
				)}
				{year && (
					<Box
						sx={{
							position: "absolute",
							top: 4,
							left: 4,
							bgcolor: alpha(theme.palette.common.black, 0.65),
							color: "white",
							fontSize: 10,
							fontWeight: 700,
							px: 0.6,
							py: 0.2,
							borderRadius: 0.5,
							lineHeight: 1.5,
						}}
					>
						{year}
					</Box>
				)}
			</Box>
			<Box sx={{ p: 0.75 }}>
				<Typography
					variant="caption"
					fontWeight={700}
					sx={{
						display: "-webkit-box",
						WebkitLineClamp: 2,
						WebkitBoxOrient: "vertical",
						overflow: "hidden",
						lineHeight: 1.3,
						fontSize: 11,
					}}
				>
					{title}
				</Typography>
				{item.role && (
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{
							fontSize: 10,
							display: "block",
							fontStyle: "italic",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{item.role}
					</Typography>
				)}
			</Box>
		</Box>
	);
};

// ── KnownForStrip ─────────────────────────────────────────────────────────────

const KnownForStrip = ({
	credits,
	onMovieClick,
}: {
	credits: TMDBPersonCreditItem[];
	onMovieClick?: (title: string, year?: string) => void;
}) => {
	const theme = useTheme();
	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "space-between",
				gap: 1,
				overflowX: "auto",
				pb: 0.5,
				"&::-webkit-scrollbar": { height: 4 },
				"&::-webkit-scrollbar-thumb": {
					bgcolor: alpha(theme.palette.common.white, 0.15),
					borderRadius: 2,
				},
			}}
		>
			{credits.map((c) => {
				const poster = tmdbPosterUrl(c.poster_path, "w185");
				const title = c.title || c.name || "";
				const year = (c.release_date || c.first_air_date || "").slice(0, 4);
				return (
					<Box
						key={c.id}
						onClick={() => onMovieClick?.(title, year || undefined)}
						sx={{
							width: 95,
							flexShrink: 0,
							cursor: onMovieClick ? "pointer" : "default",
							"&:hover .known-for-img": onMovieClick
								? { transform: "scale(1.04)", transition: "transform 0.2s" }
								: undefined,
						}}
					>
						<Box
							sx={{
								width: 95,
								aspectRatio: "2/3",
								borderRadius: 1.5,
								overflow: "hidden",
								bgcolor: alpha(theme.palette.common.white, 0.05),
								border: "1px solid",
								borderColor: "divider",
								mb: 0.5,
								transition: "border-color 0.2s",
								"&:hover": onMovieClick
									? { borderColor: alpha(theme.palette.primary.main, 0.55) }
									: {},
							}}
						>
							{poster ? (
								<Box
									className="known-for-img"
									component="img"
									src={poster}
									alt={title}
									loading="lazy"
									onError={(e) => {
										const img = e.currentTarget as HTMLImageElement;
										if (!img.src.endsWith("/placeholder-poster.svg")) {
											img.onerror = null;
											img.src = "/placeholder-poster.svg";
										}
									}}
									sx={{
										width: "100%",
										height: "100%",
										objectFit: "cover",
										display: "block",
									}}
								/>
							) : (
								<Box
									sx={{
										width: "100%",
										height: "100%",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "text.disabled",
									}}
								>
									<PersonOutlineIcon sx={{ fontSize: 28 }} />
								</Box>
							)}
						</Box>
						<Typography
							variant="caption"
							align="center"
							sx={{
								display: "-webkit-box",
								WebkitLineClamp: 2,
								WebkitBoxOrient: "vertical",
								overflow: "hidden",
								fontSize: 10,
								lineHeight: 1.3,
								textAlign: "center",
							}}
						>
							{title}
						</Typography>
					</Box>
				);
			})}
		</Box>
	);
};

// ── InfoRow ───────────────────────────────────────────────────────────────────

const InfoRow = ({
	label,
	value,
}: {
	label: string;
	value: React.ReactNode;
}) => (
	<Box sx={{ mb: 1.25 }}>
		<Typography
			variant="caption"
			fontWeight={700}
			sx={{ display: "block", color: "text.primary", lineHeight: 1.4 }}
		>
			{label}
		</Typography>
		<Typography
			variant="caption"
			color="text.secondary"
			sx={{ lineHeight: 1.5 }}
		>
			{value}
		</Typography>
	</Box>
);

// ── PersonDialog ──────────────────────────────────────────────────────────────

export const PersonDialog = ({
	personId,
	onClose,
}: {
	personId: number | null;
	onClose: () => void;
}) => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const [tab, setTab] = useState(0);
	const [bioExpanded, setBioExpanded] = useState(false);
	const [imageMode, setImageMode] = useState<ImageMode>(readImageMode);

	const personQuery = useTMDBPerson(personId);
	const creditsQuery = useTMDBPersonCredits(personId);
	const isPersonLoading = personQuery.isFetching;
	const isCreditsLoading = creditsQuery.isFetching;

	const person = personQuery.data;

	const movieCredits = useMemo(
		() =>
			creditsQuery.data?.movie
				? mergeCastCrew(creditsQuery.data.movie, "movie")
				: [],
		[creditsQuery.data],
	);
	const tvCredits = useMemo(
		() =>
			creditsQuery.data?.tv ? mergeCastCrew(creditsQuery.data.tv, "tv") : [],
		[creditsQuery.data],
	);

	const knownForCredits = useMemo(() => {
		const allCast: TMDBPersonCreditItem[] = [
			...(creditsQuery.data?.movie.cast ?? []),
			...(creditsQuery.data?.tv.cast ?? []),
		];
		const seen = new Set<number>();
		return allCast
			.filter((c) => c.poster_path && (c.vote_average ?? 0) > 0)
			.sort((a, b) => {
				const aOrder = a.order ?? 999;
				const bOrder = b.order ?? 999;
				if (aOrder !== bOrder) return aOrder - bOrder;
				return (b.popularity ?? 0) - (a.popularity ?? 0);
			})
			.filter((c) => {
				if (seen.has(c.id)) return false;
				seen.add(c.id);
				return true;
			})
			.slice(0, 10);
	}, [creditsQuery.data]);

	const totalCredits = movieCredits.length + tvCredits.length;

	const profileSrc = tmdbProfileUrl(person?.profile_path ?? null, "w342");
	const bio = person?.biography || "";
	const bioNeedsClamp = bio.length > 400;
	const age = calcAge(person?.birthday ?? null, person?.deathday ?? null);

	const handleModeChange = (_: React.MouseEvent, val: ImageMode | null) => {
		if (!val) return;
		setImageMode(val);
		saveImageMode(val);
	};

	const skeletonAspect = imageMode === "poster" ? "150%" : "56.25%";
	const gridTemplateCols =
		imageMode === "poster"
			? { xs: "repeat(3, 1fr)", sm: "repeat(4, 1fr)", md: "repeat(6, 1fr)" }
			: { xs: "repeat(2, 1fr)", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" };
	const activeCredits = tab === 0 ? movieCredits : tvCredits;

	return (
		<Dialog
			open={Boolean(personId)}
			onClose={onClose}
			fullWidth
			maxWidth="md"
			fullScreen={isMobile}
			scroll="paper"
			TransitionComponent={Grow}
			TransitionProps={{ timeout: 250 }}
			sx={{ "& .MuiDialog-paper": { transformOrigin: "center center" } }}
		>
			<IconButton
				onClick={onClose}
				size="small"
				sx={{
					position: "absolute",
					top: 8,
					right: 8,
					zIndex: 20,
					bgcolor: alpha(theme.palette.common.black, 0.45),
					color: "white",
					"&:hover": { bgcolor: alpha(theme.palette.common.black, 0.65) },
				}}
			>
				<CloseIcon fontSize="small" />
			</IconButton>

			<DialogContent sx={{ p: 0 }}>
				{/* ── Block 1: Photo + Name + Personal Info ── */}
				<Box
					sx={{
						display: "flex",
						gap: { xs: 2, sm: 3 },
						p: { xs: 2, sm: 3 },
						alignItems: "flex-start",
					}}
				>
					{/* Photo */}
					{isPersonLoading ? (
						<Skeleton
							variant="rounded"
							sx={{
								width: { xs: 100, sm: 140 },
								flexShrink: 0,
								aspectRatio: "2/3",
								borderRadius: 2,
							}}
						/>
					) : (
						<Box
							sx={{
								width: { xs: 100, sm: 140 },
								flexShrink: 0,
								borderRadius: 2,
								overflow: "hidden",
								aspectRatio: "2/3",
								bgcolor: alpha(theme.palette.common.white, 0.06),
							}}
						>
							{profileSrc ? (
								<Box
									component="img"
									src={profileSrc}
									alt={person?.name}
									onError={(e) => {
										const img = e.currentTarget as HTMLImageElement;
										img.style.display = "none";
										const fb = img.nextElementSibling as HTMLElement | null;
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
									display: profileSrc ? "none" : "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "text.disabled",
								}}
							>
								<PersonOutlineIcon sx={{ fontSize: 56 }} />
							</Box>
						</Box>
					)}

					{/* Right: Name + chip + Personal Info */}
					<Box sx={{ flex: 1, minWidth: 0 }}>
						{isPersonLoading ? (
							<Stack spacing={1} sx={{ mb: 2 }}>
								<Skeleton width="55%" height={32} />
								<Skeleton width="35%" height={22} />
							</Stack>
						) : (
							person && (
								<Stack
									direction="row"
									alignItems="center"
									flexWrap="wrap"
									gap={1}
									sx={{ mb: 2 }}
								>
									<Typography
										variant="h5"
										fontWeight={900}
										sx={{ lineHeight: 1.2 }}
									>
										{person.name}
									</Typography>
									{person.known_for_department && (
										<Chip
											label={vi(person.known_for_department)}
											size="small"
											sx={{
												fontSize: 11,
												height: 22,
												bgcolor: alpha(theme.palette.primary.main, 0.15),
												color: "primary.main",
												border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
											}}
										/>
									)}
								</Stack>
							)
						)}

						{/* Personal Info — inside Block 1 */}
						{isPersonLoading ? (
							<Box
								sx={{
									display: "grid",
									gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
									gap: 1.5,
								}}
							>
								{INFO_SKELETON_IDS.map((id) => (
									<Box key={id}>
										<Skeleton width="60%" height={14} sx={{ mb: 0.5 }} />
										<Skeleton width="80%" height={13} />
									</Box>
								))}
							</Box>
						) : (
							person && (
								<Box
									sx={{
										display: "flex",
										flexDirection: { xs: "column", sm: "row" },
										gap: { xs: 1.5, sm: 3 },
										alignItems: "flex-start",
									}}
								>
									{/* Left: Known For + Also Known As */}
									<Box
										sx={{ minWidth: { xs: "auto", sm: 140 }, flexShrink: 0 }}
									>
										{person.known_for_department && (
											<InfoRow
												label="Vai trò"
												value={vi(person.known_for_department)}
											/>
										)}
										{person.also_known_as.length > 0 && (
											<Box sx={{ mb: 1.25 }}>
												<Typography
													variant="caption"
													fontWeight={700}
													sx={{
														display: "block",
														color: "text.primary",
														lineHeight: 1.4,
													}}
												>
													Tên khác
												</Typography>
												{person.also_known_as.slice(0, 6).map((alias) => (
													<Typography
														key={alias}
														variant="caption"
														color="text.secondary"
														sx={{ display: "block", lineHeight: 1.6 }}
													>
														{alias}
													</Typography>
												))}
											</Box>
										)}
									</Box>

									{/* Right: Known Credits, Gender, Birthday, Place of Birth */}
									<Box sx={{ flex: 1, minWidth: 0 }}>
										{totalCredits > 0 && (
											<InfoRow label="Tổng số tác phẩm" value={totalCredits} />
										)}
										{person.gender > 0 && (
											<InfoRow
												label="Giới tính"
												value={GENDER[person.gender] ?? "—"}
											/>
										)}
										{person.birthday && (
											<InfoRow
												label="Ngày sinh"
												value={
													<>
														{formatDate(person.birthday)}
														{age !== null && !person.deathday && (
															<Box
																component="span"
																sx={{ color: "primary.main", ml: 0.5 }}
															>
																({age} tuổi)
															</Box>
														)}
														{person.deathday && (
															<Box component="span" sx={{ ml: 0.5 }}>
																– {formatDate(person.deathday)}
																{age !== null && (
																	<Box
																		component="span"
																		sx={{ color: "text.disabled", ml: 0.5 }}
																	>
																		({age} tuổi)
																	</Box>
																)}
															</Box>
														)}
													</>
												}
											/>
										)}
										{person.place_of_birth && (
											<InfoRow label="Nơi sinh" value={person.place_of_birth} />
										)}
									</Box>
								</Box>
							)
						)}
					</Box>
				</Box>

				<Divider />

				{/* ── Block 2: Biography + Known For ── */}
				<Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
					{/* Biography */}
					<Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.75 }}>
						Tiểu sử
					</Typography>
					{isPersonLoading ? (
						<Stack spacing={0.75} sx={{ mb: 2 }}>
							{[100, 96, 88, 70].map((w) => (
								<Skeleton key={w} width={`${w}%`} height={13} />
							))}
						</Stack>
					) : (
						<Box sx={{ mb: bioNeedsClamp ? 0.5 : 2 }}>
							<Box sx={{ position: "relative" }}>
								<Collapse
									in={bioExpanded || !bioNeedsClamp}
									collapsedSize={120}
								>
									<Typography
										variant="body2"
										color="text.secondary"
										sx={{ lineHeight: 1.75, whiteSpace: "pre-wrap" }}
									>
										{bio || "Chưa có tiểu sử."}
									</Typography>
								</Collapse>
								{!bioExpanded && bioNeedsClamp && (
									<Box
										sx={{
											position: "absolute",
											bottom: 0,
											left: 0,
											right: 0,
											height: 48,
											background: `linear-gradient(to bottom, transparent, ${theme.palette.background.paper})`,
											pointerEvents: "none",
										}}
									/>
								)}
							</Box>
							{bioNeedsClamp && (
								<Typography
									variant="caption"
									color="primary"
									sx={{ cursor: "pointer", mt: 0.75, display: "inline-block" }}
									onClick={() => setBioExpanded((v) => !v)}
								>
									{bioExpanded ? "Thu gọn ↑" : "Xem thêm ↓"}
								</Typography>
							)}
						</Box>
					)}

					{/* Known For */}
					{(isCreditsLoading || knownForCredits.length > 0) && (
						<Box sx={{ mt: 2 }}>
							<Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
								Tác phẩm tiêu biểu
							</Typography>
							{isCreditsLoading ? (
								<Stack direction="row" spacing={1.5}>
									{FEATURED_SKELETON_IDS.map((id) => (
										<Box key={id} sx={{ width: 90, flexShrink: 0 }}>
											<Skeleton
												variant="rounded"
												sx={{
													width: 90,
													aspectRatio: "2/3",
													borderRadius: 1.5,
													mb: 0.5,
												}}
											/>
											<Skeleton width="80%" height={11} />
										</Box>
									))}
								</Stack>
							) : (
								<KnownForStrip credits={knownForCredits} />
							)}
						</Box>
					)}
				</Box>

				<Divider />

				{/* ── Block 3: Filmography tabs ── */}
				<Box sx={{ px: { xs: 2, sm: 3 }, pt: 1.5 }}>
					<Stack
						direction="row"
						alignItems="center"
						justifyContent="space-between"
						sx={{ borderBottom: "1px solid", borderColor: "divider", mb: 2 }}
					>
						<Tabs
							value={tab}
							onChange={(_, v: number) => setTab(v)}
							sx={{ flex: 1 }}
						>
							<Tab
								label={
									isCreditsLoading
										? "Phim"
										: `Phim${movieCredits.length ? ` (${movieCredits.length})` : ""}`
								}
								sx={{ fontSize: 13, fontWeight: 700, minWidth: 80 }}
							/>
							<Tab
								label={
									isCreditsLoading
										? "TV"
										: `Phim truyền hình${tvCredits.length ? ` (${tvCredits.length})` : ""}`
								}
								sx={{ fontSize: 13, fontWeight: 700, minWidth: 80 }}
							/>
						</Tabs>

						<ToggleButtonGroup
							value={imageMode}
							exclusive
							onChange={handleModeChange}
							size="small"
							sx={{ mb: 0.5, ml: 1 }}
						>
							<Tooltip title="Thumbnail">
								<ToggleButton value="poster" sx={{ px: 1, py: 0.5 }}>
									<CropPortraitIcon sx={{ fontSize: 16 }} />
								</ToggleButton>
							</Tooltip>
							<Tooltip title="Poster">
								<ToggleButton value="thumb" sx={{ px: 1, py: 0.5 }}>
									<CropLandscapeIcon sx={{ fontSize: 16 }} />
								</ToggleButton>
							</Tooltip>
						</ToggleButtonGroup>
					</Stack>

					{isCreditsLoading ? (
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: gridTemplateCols,
								gap: 1.5,
								pb: 3,
								overflowX: "hidden",
							}}
						>
							{CREDIT_SKELETON_IDS.map((id) => (
								<Box key={id}>
									<Skeleton
										variant="rounded"
										sx={{
											paddingTop: skeletonAspect,
											borderRadius: 1.5,
											mb: 0.5,
										}}
									/>
									<Skeleton width="80%" height={12} />
									<Skeleton width="50%" height={10} />
								</Box>
							))}
						</Box>
					) : (
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: gridTemplateCols,
								gap: 1.5,
								pb: 3,
								maxHeight: { xs: 400, sm: 520 },
								overflowX: "hidden",
							}}
						>
							{activeCredits.map((item, _i) => (
								<CreditCard
									key={String(item.id)}
									item={item}
									imageMode={imageMode}
								/>
							))}
							{activeCredits.length === 0 && (
								<Box sx={{ gridColumn: "1/-1", py: 4, textAlign: "center" }}>
									<Typography variant="body2" color="text.disabled">
										Không có dữ liệu
									</Typography>
								</Box>
							)}
						</Box>
					)}
				</Box>
			</DialogContent>
		</Dialog>
	);
};
