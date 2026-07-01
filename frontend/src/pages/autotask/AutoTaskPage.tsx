import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    CircularProgress,
    Divider,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import DeleteIcon from "@mui/icons-material/Delete";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { useState } from "react";
import { fetchRedmineTitle } from "@api/autotaskApi";

// Danh sách CC theo thứ tự cố định
const CC_MEMBERS = [
    { id: "10432665", name: "[HCM] - Nguyen Thi Thuy Duyen (ユカリ)" },
    { id: "9685160", name: "[HCM] - Hà Anh Hiếu - Dev" },
    { id: "9738165", name: "[HCM] - Phan Đăng Ý - Dev" },
    { id: "9738167", name: "[HCM] - Nguyễn Thành Thức - Dev" },
    { id: "9825429", name: "[HCM] Nguyen Huu Duc (デゥック)" },
    { id: "10901168", name: "[HCM] Lê Hữu Dương - Dev" },
    { id: "10574259", name: "[HCM] - Lai Ngoc Thuy Tien (ティエン)" },
    { id: "10128798", name: "[HCM] - Mai Thùy Nhi(ニー) - Comtor" },
];

// Mapping Redmine user ID → CC_MEMBERS messaging ID
// Key: Redmine numeric ID (as string), Value: messaging platform ID
const COMTOR_REDMINE_TO_MESSAGING: Record<string, string> = {
    "50": "10432665", // Nguyen Thi Thuy Duyen
    "48": "10574259", // Lai Ngoc Thuy Tien
    "51": "10128798", // Mai Thuy Nhi
};

// TO options for Pull Request tab
const PR_TO_MEMBERS = [
    { id: "9738165", name: "[HCM] - Phan Đăng Ý - Dev" },
    { id: "10901168", name: "[HCM] Lê Hữu Dương - Dev" },
    { id: "10059157", name: "[HCM] - Nguyễn Văn Nhàn - Dev" },
];

type ChecklistItem = { label: string; checked: boolean };

const DEFAULT_FE_CHECKLIST: ChecklistItem[] = [
    { label: "Đã chạy format - linter", checked: true },
    { label: "Đã chạy yarn build", checked: true },
    { label: "Đã test lại đúng theo yêu cầu của task.", checked: true },
    { label: "Tất cả các Q/A đã được confirmed.", checked: true },
];
const DEFAULT_BE_CHECKLIST: ChecklistItem[] = [
    { label: "Đã chạy unit test - codegen", checked: true },
    { label: "Đã comment request - response trên PR.", checked: true },
    { label: "Đã test lại đúng theo yêu cầu của task.", checked: true },
];

const WORK_START = 8;
const LUNCH_START = 12;
const LUNCH_END = 13;
const WORK_END = 17;

const HOURS = Array.from({ length: WORK_END - WORK_START }, (_, i) =>
    String(WORK_START + i).padStart(2, "0"),
);
const MINUTES = ["00", "15", "30", "45"];

function formatDatetime(date: Date): string {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${hh}:${mm} ${dd}/${mo}/${yyyy}`;
}

function formatStartDatetime(startDate: string, startTime: string): string {
    const [year, month, day] = startDate.split("-");
    return `${startTime} ${day}/${month}/${year}`;
}

function calcEndDatetime(startDate: string, startTime: string, estHours: number): string {
    const [year, month, day] = startDate.split("-").map(Number);
    const [h, m] = startTime.split(":").map(Number);

    let cur = new Date(year, month - 1, day, h, m, 0);
    let remaining = estHours * 60; // minutes

    while (remaining > 0) {
        const curH = cur.getHours();
        const curM = cur.getMinutes();
        const curTotalMin = curH * 60 + curM;

        const morningEndMin = LUNCH_START * 60;
        const afternoonStartMin = LUNCH_END * 60;
        const workEndMin = WORK_END * 60;

        if (curTotalMin < morningEndMin) {
            const avail = morningEndMin - curTotalMin;
            if (remaining <= avail) {
                cur = new Date(cur.getTime() + remaining * 60000);
                remaining = 0;
            } else {
                remaining -= avail;
                cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), LUNCH_END, 0, 0);
            }
        } else if (curTotalMin < afternoonStartMin) {
            cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), LUNCH_END, 0, 0);
        } else if (curTotalMin < workEndMin) {
            const avail = workEndMin - curTotalMin;
            if (remaining <= avail) {
                cur = new Date(cur.getTime() + remaining * 60000);
                remaining = 0;
            } else {
                remaining -= avail;
                // next day
                const next = new Date(
                    cur.getFullYear(),
                    cur.getMonth(),
                    cur.getDate() + 1,
                    WORK_START,
                    0,
                    0,
                );
                cur = next;
            }
        } else {
            const next = new Date(
                cur.getFullYear(),
                cur.getMonth(),
                cur.getDate() + 1,
                WORK_START,
                0,
                0,
            );
            cur = next;
        }
    }

    return formatDatetime(cur);
}

// Trích PT-XXXX từ subject User Story
function extractPTCode(title: string): string {
    const m = title.match(/PT-\d+/);
    return m ? m[0] : "";
}

const defaultEstimateMsg = (ptCode: string) => `Team gửi est ${ptCode}, nhờ mọi người xem qua!!!`;
const defaultPRMsg = () => `Task này em code xong rồi, nhờ mấy anh review giúp em nha`;
const defaultProjectPRMsg = (ptCode: string) =>
    `Team gửi PR task ${ptCode}. Nhờ mọi người xem qua!!!`;

function buildEstimateMessage(params: {
    comtorToLines: string[];
    ccIds: string[];
    title: string;
    issueUrl: string;
    estHours: number;
    startDate: string;
    startTime: string;
    ptCode: string;
    customMsg: string;
}): string {
    const { comtorToLines, ccIds, title, issueUrl, estHours, startDate, startTime, customMsg } =
        params;
    const ccLine = ccIds.map((id) => `[To:${id}]`).join(" ");
    const startDisplay = formatStartDatetime(startDate, startTime);
    const endDisplay = calcEndDatetime(startDate, startTime, estHours);
    const toLines = comtorToLines.length > 0 ? comtorToLines.join("\n") + "\n" : "";
    return `${toLines}cc ${ccLine}
${customMsg}
[info]
[title]${title}[/title]
Est hours: ${estHours}h
Start date: ${startDisplay}
End date: ${endDisplay}
Redmine: ${issueUrl}
[/info]`;
}

function buildPRMessage(params: {
    toId: string;
    title: string;
    prUrl: string;
    issueUrl: string;
    checklist: ChecklistItem[];
    customMsg: string;
}): string {
    const { toId, title, prUrl, issueUrl, checklist, customMsg } = params;
    const toMember = PR_TO_MEMBERS.find((m) => m.id === toId);
    const toLine = `[To:${toId}]${toMember ? toMember.name : ""}`;
    const ccMembers = PR_TO_MEMBERS.filter((m) => m.id !== toId);
    const ccLine = ccMembers.map((m) => `[To:${m.id}]`).join(" ");
    const checklistStr = checklist
        .filter((item) => item.checked)
        .map((item) => `(*) ${item.label}`)
        .join("\n");
    const prLines = prUrl
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `Pull Request: ${l}`)
        .join("\n");
    return `${toLine}
Cc: ${ccLine}
${customMsg}
[info]
[title]${title}[/title]
${prLines}
Redmine: ${issueUrl}
Check List:
[info]
${checklistStr}
[/info]
[/info]`;
}

function buildProjectPRMessage(params: {
    comtorToIds: string[];
    ccIds: string[];
    taskSubject: string;
    prUrl: string;
    issueUrl: string;
    customMsg: string;
}): string {
    const { comtorToIds, ccIds, taskSubject, prUrl, issueUrl, customMsg } = params;
    const toLines = comtorToIds
        .map((id) => {
            const m = CC_MEMBERS.find((c) => c.id === id);
            return `[To:${id}]${m ? m.name : ""}`;
        })
        .join("\n");
    const ccLine = ccIds.map((id) => `[To:${id}]`).join(" ");
    const prLines = prUrl
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `Pull Request: ${l}`)
        .join("\n");
    const header = toLines ? `${toLines}\n` : "";
    return `${header}cc ${ccLine}
${customMsg}
[info]
[title]${taskSubject}[/title]
${prLines}
Redmine: ${issueUrl}
[/info]`;
}

export function AutoTaskPage() {
    const [tab, setTab] = useState(0);

    // Issue data
    const [issueId, setIssueId] = useState("");
    const [title, setTitle] = useState("");
    const [issueUrl, setIssueUrl] = useState("");
    const [startDate, setStartDate] = useState("");
    const [estHours, setEstHours] = useState<number | null>(null);
    const [ptCode, setPtCode] = useState("");
    const [taskSubject, setTaskSubject] = useState("");
    const [comtors, setComtors] = useState<{ id: number; name: string }[]>([]);

    // CC: bắt đầu với toàn bộ danh sách, user có thể bỏ bớt
    const [ccIds, setCcIds] = useState<string[]>(CC_MEMBERS.map((m) => m.id));

    // Giờ bắt đầu
    const [startHour, setStartHour] = useState("08");
    const [startMinute, setStartMinute] = useState("00");

    // Custom messages
    const [estimateMsg, setEstimateMsg] = useState(defaultEstimateMsg(""));
    const [prMsg, setPrMsg] = useState(defaultPRMsg());
    const [projectPRMsg, setProjectPRMsg] = useState(defaultProjectPRMsg(""));

    // PR tab state
    const [prSubTab, setPrSubTab] = useState(0);
    const [prToId, setPrToId] = useState(PR_TO_MEMBERS[0].id);
    const [prTaskType, setPrTaskType] = useState<"fe" | "be">("fe");
    const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_FE_CHECKLIST);
    const [prUrl, setPrUrl] = useState("");
    const [prUrlFromRedmine, setPrUrlFromRedmine] = useState("");
    // [Project] - PromoTalk: CC từ tất cả 8 người, comtor sẽ được TO
    const [projectCcIds, setProjectCcIds] = useState<string[]>(CC_MEMBERS.map((m) => m.id));

    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState("");
    const [copied, setCopied] = useState(false);

    const handleFetchTitle = async () => {
        if (!issueId.trim() || !/^\d+$/.test(issueId.trim())) {
            setFetchError("Issue ID phải là số nguyên dương");
            return;
        }
        setFetchError("");
        setLoading(true);
        try {
            const data = await fetchRedmineTitle(issueId.trim());

            if (String(data.issue_id) === String(data.user_story_id)) {
                setFetchError(
                    `#${data.issue_id} là User Story, không phải Task. Vui lòng nhập ID của task con bên trong User Story này.`,
                );
                return;
            }

            setTitle(data.title);
            setIssueUrl(data.user_story_url);
            setStartDate(data.start_date ?? "");
            setEstHours(data.estimated_hours ?? null);
            const pt = extractPTCode(data.title);
            setPtCode(pt);
            setEstimateMsg(defaultEstimateMsg(pt));
            setPrMsg(defaultPRMsg());
            const taskPtCode = extractPTCode(data.task_subject ?? "") || pt;
            setProjectPRMsg(defaultProjectPRMsg(taskPtCode));

            setComtors(data.comtors);

            const fetchedPrUrl = data.pull_request_url ?? "";
            setPrUrlFromRedmine(fetchedPrUrl);
            setPrUrl(fetchedPrUrl);

            // Auto-detect FE/BE from task subject: (FE) → fe, (BE) → be
            const subj = data.task_subject ?? "";
            setTaskSubject(subj);
            if (/\(BE\)/i.test(subj)) {
                setPrTaskType("be");
                setChecklist(DEFAULT_BE_CHECKLIST);
            } else {
                setPrTaskType("fe");
                setChecklist(DEFAULT_FE_CHECKLIST);
            }

            // Loại comtor ra khỏi CC Estimate (dùng messaging ID từ mapping)
            const comtorMessagingIds = new Set(
                data.comtors.map((c) => COMTOR_REDMINE_TO_MESSAGING[String(c.id)]).filter(Boolean),
            );
            const filteredCc = CC_MEMBERS.map((m) => m.id).filter(
                (id) => !comtorMessagingIds.has(id),
            );
            setCcIds(filteredCc);

            // [Project] tab: comtor là TO, CC = tất cả 8 người trừ comtor
            setProjectCcIds(
                CC_MEMBERS.map((m) => m.id).filter((id) => !comtorMessagingIds.has(id)),
            );
        } catch (err: unknown) {
            type ErrShape = { response?: { data?: { error?: { message?: string } | string } } };
            const errData = (err as ErrShape)?.response?.data?.error;
            const msg =
                typeof errData === "string"
                    ? errData
                    : (errData?.message ?? "Không thể lấy thông tin từ Redmine");
            setFetchError(msg);
        } finally {
            setLoading(false);
        }
    };

    const removeCc = (id: string) => setCcIds((prev) => prev.filter((x) => x !== id));
    const addCc = (id: string) => {
        // Thêm lại theo đúng thứ tự ban đầu
        const ordered = CC_MEMBERS.map((m) => m.id).filter((x) => x === id || ccIds.includes(x));
        setCcIds(ordered);
    };
    const removedIds = CC_MEMBERS.map((m) => m.id).filter((id) => !ccIds.includes(id));

    const startTime = `${startHour}:${startMinute}`;
    const isReadyToPreview = !!title && !!startDate && !!estHours;

    // Build TO lines for each comtor using Redmine ID → messaging ID mapping
    const comtorToLines = comtors
        .map((c) => {
            const msgId = COMTOR_REDMINE_TO_MESSAGING[String(c.id)];
            const member = msgId ? CC_MEMBERS.find((m) => m.id === msgId) : null;
            if (!msgId) return null;
            return `[To:${msgId}] ${member?.name ?? c.name}`;
        })
        .filter((line): line is string => line !== null);

    const estimatePreview =
        isReadyToPreview && tab === 0
            ? buildEstimateMessage({
                  comtorToLines,
                  ccIds,
                  title,
                  issueUrl,
                  estHours: estHours!,
                  startDate,
                  startTime,
                  ptCode,
                  customMsg: estimateMsg,
              })
            : null;

    // CC cho PromoTalk Devs tab = 2 người còn lại trong PR_TO_MEMBERS
    const prCcMembers = PR_TO_MEMBERS.filter((m) => m.id !== prToId);

    // [Project] tab: comtor là TO, còn lại là CC
    const projectComtorIds = comtors
        .map((c) => COMTOR_REDMINE_TO_MESSAGING[String(c.id)])
        .filter(Boolean);
    const projectRemovedIds = CC_MEMBERS.map((m) => m.id).filter(
        (id) => !projectCcIds.includes(id),
    );
    const removeProjectCc = (id: string) => setProjectCcIds((prev) => prev.filter((x) => x !== id));
    const addProjectCc = (id: string) => {
        const ordered = CC_MEMBERS.map((m) => m.id).filter(
            (x) => x === id || projectCcIds.includes(x),
        );
        setProjectCcIds(ordered);
    };

    const prPreview =
        tab === 1 && prSubTab === 0 && title && prUrl.trim()
            ? buildPRMessage({ toId: prToId, title, prUrl, issueUrl, checklist, customMsg: prMsg })
            : null;

    const projectPreview =
        tab === 1 && prSubTab === 1 && title && prUrl.trim()
            ? buildProjectPRMessage({
                  comtorToIds: projectComtorIds,
                  ccIds: projectCcIds,
                  taskSubject,
                  prUrl,
                  issueUrl,
                  customMsg: projectPRMsg,
              })
            : null;

    const preview = tab === 0 ? estimatePreview : prSubTab === 0 ? prPreview : projectPreview;

    const handleCopy = async () => {
        if (!preview) return;
        await navigator.clipboard.writeText(preview);
        setCopied(true);
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                px: 3,
                pt: 2,
                pb: 0,
                boxSizing: "border-box",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1.5,
                    flexShrink: 0,
                }}
            >
                <Typography variant="h5" fontWeight={700}>
                    Auto Task
                </Typography>
            </Box>

            {/* Tabs */}
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                    mb: 2,
                    borderBottom: 1,
                    borderColor: "divider",
                    flexShrink: 0,
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    bgcolor: "background.default",
                }}
            >
                <Tab label="Estimate" />
                <Tab label="Pull Request" />
            </Tabs>

            {/* 2-column layout */}
            <Box sx={{ display: "flex", gap: 2, flex: 1, minHeight: 0 }}>
                {/* Left: config */}
                <Box sx={{ flex: "0 0 500px", overflowY: "auto", pb: 2 }}>
                    <Stack spacing={2}>
                        {/* Redmine Issue */}
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="subtitle2" fontWeight={600} mb={2}>
                                    Redmine Issue
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <TextField
                                        label="Issue ID"
                                        size="small"
                                        type="text"
                                        inputProps={{
                                            inputMode: "numeric",
                                            pattern: "[0-9]*",
                                            maxLength: 4,
                                        }}
                                        value={issueId}
                                        onChange={(e) => {
                                            setIssueId(e.target.value);
                                            setTitle("");
                                            setIssueUrl("");
                                            setIssueId(e.target.value.replace(/\D/g, ""));
                                            setStartDate("");
                                            setEstHours(null);
                                            setPtCode("");
                                            setTaskSubject("");
                                            setEstimateMsg(defaultEstimateMsg(""));
                                            setPrMsg(defaultPRMsg());
                                            setProjectPRMsg(defaultProjectPRMsg(""));
                                            setComtors([]);
                                            setPrUrl("");
                                            setPrUrlFromRedmine("");
                                            setProjectCcIds(CC_MEMBERS.map((m) => m.id));
                                            setFetchError("");
                                            setCcIds(CC_MEMBERS.map((m) => m.id));
                                        }}
                                        onKeyDown={(e) => e.key === "Enter" && handleFetchTitle()}
                                        placeholder="XXXX"
                                        sx={{ width: 160 }}
                                        error={!!fetchError}
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={handleFetchTitle}
                                        disabled={loading || !issueId.trim()}
                                        startIcon={
                                            loading ? (
                                                <CircularProgress size={16} color="inherit" />
                                            ) : (
                                                <AutoFixHighIcon />
                                            )
                                        }
                                    >
                                        {loading ? "Đang lấy..." : "Lấy thông tin"}
                                    </Button>
                                </Stack>
                                {fetchError && (
                                    <Typography
                                        variant="caption"
                                        color="error"
                                        mt={1}
                                        display="block"
                                    >
                                        {fetchError}
                                    </Typography>
                                )}
                                {title && (
                                    <TextField
                                        label="Title (User Story)"
                                        size="small"
                                        fullWidth
                                        multiline
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        sx={{ mt: 2 }}
                                    />
                                )}
                            </CardContent>
                        </Card>

                        {/* TO Comtor — Estimate only */}
                        {tab === 0 && title && comtorToLines.length > 0 && (
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                                        TO (Comtor)
                                    </Typography>
                                    <Box display="flex" flexWrap="wrap" gap={1}>
                                        {comtorToLines.map((line) => {
                                            const idMatch = line.match(/\[To:(\d+)\]/);
                                            const id = idMatch ? idMatch[1] : line;
                                            return (
                                                <Box
                                                    key={id}
                                                    sx={{
                                                        border: "1px solid",
                                                        borderColor: "warning.main",
                                                        borderRadius: "16px",
                                                        px: 1.5,
                                                        py: 0.25,
                                                    }}
                                                >
                                                    <Box
                                                        component="span"
                                                        fontWeight={600}
                                                        fontSize="0.8rem"
                                                        color="warning.main"
                                                    >
                                                        {`[To:${id}]`}
                                                    </Box>
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            fontSize: "0.7rem",
                                                            ml: 0.5,
                                                            opacity: 0.7,
                                                            color: "text.secondary",
                                                        }}
                                                    >
                                                        {CC_MEMBERS.find((m) => m.id === id)?.name}
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </CardContent>
                            </Card>
                        )}

                        {/* CC — Estimate only */}
                        {tab === 0 && title && (
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                                        CC
                                    </Typography>

                                    {/* Active CC */}
                                    <Box
                                        display="flex"
                                        flexWrap="wrap"
                                        gap={1}
                                        mb={removedIds.length > 0 ? 2 : 0}
                                    >
                                        {ccIds.map((id) => {
                                            const member = CC_MEMBERS.find((m) => m.id === id);
                                            return (
                                                <Box
                                                    key={id}
                                                    display="flex"
                                                    alignItems="center"
                                                    sx={{
                                                        border: "1px solid",
                                                        borderColor: "primary.main",
                                                        borderRadius: "16px",
                                                        pl: 1.5,
                                                        pr: 0.5,
                                                        py: 0.25,
                                                        bgcolor: "transparent",
                                                    }}
                                                >
                                                    <Box>
                                                        <Box
                                                            component="span"
                                                            fontWeight={600}
                                                            fontSize="0.8rem"
                                                            color="primary.main"
                                                        >
                                                            {`[To:${id}]`}
                                                        </Box>
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                fontSize: "0.7rem",
                                                                ml: 0.5,
                                                                opacity: 0.7,
                                                                color: "text.secondary",
                                                            }}
                                                        >
                                                            {member?.name}
                                                        </Box>
                                                    </Box>
                                                    <Tooltip title="Bỏ CC">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => removeCc(id)}
                                                            color="error"
                                                            sx={{ ml: 0.5, p: 0.4 }}
                                                        >
                                                            <DeleteIcon sx={{ fontSize: "1rem" }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            );
                                        })}
                                    </Box>

                                    {/* Removed — có thể thêm lại */}
                                    {removedIds.length > 0 && (
                                        <>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                mb={0.75}
                                                display="block"
                                            >
                                                Đã bỏ (click để thêm lại):
                                            </Typography>
                                            <Box display="flex" flexWrap="wrap" gap={1}>
                                                {removedIds.map((id) => {
                                                    const member = CC_MEMBERS.find(
                                                        (m) => m.id === id,
                                                    );
                                                    return (
                                                        <Box
                                                            key={id}
                                                            onClick={() => addCc(id)}
                                                            sx={{
                                                                border: "1px solid",
                                                                borderColor: "divider",
                                                                borderRadius: "16px",
                                                                px: 1.5,
                                                                py: 0.25,
                                                                opacity: 0.45,
                                                                cursor: "pointer",
                                                                fontSize: "0.8rem",
                                                                "&:hover": { opacity: 0.75 },
                                                            }}
                                                        >
                                                            {`[To:${id}] ${member?.name ?? ""}`}
                                                        </Box>
                                                    );
                                                })}
                                            </Box>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Thời gian — Estimate only */}
                        {tab === 0 && title && (
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight={600} mb={2}>
                                        Thời gian
                                    </Typography>
                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        spacing={2}
                                        mb={2.5}
                                    >
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <DatePicker
                                                label="Start date"
                                                value={startDate ? dayjs(startDate) : null}
                                                onChange={(v: Dayjs | null) =>
                                                    setStartDate(v ? v.format("YYYY-MM-DD") : "")
                                                }
                                                format="DD/MM/YYYY"
                                                disabled={!!startDate}
                                                slotProps={{
                                                    textField: {
                                                        size: "small",
                                                        sx: { width: 180 },
                                                    },
                                                }}
                                            />
                                        </LocalizationProvider>
                                        <TextField
                                            label="Est hours"
                                            size="small"
                                            value={estHours != null ? String(estHours) : ""}
                                            onChange={(e) => {
                                                const v = parseFloat(e.target.value);
                                                setEstHours(isNaN(v) ? null : v);
                                            }}
                                            placeholder="0"
                                            disabled={estHours != null}
                                            helperText={estHours == null ? "Nhập thủ công" : ""}
                                            sx={{ width: 140 }}
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{ ml: 0.5, whiteSpace: "nowrap" }}
                                                        >
                                                            h
                                                        </Typography>
                                                    ),
                                                },
                                            }}
                                        />
                                    </Stack>

                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        mb={1}
                                        display="block"
                                    >
                                        Giờ bắt đầu
                                    </Typography>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <FormControl size="small" sx={{ width: 110 }}>
                                            <InputLabel>Giờ</InputLabel>
                                            <Select
                                                label="Giờ"
                                                value={startHour}
                                                onChange={(e) => setStartHour(e.target.value)}
                                                MenuProps={{
                                                    PaperProps: { sx: { maxHeight: 240 } },
                                                }}
                                            >
                                                {HOURS.map((h) => (
                                                    <MenuItem
                                                        key={h}
                                                        value={h}
                                                        sx={{ fontSize: "1rem", py: 1 }}
                                                    >
                                                        {h}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        <Typography variant="h6" color="text.secondary">
                                            :
                                        </Typography>

                                        <FormControl size="small" sx={{ width: 90 }}>
                                            <InputLabel>Phút</InputLabel>
                                            <Select
                                                label="Phút"
                                                value={startMinute}
                                                onChange={(e) => setStartMinute(e.target.value)}
                                            >
                                                {MINUTES.map((m) => (
                                                    <MenuItem
                                                        key={m}
                                                        value={m}
                                                        sx={{ fontSize: "1rem", py: 1 }}
                                                    >
                                                        {m}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Stack>
                                </CardContent>
                            </Card>
                        )}

                        {/* Pull Request tab content */}
                        {tab === 1 && title && (
                            <>
                                {/* Sub-tabs */}
                                <Tabs
                                    value={prSubTab}
                                    onChange={(_, v) => setPrSubTab(v)}
                                    sx={{ borderBottom: 1, borderColor: "divider" }}
                                >
                                    <Tab label="PromoTalk Devs" />
                                    <Tab label="[Project] - PromoTalk" />
                                </Tabs>

                                {/* ── PromoTalk Devs ── */}
                                {prSubTab === 0 && (
                                    <>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography
                                                    variant="subtitle2"
                                                    fontWeight={600}
                                                    mb={2}
                                                >
                                                    TO
                                                </Typography>
                                                <FormControl size="small" sx={{ width: 320 }}>
                                                    <InputLabel>Người nhận</InputLabel>
                                                    <Select
                                                        label="Người nhận"
                                                        value={prToId}
                                                        onChange={(e) => setPrToId(e.target.value)}
                                                    >
                                                        {PR_TO_MEMBERS.map((m) => (
                                                            <MenuItem key={m.id} value={m.id}>
                                                                <Box
                                                                    component="span"
                                                                    fontWeight={600}
                                                                    fontSize="0.85rem"
                                                                >{`[To:${m.id}]`}</Box>
                                                                <Box
                                                                    component="span"
                                                                    sx={{
                                                                        ml: 0.75,
                                                                        fontSize: "0.8rem",
                                                                        color: "text.secondary",
                                                                    }}
                                                                >
                                                                    {m.name}
                                                                </Box>
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </CardContent>
                                        </Card>

                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography
                                                    variant="subtitle2"
                                                    fontWeight={600}
                                                    mb={1.5}
                                                >
                                                    CC
                                                </Typography>
                                                <Box display="flex" flexWrap="wrap" gap={1}>
                                                    {prCcMembers.map((m) => (
                                                        <Box
                                                            key={m.id}
                                                            sx={{
                                                                border: "1px solid",
                                                                borderColor: "primary.main",
                                                                borderRadius: "16px",
                                                                px: 1.5,
                                                                py: 0.25,
                                                            }}
                                                        >
                                                            <Box
                                                                component="span"
                                                                fontWeight={600}
                                                                fontSize="0.8rem"
                                                                color="primary.main"
                                                            >{`[To:${m.id}]`}</Box>
                                                            <Box
                                                                component="span"
                                                                sx={{
                                                                    fontSize: "0.7rem",
                                                                    ml: 0.5,
                                                                    opacity: 0.7,
                                                                    color: "text.secondary",
                                                                }}
                                                            >
                                                                {m.name}
                                                            </Box>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </CardContent>
                                        </Card>

                                        <Card variant="outlined">
                                            <CardContent>
                                                <Stack
                                                    direction="row"
                                                    spacing={1.5}
                                                    alignItems="center"
                                                    mb={1.5}
                                                >
                                                    <Typography
                                                        variant="subtitle2"
                                                        fontWeight={600}
                                                    >
                                                        Loại task
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        (tự động nhận diện từ title task)
                                                    </Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={1}>
                                                    {(["fe", "be"] as const).map((t) => (
                                                        <Button
                                                            key={t}
                                                            variant={
                                                                prTaskType === t
                                                                    ? "contained"
                                                                    : "outlined"
                                                            }
                                                            size="small"
                                                            onClick={() => {
                                                                setPrTaskType(t);
                                                                setChecklist(
                                                                    t === "fe"
                                                                        ? DEFAULT_FE_CHECKLIST
                                                                        : DEFAULT_BE_CHECKLIST,
                                                                );
                                                            }}
                                                            sx={{
                                                                textTransform: "uppercase",
                                                                minWidth: 64,
                                                            }}
                                                        >
                                                            {t.toUpperCase()}
                                                        </Button>
                                                    ))}
                                                </Stack>
                                            </CardContent>
                                        </Card>

                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography
                                                    variant="subtitle2"
                                                    fontWeight={600}
                                                    mb={0.5}
                                                >
                                                    Check List
                                                </Typography>
                                                <Stack spacing={0}>
                                                    {checklist.map((item, idx) => (
                                                        <FormControlLabel
                                                            key={idx}
                                                            control={
                                                                <Checkbox
                                                                    size="small"
                                                                    checked={item.checked}
                                                                    onChange={(e) =>
                                                                        setChecklist((prev) =>
                                                                            prev.map((c, i) =>
                                                                                i === idx
                                                                                    ? {
                                                                                          ...c,
                                                                                          checked:
                                                                                              e
                                                                                                  .target
                                                                                                  .checked,
                                                                                      }
                                                                                    : c,
                                                                            ),
                                                                        )
                                                                    }
                                                                />
                                                            }
                                                            label={
                                                                <Typography variant="body2">
                                                                    {item.label}
                                                                </Typography>
                                                            }
                                                        />
                                                    ))}
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}

                                {/* ── [Project] - PromoTalk ── */}
                                {prSubTab === 1 && (
                                    <>
                                        {/* TO: comtors tự động */}
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography
                                                    variant="subtitle2"
                                                    fontWeight={600}
                                                    mb={1.5}
                                                >
                                                    TO (Comtor)
                                                </Typography>
                                                {projectComtorIds.length === 0 ? (
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Không tìm thấy comtor — CC mặc định tất cả
                                                    </Typography>
                                                ) : (
                                                    <Box display="flex" flexWrap="wrap" gap={1}>
                                                        {projectComtorIds.map((id) => {
                                                            const m = CC_MEMBERS.find(
                                                                (c) => c.id === id,
                                                            );
                                                            return (
                                                                <Box
                                                                    key={id}
                                                                    sx={{
                                                                        border: "1px solid",
                                                                        borderColor: "warning.main",
                                                                        borderRadius: "16px",
                                                                        px: 1.5,
                                                                        py: 0.25,
                                                                    }}
                                                                >
                                                                    <Box
                                                                        component="span"
                                                                        fontWeight={600}
                                                                        fontSize="0.8rem"
                                                                        color="warning.main"
                                                                    >{`[To:${id}]`}</Box>
                                                                    <Box
                                                                        component="span"
                                                                        sx={{
                                                                            fontSize: "0.7rem",
                                                                            ml: 0.5,
                                                                            opacity: 0.7,
                                                                            color: "text.secondary",
                                                                        }}
                                                                    >
                                                                        {m?.name}
                                                                    </Box>
                                                                </Box>
                                                            );
                                                        })}
                                                    </Box>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* CC: 8 người, có thể bỏ bớt */}
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography
                                                    variant="subtitle2"
                                                    fontWeight={600}
                                                    mb={1.5}
                                                >
                                                    CC
                                                </Typography>
                                                <Box
                                                    display="flex"
                                                    flexWrap="wrap"
                                                    gap={1}
                                                    mb={projectRemovedIds.length > 0 ? 2 : 0}
                                                >
                                                    {projectCcIds.map((id) => {
                                                        const m = CC_MEMBERS.find(
                                                            (c) => c.id === id,
                                                        );
                                                        return (
                                                            <Box
                                                                key={id}
                                                                display="flex"
                                                                alignItems="center"
                                                                sx={{
                                                                    border: "1px solid",
                                                                    borderColor: "primary.main",
                                                                    borderRadius: "16px",
                                                                    pl: 1.5,
                                                                    pr: 0.5,
                                                                    py: 0.25,
                                                                }}
                                                            >
                                                                <Box>
                                                                    <Box
                                                                        component="span"
                                                                        fontWeight={600}
                                                                        fontSize="0.8rem"
                                                                        color="primary.main"
                                                                    >{`[To:${id}]`}</Box>
                                                                    <Box
                                                                        component="span"
                                                                        sx={{
                                                                            fontSize: "0.7rem",
                                                                            ml: 0.5,
                                                                            opacity: 0.7,
                                                                            color: "text.secondary",
                                                                        }}
                                                                    >
                                                                        {m?.name}
                                                                    </Box>
                                                                </Box>
                                                                <Tooltip title="Bỏ CC">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() =>
                                                                            removeProjectCc(id)
                                                                        }
                                                                        color="error"
                                                                        sx={{ ml: 0.5, p: 0.4 }}
                                                                    >
                                                                        <DeleteIcon
                                                                            sx={{
                                                                                fontSize: "1rem",
                                                                            }}
                                                                        />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Box>
                                                        );
                                                    })}
                                                </Box>
                                                {projectRemovedIds.length > 0 && (
                                                    <>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            mb={0.75}
                                                            display="block"
                                                        >
                                                            Đã bỏ (click để thêm lại):
                                                        </Typography>
                                                        <Box display="flex" flexWrap="wrap" gap={1}>
                                                            {projectRemovedIds.map((id) => {
                                                                const m = CC_MEMBERS.find(
                                                                    (c) => c.id === id,
                                                                );
                                                                return (
                                                                    <Box
                                                                        key={id}
                                                                        onClick={() =>
                                                                            addProjectCc(id)
                                                                        }
                                                                        sx={{
                                                                            border: "1px solid",
                                                                            borderColor: "divider",
                                                                            borderRadius: "16px",
                                                                            px: 1.5,
                                                                            py: 0.25,
                                                                            opacity: 0.45,
                                                                            cursor: "pointer",
                                                                            fontSize: "0.8rem",
                                                                            "&:hover": {
                                                                                opacity: 0.75,
                                                                            },
                                                                        }}
                                                                    >
                                                                        {`[To:${id}] ${m?.name ?? ""}`}
                                                                    </Box>
                                                                );
                                                            })}
                                                        </Box>
                                                    </>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                            </>
                        )}
                    </Stack>
                </Box>
                {/* end left column */}

                {/* Right: inputs + preview — chỉ hiện khi đã có title */}
                {title && (
                    <Box
                        sx={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            minHeight: 0,
                            pb: 2,
                            gap: 2,
                        }}
                    >
                        {/* Tin nhắn — Estimate */}
                        {tab === 0 && (
                            <Card variant="outlined" sx={{ flexShrink: 0 }}>
                                <CardContent>
                                    <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                                        Tin nhắn
                                    </Typography>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        value={estimateMsg}
                                        onChange={(e) => setEstimateMsg(e.target.value)}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Tin nhắn + PR URL — Pull Request tab */}
                        {tab === 1 && (
                            <>
                                <Card variant="outlined" sx={{ flexShrink: 0 }}>
                                    <CardContent>
                                        <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                                            Tin nhắn
                                        </Typography>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            value={prSubTab === 0 ? prMsg : projectPRMsg}
                                            onChange={(e) =>
                                                prSubTab === 0
                                                    ? setPrMsg(e.target.value)
                                                    : setProjectPRMsg(e.target.value)
                                            }
                                        />
                                    </CardContent>
                                </Card>

                                <Card variant="outlined" sx={{ flexShrink: 0 }}>
                                    <CardContent>
                                        <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                                            Pull Request URL
                                        </Typography>
                                        {!prUrlFromRedmine && (
                                            <Alert severity="warning" sx={{ mb: 1.5 }}>
                                                Không tìm thấy PR URL trong Redmine. Vui lòng nhập
                                                thủ công.
                                            </Alert>
                                        )}
                                        <TextField
                                            size="small"
                                            fullWidth
                                            multiline
                                            minRows={2}
                                            value={prUrl}
                                            onChange={(e) => setPrUrl(e.target.value)}
                                            placeholder={
                                                "https://...\nhttps://... (nếu có nhiều PR)"
                                            }
                                        />
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* Preview */}
                        <Card
                            variant="outlined"
                            sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
                        >
                            <CardContent
                                sx={{
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    minHeight: 0,
                                }}
                            >
                                <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    mb={1.5}
                                    flexShrink={0}
                                >
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        Preview
                                    </Typography>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<ContentCopyIcon />}
                                        onClick={handleCopy}
                                        disabled={!preview}
                                    >
                                        Copy
                                    </Button>
                                </Box>
                                <Divider sx={{ mb: 1.5, flexShrink: 0 }} />
                                <Box
                                    component="pre"
                                    sx={{
                                        fontFamily: "monospace",
                                        fontSize: "0.8rem",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        bgcolor: "action.hover",
                                        borderRadius: 1,
                                        p: 1.5,
                                        m: 0,
                                        color: preview ? "text.primary" : "text.disabled",
                                        flex: 1,
                                        overflowY: "auto",
                                    }}
                                >
                                    {preview ?? "Điền thông tin bên trái để xem preview..."}
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                )}
                {/* end right column */}
            </Box>
            {/* end 2-column */}

            <Snackbar
                open={copied}
                autoHideDuration={2000}
                onClose={() => setCopied(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
                    Đã copy vào clipboard!
                </Alert>
            </Snackbar>
        </Box>
    );
}
