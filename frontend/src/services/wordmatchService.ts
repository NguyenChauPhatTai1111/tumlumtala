import { apiClient } from "@api/client";

export interface WordMatchRound {
	baseWord: string;
	choices: string[];
	correctWords: string[];
}

export const getWordMatchRound = async (baseWord?: string): Promise<WordMatchRound> => {
	const params = baseWord ? { base: baseWord } : {};
	const res = await apiClient.get<{ data: WordMatchRound }>("/wordmatch/round", { params });
	return res.data.data;
};

export const explainWordMatchWords = async (words: string[]): Promise<string> => {
	const res = await apiClient.post<{ data: { explanation: string } }>(
		"/wordmatch/explain",
		{ words },
	);
	return res.data.data?.explanation ?? "";
};
