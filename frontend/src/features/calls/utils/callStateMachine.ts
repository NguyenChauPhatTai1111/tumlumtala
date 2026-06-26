import type { CallState } from "../types/call.types";

const transitions: Record<CallState, CallState[]> = {
	idle: ["permission_checking", "ringing"],
	permission_checking: ["calling", "connecting", "failed", "idle"],
	calling: ["connecting", "rejected", "missed", "busy", "failed", "ended", "cancelled"],
	ringing: ["permission_checking", "connecting", "rejected", "missed", "ended", "cancelled"],
	connecting: ["connected", "reconnecting", "failed", "ended"],
	connected: ["reconnecting", "ended", "failed"],
	reconnecting: ["connected", "ended", "failed"],
	ended: ["idle"],
	cancelled: ["idle"],
	rejected: ["idle"],
	missed: ["idle"],
	failed: ["idle"],
	busy: ["idle"],
};

export function canTransition(from: CallState, to: CallState) {
	return from === to || transitions[from]?.includes(to) || false;
}

export function nextCallState(from: CallState, to: CallState): CallState {
	return canTransition(from, to) ? to : from;
}
