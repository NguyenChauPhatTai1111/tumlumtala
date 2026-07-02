import {
	startRegistration,
	startAuthentication,
} from "@simplewebauthn/browser";
import type {
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { apiRequest } from "@api/authApi";

const BASE = "/auth/webauthn";

// ── Registration (called when user is already logged in) ──────────────────────

export async function beginRegistration(userUUID: string, sessionId: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
	const res = await apiRequest(`${BASE}/register/begin`, {
		method: "POST",
		data: { user_uuid: userUUID, session_id: sessionId },
	});
	return res.data.options as PublicKeyCredentialCreationOptionsJSON;
}

export async function finishRegistration(
	userUUID: string,
	sessionId: string,
	credential: ReturnType<typeof startRegistration> extends Promise<infer T> ? T : never,
): Promise<void> {
	await apiRequest(`${BASE}/register/finish`, {
		method: "POST",
		data: { user_uuid: userUUID, session_id: sessionId, credential },
	});
}

// ── Login (public, no token required) ─────────────────────────────────────────
// Email is omitted entirely: the authenticator picks the discoverable (resident) credential
// and the backend resolves which account it belongs to.

export async function beginLogin(sessionId: string): Promise<PublicKeyCredentialRequestOptionsJSON> {
	const res = await apiRequest(`${BASE}/login/begin`, {
		method: "POST",
		data: { session_id: sessionId },
	});
	return res.data.options as PublicKeyCredentialRequestOptionsJSON;
}

export async function finishLogin(
	sessionId: string,
	credential: ReturnType<typeof startAuthentication> extends Promise<infer T> ? T : never,
): Promise<{ access_token: string }> {
	const res = await apiRequest(`${BASE}/login/finish`, {
		method: "POST",
		data: { session_id: sessionId, credential },
	});
	return res.data as { access_token: string };
}

// ── High-level flows ──────────────────────────────────────────────────────────

function newSessionId(): string {
	return crypto.randomUUID();
}

export async function registerPasskey(userUUID: string): Promise<void> {
	const sessionId = newSessionId();
	const options = await beginRegistration(userUUID, sessionId);
	const credential = await startRegistration({ optionsJSON: options });
	await finishRegistration(userUUID, sessionId, credential);
}

export async function loginWithPasskey(): Promise<string> {
	const sessionId = newSessionId();
	const options = await beginLogin(sessionId);
	const credential = await startAuthentication({ optionsJSON: options });
	const result = await finishLogin(sessionId, credential);
	return result.access_token;
}
