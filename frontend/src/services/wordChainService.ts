import { apiClient } from "@api/client";

export type WordChainGameMode = "traditional" | "brawl";

export interface WordChainPlayer {
    id: string;
    name: string;
    connected: boolean;
    ready: boolean;
    gameScore: number;
    gamePoints: number;
    order: number;
    eliminated: boolean;
}

export interface WordChainEntry {
    word: string;
    playerId: string;
    playerName: string;
    explanation: string;
    points: number;
}

export interface WordChainRoom {
    id: string;
    name: string;
    hostId: string;
    hasPassword: boolean;
    maxPlayers: number;
    gameMode: WordChainGameMode;
    status: "waiting" | "countdown" | "playing" | "finished";
    players: WordChainPlayer[];
    turnUserId?: string;
    requiredSyllable?: string;
    deadline?: string;
    remainingMs: number;
    chain: WordChainEntry[];
    winnerId?: string;
    endReason?: string;
    validating: boolean;
}

export interface WordChainRoomSummary {
    id: string;
    name: string;
    hostName: string;
    hasPassword: boolean;
    playerCount: number;
    maxPlayers: number;
    gameMode: WordChainGameMode;
    status: string;
}

export interface WordChainLeaderboardRow {
    rank: number;
    userId: string;
    name: string;
    words: number;
    points: number;
}

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const listWordChainRooms = async () =>
    unwrap(await apiClient.get<{ data: WordChainRoomSummary[] }>("/word-chain/rooms"));

export const createWordChainRoom = async (
    name: string,
    password: string,
    maxPlayers: number,
    gameMode: WordChainGameMode,
) =>
    unwrap(
        await apiClient.post<{ data: WordChainRoom }>("/word-chain/rooms", {
            name,
            password: password || undefined,
            maxPlayers,
            gameMode,
        }),
    );

export const joinWordChainRoom = async (roomId: string, password: string) =>
    unwrap(
        await apiClient.post<{ data: WordChainRoom }>(`/word-chain/rooms/${roomId}/join`, {
            password,
        }),
    );

export const getWordChainRoom = async (roomId: string) =>
    unwrap(await apiClient.get<{ data: WordChainRoom }>(`/word-chain/rooms/${roomId}`));

export const leaveWordChainRoom = async (roomId: string) => {
    await apiClient.delete(`/word-chain/rooms/${roomId}/members/me`);
};

export const createWordChainSocketTicket = async (roomId: string) =>
    unwrap(
        await apiClient.post<{ data: { ticket: string; expiresIn: number } }>(
            `/word-chain/rooms/${roomId}/ws-ticket`,
        ),
    );

export const getWordChainLeaderboard = async () =>
    unwrap(
        await apiClient.get<{ data: WordChainLeaderboardRow[] }>("/word-chain/leaderboard"),
    );
