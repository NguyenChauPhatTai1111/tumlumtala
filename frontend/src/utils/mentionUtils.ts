import type { MentionItem } from "@/types/messenger";

// Mention syntax pattern — use MENTION_REGEX_SOURCE to create fresh instances (g flag is stateful)
export const MENTION_REGEX_SOURCE = /@\[([^\]]+)\]\((\d+)\)/;
/** @deprecated Use new RegExp(MENTION_REGEX_SOURCE.source, "g") to avoid stale lastIndex */
export const MENTION_REGEX = /@\[([^\]]+)\]\((\d+)\)/g;

/**
 * Extract all mentions from a content string.
 */
export function parseMentions(content: string): MentionItem[] {
    const mentions: MentionItem[] = [];
    const regex = new RegExp(MENTION_REGEX.source, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
        mentions.push({ id: Number(match[2]), fullname: match[1] });
    }
    return mentions;
}

/**
 * Replace mention syntax with plain @Name for display in previews (no bold).
 */
export function stripMentionSyntax(content: string): string {
    return content.replace(new RegExp(MENTION_REGEX_SOURCE.source, "g"), "@$1");
}

/**
 * Check if current user is mentioned in a content string.
 */
export function isMentioned(content: string, userId: number): boolean {
    const regex = new RegExp(MENTION_REGEX.source, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
        if (Number(match[2]) === userId) return true;
    }
    return false;
}
