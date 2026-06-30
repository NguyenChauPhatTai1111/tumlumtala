import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Collapse,
	Divider,
	Grid,
	Paper,
	Stack,
	Tooltip,
	Typography,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	explainWordMatchWords,
	getWordMatchRound,
	type WordMatchRound,
} from "@services/wordmatchService";

const STORAGE_KEY = "wordmatch_record";

interface GameRecord {
	highScore: number;
	currentStreak: number;
	bestStreak: number;
}

function loadRecord(): GameRecord {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return JSON.parse(raw) as GameRecord;
	} catch {
		// ignore
	}
	return { highScore: 0, currentStreak: 0, bestStreak: 0 };
}

function saveRecord(r: GameRecord) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
}

// Extract the last syllable from a compound word, e.g. "kiện tướng" → "tướng"
function lastSyllable(word: string): string {
	const parts = word.trim().split(/\s+/);
	return parts[parts.length - 1];
}

type GamePhase = "playing" | "won" | "lost";

export function WordMatchPage() {
	const [round, setRound] = useState<WordMatchRound | null>(null);
	const [loading, setLoading] = useState(false);
	const [selected, setSelected] = useState<string | null>(null);
	const [phase, setPhase] = useState<GamePhase>("playing");
	const [score, setScore] = useState(0);
	const [record, setRecord] = useState<GameRecord>(loadRecord);
	const [explanation, setExplanation] = useState<string>("");
	const [explainLoading, setExplainLoading] = useState(false);
	const [error, setError] = useState<string>("");
	// chain history for display
	const [chain, setChain] = useState<string[]>([]);
	const fetchingRef = useRef(false);

	const fetchRound = useCallback(async (baseWord?: string) => {
		if (fetchingRef.current) return;
		fetchingRef.current = true;
		setLoading(true);
		setError("");
		setSelected(null);
		setPhase("playing");
		setExplanation("");
		try {
			const r = await getWordMatchRound(baseWord);
			setRound(r);
		} catch {
			setError("Không thể tải vòng chơi. Vui lòng thử lại.");
		} finally {
			setLoading(false);
			fetchingRef.current = false;
		}
	}, []);

	useEffect(() => {
		fetchRound();
	}, [fetchRound]);

	const handleSelect = async (word: string) => {
		if (phase !== "playing" || !round) return;
		setSelected(word);

		const isCorrect = round.correctWords.includes(word);

		// Always explain the selected word
		setExplainLoading(true);

		if (isCorrect) {
			const newScore = score + 1;
			setScore(newScore);
			setPhase("won");
			setChain((prev) => [...prev, word]);
			setRecord((prev) => {
				const newStreak = prev.currentStreak + 1;
				const updated: GameRecord = {
					highScore: Math.max(prev.highScore, newScore),
					currentStreak: newStreak,
					bestStreak: Math.max(prev.bestStreak, newStreak),
				};
				saveRecord(updated);
				return updated;
			});
		} else {
			setPhase("lost");
			setRecord((prev) => {
				const updated: GameRecord = { ...prev, currentStreak: 0 };
				saveRecord(updated);
				return updated;
			});
		}

		try {
			// Explain the word the user picked (right or wrong choice gives context)
			const text = await explainWordMatchWords([word]);
			setExplanation(text);
		} catch {
			setExplanation("Không thể lấy giải thích lúc này.");
		} finally {
			setExplainLoading(false);
		}
	};

	const handleNext = () => {
		if (!round) return;
		const nextBase = lastSyllable(round.correctWords[0]);
		fetchRound(nextBase);
	};

	const handleRestart = () => {
		const reset: GameRecord = { highScore: 0, currentStreak: 0, bestStreak: 0 };
		saveRecord(reset);
		setRecord(reset);
		setScore(0);
		setChain([]);
		fetchRound();
	};

	if (loading) {
		return (
			<Stack alignItems="center" justifyContent="center" sx={{ minHeight: "60vh" }}>
				<CircularProgress color="primary" />
				<Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
					Đang tải vòng chơi...
				</Typography>
			</Stack>
		);
	}

	if (error) {
		return (
			<Stack alignItems="center" justifyContent="center" sx={{ minHeight: "60vh", gap: 2 }}>
				<Alert severity="error" sx={{ maxWidth: 400 }}>{error}</Alert>
				<Button variant="contained" onClick={() => fetchRound()}>Thử lại</Button>
			</Stack>
		);
	}

	if (!round) return null;

	// When won: use the word the user selected to continue the chain.
	// When lost or not yet selected: show first correct answer as reference.
	const correctWord = (phase === "won" && selected) ? selected : round.correctWords[0];
	const nextBase = lastSyllable(correctWord);

	return (
		<Box sx={{ maxWidth: 680, mx: "auto", py: 2 }}>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
				<Stack direction="row" spacing={1} alignItems="center">
					<EmojiEventsIcon color="warning" />
					<Typography variant="h6" fontWeight={700}>Nối Từ</Typography>
				</Stack>
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					<Chip label={`Điểm: ${score}`} color="primary" size="small" />
					<Chip label={`Kỷ lục: ${record.highScore}`} color="warning" size="small" />
					<Chip label={`Chuỗi: ${record.currentStreak}`} color="success" size="small" />
					<Tooltip title="Chơi lại từ đầu">
						<Button size="small" onClick={handleRestart} sx={{ minWidth: 0, p: 0.5, color: "text.secondary" }}>
							<RestartAltIcon fontSize="small" />
						</Button>
					</Tooltip>
				</Stack>
			</Stack>

			{/* Chain trail */}
			{chain.length > 0 && (
				<Stack
					direction="row"
					spacing={0.5}
					alignItems="center"
					flexWrap="wrap"
					useFlexGap
					sx={{ mb: 2, p: 1.5, bgcolor: "action.hover", borderRadius: 2 }}
				>
					{chain.map((w, i) => (
						<Stack key={i} direction="row" alignItems="center" spacing={0.5}>
							<Chip label={w} size="small" color="success" variant="outlined" />
							{i < chain.length - 1 && (
								<ArrowForwardIcon sx={{ fontSize: 14, color: "text.disabled" }} />
							)}
						</Stack>
					))}
					<ArrowForwardIcon sx={{ fontSize: 14, color: "text.disabled" }} />
					<Chip label="?" size="small" variant="outlined" />
				</Stack>
			)}

			{/* Base word */}
			<Paper
				elevation={3}
				sx={{
					p: 3,
					mb: 3,
					textAlign: "center",
					background: (t) =>
						t.palette.mode === "dark"
							? "linear-gradient(135deg, #292524 0%, #1c1917 100%)"
							: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
					border: "1px solid",
					borderColor: "divider",
				}}
			>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
					Từ gốc
				</Typography>
				<Typography
					variant="h2"
					fontWeight={800}
					color="primary"
					sx={{ letterSpacing: 3, mb: 1.5 }}
				>
					{round.baseWord}
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Chọn từ ghép có nghĩa với <strong>"{round.baseWord}"</strong>
				</Typography>
			</Paper>

			{/* Choices */}
			<Grid container spacing={1.5} sx={{ mb: 3 }}>
				{round.choices.map((word) => {
					const isSelected = selected === word;
					const isCorrect = round.correctWords.includes(word);
					const showResult = phase !== "playing";
					const isWrongSelected = showResult && isSelected && !isCorrect;
					const isRightAnswer = showResult && isCorrect;

					return (
						<Grid key={word} item xs={6} sm={4}>
							<Button
								fullWidth
								variant={isSelected ? "contained" : "outlined"}
								onClick={() => handleSelect(word)}
								disabled={phase !== "playing"}
								sx={{
									py: 1.5,
									fontWeight: 600,
									fontSize: "0.9rem",
									borderRadius: 2,
									textTransform: "none",
									transition: "all 0.15s",
									...(isRightAnswer && {
										bgcolor: "success.main",
										borderColor: "success.main",
										color: "white",
										"&.Mui-disabled": {
											bgcolor: "success.main",
											color: "white",
											opacity: 1,
										},
									}),
									...(isWrongSelected && {
										bgcolor: "error.main",
										borderColor: "error.main",
										color: "white",
										"&.Mui-disabled": {
											bgcolor: "error.main",
											color: "white",
											opacity: 1,
										},
									}),
								}}
							>
								{word}
							</Button>
						</Grid>
					);
				})}
			</Grid>

			{/* Result area */}
			{phase === "won" && (
				<Stack spacing={2}>
					<Alert severity="success" sx={{ fontWeight: 600 }}>
						Chính xác! <strong>{correctWord}</strong> ✓
						{record.currentStreak > 1 && ` · Chuỗi: ${record.currentStreak} bước`}
					</Alert>

					<Collapse in={explainLoading || !!explanation}>
						<Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
							<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
								Giải thích:
							</Typography>
							{explainLoading ? (
								<Stack direction="row" alignItems="center" spacing={1}>
									<CircularProgress size={16} />
									<Typography variant="body2">Đang giải thích...</Typography>
								</Stack>
							) : (
								<Typography variant="body2" sx={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
									{explanation}
								</Typography>
							)}
						</Paper>
					</Collapse>

					<Paper
						variant="outlined"
						sx={{ p: 2, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5 }}
					>
						<Typography variant="body2" color="text.secondary">Từ tiếp theo:</Typography>
						<Chip label={nextBase} color="primary" />
						<ArrowForwardIcon sx={{ color: "text.disabled" }} />
						<Typography variant="body2" color="text.secondary">???</Typography>
					</Paper>
					<Button
						fullWidth
						variant="contained"
						size="large"
						onClick={handleNext}
						endIcon={<ArrowForwardIcon />}
						sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
					>
						Tiếp tục với "{nextBase}"
					</Button>
				</Stack>
			)}

			{phase === "lost" && (
				<Stack spacing={2}>
					<Alert severity="error" sx={{ fontWeight: 600 }}>
						Sai rồi! Chuỗi bị phá vỡ sau {score} bước.
					</Alert>
					<Divider />
					<Typography variant="subtitle2" fontWeight={700}>Đáp án đúng:</Typography>
					<Stack direction="row" flexWrap="wrap" gap={1}>
						{round.correctWords.map((w) => (
							<Chip key={w} label={w} color="success" variant="filled" />
						))}
					</Stack>

					<Collapse in={explainLoading || !!explanation}>
						<Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
							<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
								Giải thích:
							</Typography>
							{explainLoading ? (
								<Stack direction="row" alignItems="center" spacing={1}>
									<CircularProgress size={16} />
									<Typography variant="body2">Đang giải thích...</Typography>
								</Stack>
							) : (
								<Typography variant="body2" sx={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
									{explanation}
								</Typography>
							)}
						</Paper>
					</Collapse>

					<Button
						fullWidth
						variant="contained"
						size="large"
						onClick={() => { setChain([]); fetchRound(); }}
						sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
					>
						Chơi lại từ đầu
					</Button>
				</Stack>
			)}

			{record.bestStreak >= 3 && (
				<Box sx={{ mt: 3, textAlign: "center" }}>
					<Typography variant="caption" color="text.secondary">
						Chuỗi nối từ dài nhất: <strong>{record.bestStreak}</strong> bước
					</Typography>
				</Box>
			)}
		</Box>
	);
}
