import { MENTION_REGEX } from "@/utils/mentionUtils";

type Segment = { type: "text"; value: string } | { type: "mention"; name: string; id: number };

function parseSegments(content: string): Segment[] {
    const segments: Segment[] = [];
    const regex = new RegExp(MENTION_REGEX.source, "g");
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
        if (match.index > last) {
            segments.push({ type: "text", value: content.slice(last, match.index) });
        }
        segments.push({ type: "mention", name: match[1], id: Number(match[2]) });
        last = match.index + match[0].length;
    }
    if (last < content.length) {
        segments.push({ type: "text", value: content.slice(last) });
    }
    return segments;
}

type Props = {
    content: string;
    mentionColor?: string;
};

export function MentionText({ content, mentionColor }: Props) {
    const segments = parseSegments(content);
    return (
        <>
            {segments.map((seg, i) =>
                seg.type === "mention" ? (
                    <strong
                        key={i}
                        style={{
                            fontWeight: 700,
                            color: mentionColor ?? "inherit",
                        }}
                    >
                        @{seg.name}
                    </strong>
                ) : (
                    <span key={i}>{seg.value}</span>
                ),
            )}
        </>
    );
}
