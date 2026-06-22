import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
	Box,
	Button,
	CircularProgress,
	IconButton,
	Link,
	Tooltip,
	Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import type { Message } from "@/types/chat";

interface ChatMessageListProps {
	messages: Message[];
	loading: boolean;
	error?: string;
	hasMore: boolean;
	loadingMore: boolean;
	onLoadMore: () => void;
}

const TypingIndicator = () => {
	return (
		<Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
			<Box
				sx={{
					width: 6,
					height: 6,
					borderRadius: "50%",
					bgcolor: "currentColor",
					animation: "bounce 1.4s infinite",
				}}
			/>
			<Box
				sx={{
					width: 6,
					height: 6,
					borderRadius: "50%",
					bgcolor: "currentColor",
					animation: "bounce 1.4s infinite",
					animationDelay: "0.2s",
				}}
			/>
			<Box
				sx={{
					width: 6,
					height: 6,
					borderRadius: "50%",
					bgcolor: "currentColor",
					animation: "bounce 1.4s infinite",
					animationDelay: "0.4s",
					"@keyframes bounce": {
						"0%, 80%, 100%": { opacity: 0.5 },
						"40%": { opacity: 1 },
					},
				}}
			/>
		</Box>
	);
};

const CodeBlock = ({
	language,
	children,
}: {
	language: string;
	children: string;
}) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(children).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	};

	return (
		<Box sx={{ position: "relative", "& > div": { mt: "6px !important" } }}>
			<Tooltip title={copied ? "Copied!" : "Copy"} placement="top">
				<IconButton
					size="small"
					onClick={handleCopy}
					sx={{
						position: "absolute",
						top: 10,
						right: 6,
						zIndex: 1,
						color: copied ? "success.light" : "grey.400",
						bgcolor: "rgba(0,0,0,0.3)",
						"&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
						width: 28,
						height: 28,
					}}
				>
					{copied ? (
						<CheckIcon sx={{ fontSize: 15 }} />
					) : (
						<ContentCopyIcon sx={{ fontSize: 15 }} />
					)}
				</IconButton>
			</Tooltip>
			<SyntaxHighlighter
				style={oneDark}
				language={language}
				PreTag="div"
				customStyle={{
					margin: "6px 0 0",
					borderRadius: 6,
					fontSize: "0.8125rem",
					paddingRight: "2.5rem",
				}}
			>
				{children}
			</SyntaxHighlighter>
		</Box>
	);
};

const MessageBody = ({ message }: { message: Message }) => {
	if (message.format !== "markdown") {
		return (
			<Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
				{message.content}
			</Typography>
		);
	}

	return (
		<Box
			sx={{
				"& p": { m: 0, mb: 1 },
				"& p:last-of-type": { mb: 0 },
				"& ul, & ol": { m: 0, pl: 2.25 },
				"& code:not(pre > code)": {
					fontFamily:
						"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
					fontSize: "0.8125rem",
					px: 0.6,
					py: 0.15,
					borderRadius: 0.75,
					bgcolor: "rgba(0,0,0,0.22)",
				},
			}}
		>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					a: ({ ...props }) => (
						<Link
							{...props}
							target="_blank"
							rel="noopener noreferrer"
							underline="hover"
							color="inherit"
						/>
					),
					code: ({ className, children, ...rest }) => {
						const match = /language-(\w+)/.exec(className ?? "");
						const isBlock = "node" in rest;
						if (isBlock && match) {
							return (
								<CodeBlock language={match[1]}>
									{String(children).replace(/\n$/, "")}
								</CodeBlock>
							);
						}
						return (
							<code className={className} {...rest}>
								{children}
							</code>
						);
					},
				}}
			>
				{message.content}
			</ReactMarkdown>
		</Box>
	);
};

export const ChatMessageList = ({
	messages,
	loading,
	error,
	hasMore,
	loadingMore,
	onLoadMore,
}: ChatMessageListProps) => {
	const containerRef = useRef<HTMLDivElement | null>(null);

	const orderedMessages = useMemo(
		() =>
			[...messages].sort(
				(a, b) =>
					new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
			),
		[messages],
	);

	useEffect(() => {
		if (!containerRef.current) return;
		containerRef.current.scrollTop = containerRef.current.scrollHeight;
	});

	if (loading) {
		return (
			<Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
				<CircularProgress size={24} />
			</Box>
		);
	}

	if (error) {
		return (
			<Typography color="error" variant="body2" sx={{ p: 2 }}>
				{error}
			</Typography>
		);
	}

	if (orderedMessages.length === 0) {
		return (
			<Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
				Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
			</Typography>
		);
	}

	return (
		<Box
			ref={containerRef}
			sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2 }}
		>
			{hasMore && (
				<Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
					<Button onClick={onLoadMore} disabled={loadingMore} size="small">
						{loadingMore ? "Đang tải..." : "Tải thêm"}
					</Button>
				</Box>
			)}

			<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
				{orderedMessages.map((message) => {
					const isUser = message.role === "user";
					const isStreaming = message.streaming;

					return (
						<Box
							key={message.id}
							sx={{
								alignSelf: isUser ? "flex-end" : "flex-start",
								maxWidth: "85%",
								px: 1.5,
								py: 1,
								borderRadius: 2,
								bgcolor: isUser ? "primary.main" : "action.hover",
								color: isUser ? "primary.contrastText" : "text.primary",
								opacity:
									message.pending || message.streaming
										? 0.8
										: message.failed
											? 0.6
											: 1,
								border: message.failed ? "1px solid" : undefined,
								borderColor: message.failed ? "error.main" : undefined,
							}}
						>
							{isStreaming ? (
								<TypingIndicator />
							) : (
								<MessageBody message={message} />
							)}
							<Typography
								variant="caption"
								sx={{ display: "block", mt: 0.5, opacity: 0.8 }}
							>
								{new Date(message.created_at).toLocaleTimeString("vi-VN")}
							</Typography>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
};
