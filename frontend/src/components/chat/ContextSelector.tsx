import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import type { ChatContext } from "@/types/chat";

interface ContextSelectorProps {
	value: ChatContext;
	onChange: (value: ChatContext) => void;
}

const CONTEXT_OPTIONS: Array<{ value: ChatContext; label: string }> = [
	{ value: "product", label: "Product" },
	{ value: "user", label: "User" },
	{ value: "game", label: "Game" },
	{ value: "account", label: "Account" },
	{ value: "support", label: "Support" },
	{ value: "general", label: "General" },
];

export const ContextSelector = ({ value, onChange }: ContextSelectorProps) => {
	return (
		<FormControl size="small" fullWidth>
			<InputLabel id="chat-context-label">Context</InputLabel>
			<Select
				labelId="chat-context-label"
				value={value}
				label="Context"
				onChange={(event) => onChange(event.target.value as ChatContext)}
			>
				{CONTEXT_OPTIONS.map((option) => (
					<MenuItem key={option.value} value={option.value}>
						{option.label}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);
};
