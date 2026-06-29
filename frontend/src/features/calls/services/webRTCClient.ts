import type { CallType } from "../types/call.types";

const ICE_SERVERS: RTCIceServer[] = [
    { urls: import.meta.env.VITE_CALL_STUN_URL || "stun:stun.l.google.com:19302" },
];

if (import.meta.env.VITE_CALL_TURN_URL) {
    ICE_SERVERS.push({
        urls: import.meta.env.VITE_CALL_TURN_URL,
        username: import.meta.env.VITE_CALL_TURN_USERNAME || undefined,
        credential: import.meta.env.VITE_CALL_TURN_CREDENTIAL || undefined,
    });
}

// --------------------------------------------------------------------------
// Single peer connection (used for 1-on-1 calls)
// --------------------------------------------------------------------------

export class WebRTCClient {
    private pc: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream = new MediaStream();
    private facingMode: "user" | "environment" = "user";
    private readonly onIceCandidate: (candidate: RTCIceCandidateInit) => void;
    private readonly onRemoteStream: (stream: MediaStream) => void;
    private readonly onConnectionState: (state: RTCPeerConnectionState) => void;

    constructor(
        onIceCandidate: (candidate: RTCIceCandidateInit) => void,
        onRemoteStream: (stream: MediaStream) => void,
        onConnectionState: (state: RTCPeerConnectionState) => void,
    ) {
        this.onIceCandidate = onIceCandidate;
        this.onRemoteStream = onRemoteStream;
        this.onConnectionState = onConnectionState;
    }

    async prepare(type: CallType) {
        this.ensurePeer();
        this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: type === "video",
        });
        for (const track of this.localStream.getTracks()) {
            this.pc?.addTrack(track, this.localStream);
        }
        return this.localStream;
    }

    async createOffer() {
        this.ensurePeer();
        const offer = await this.pc!.createOffer();
        await this.pc!.setLocalDescription(offer);
        return offer;
    }

    async handleOffer(offer: RTCSessionDescriptionInit) {
        this.ensurePeer();
        await this.pc!.setRemoteDescription(offer);
        const answer = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answer);
        return answer;
    }

    async handleAnswer(answer: RTCSessionDescriptionInit) {
        if (!this.pc) return;
        await this.pc.setRemoteDescription(answer);
    }

    async addIceCandidate(candidate: RTCIceCandidateInit) {
        if (!this.pc) return;
        await this.pc.addIceCandidate(candidate);
    }

    toggleMic() {
        const track = this.localStream?.getAudioTracks()[0];
        if (!track) return false;
        track.enabled = !track.enabled;
        return track.enabled;
    }

    toggleCamera(): boolean {
        const track = this.localStream?.getVideoTracks()[0];
        if (!track) return false;
        track.enabled = !track.enabled;
        return track.enabled;
    }

    async enableCamera(): Promise<MediaStream | null> {
        if (!this.localStream) return null;
        const existingTrack = this.localStream.getVideoTracks()[0];
        if (existingTrack?.readyState === "live") {
            existingTrack.enabled = true;
            return this.localStream;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const newTrack = stream.getVideoTracks()[0];
            this.localStream.addTrack(newTrack);
            const sender = this.pc?.getSenders().find((s) => s.track === null || s.track?.kind === "video");
            if (sender) await sender.replaceTrack(newTrack);
            else this.pc?.addTrack(newTrack, this.localStream);
        } catch {
            // permission denied or no camera
        }
        return this.localStream;
    }

    async switchCamera() {
        if (!this.localStream?.getVideoTracks().length) return this.localStream;
        this.facingMode = this.facingMode === "user" ? "environment" : "user";
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { exact: this.facingMode } },
        }).catch(() =>
            // Fallback: some desktop browsers don't support facingMode exact
            navigator.mediaDevices.getUserMedia({
                audio: false,
                video: { facingMode: this.facingMode },
            })
        );
        const newVideoTrack = stream.getVideoTracks()[0];
        const sender = this.pc
            ?.getSenders()
            .find((item) => item.track?.kind === "video");
        await sender?.replaceTrack(newVideoTrack);
        this.localStream.getVideoTracks().forEach((track) => track.stop());
        this.localStream.getVideoTracks().forEach((track) => this.localStream!.removeTrack(track));
        this.localStream.addTrack(newVideoTrack);
        return this.localStream;
    }

    getLocalStream() {
        return this.localStream;
    }

    getRemoteStream() {
        return this.remoteStream;
    }

    stop() {
        this.localStream?.getTracks().forEach((track) => track.stop());
        this.remoteStream.getTracks().forEach((track) => track.stop());
        this.pc?.close();
        this.pc = null;
        this.localStream = null;
        this.remoteStream = new MediaStream();
    }

    private ensurePeer() {
        if (this.pc) return;
        this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        this.pc.onicecandidate = (event) => {
            if (event.candidate) this.onIceCandidate(event.candidate.toJSON());
        };
        this.pc.ontrack = (event) => {
            for (const track of event.streams[0]?.getTracks() ?? [event.track]) {
                if (!this.remoteStream.getTracks().some((item) => item.id === track.id)) {
                    this.remoteStream.addTrack(track);
                }
            }
            this.onRemoteStream(this.remoteStream);
        };
        this.pc.onconnectionstatechange = () => {
            if (this.pc) this.onConnectionState(this.pc.connectionState);
        };
    }
}

// --------------------------------------------------------------------------
// Mesh peer (one connection to a single remote participant in a group call)
// --------------------------------------------------------------------------

export type MeshPeerCallbacks = {
    onIceCandidate: (candidate: RTCIceCandidateInit, remoteUserId: number) => void;
    onRemoteStream: (stream: MediaStream, remoteUserId: number) => void;
    onConnectionState: (state: RTCPeerConnectionState, remoteUserId: number) => void;
};

export class MeshPeer {
    readonly remoteUserId: number;
    readonly pc: RTCPeerConnection;
    private pendingIceCandidates: RTCIceCandidateInit[] = [];
    readonly remoteStream = new MediaStream();
    private readonly callbacks: MeshPeerCallbacks;

    constructor(remoteUserId: number, callbacks: MeshPeerCallbacks) {
        this.remoteUserId = remoteUserId;
        this.callbacks = callbacks;
        this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        this.pc.onicecandidate = (e) => {
            if (e.candidate) callbacks.onIceCandidate(e.candidate.toJSON(), remoteUserId);
        };
        this.pc.ontrack = (e) => {
            for (const track of e.streams[0]?.getTracks() ?? [e.track]) {
                if (!this.remoteStream.getTracks().some((t) => t.id === track.id)) {
                    this.remoteStream.addTrack(track);
                }
            }
            callbacks.onRemoteStream(this.remoteStream, remoteUserId);
        };
        this.pc.onconnectionstatechange = () => {
            callbacks.onConnectionState(this.pc.connectionState, remoteUserId);
        };
    }

    addLocalTracks(stream: MediaStream) {
        for (const track of stream.getTracks()) {
            this.pc.addTrack(track, stream);
        }
    }

    async createOffer() {
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        return offer;
    }

    async handleOffer(offer: RTCSessionDescriptionInit) {
        await this.pc.setRemoteDescription(offer);
        await this.flushPendingIceCandidates();
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        return answer;
    }

    async handleAnswer(answer: RTCSessionDescriptionInit) {
        await this.pc.setRemoteDescription(answer);
        await this.flushPendingIceCandidates();
    }

    async addIceCandidate(candidate: RTCIceCandidateInit) {
        if (!this.pc.remoteDescription) {
            this.pendingIceCandidates.push(candidate);
            return;
        }
        await this.pc.addIceCandidate(candidate);
    }

    hasSessionDescription() {
        return Boolean(this.pc.localDescription || this.pc.remoteDescription);
    }

    needsReplacement() {
        return this.pc.connectionState === "failed" || this.pc.connectionState === "closed";
    }

    close() {
        this.pendingIceCandidates = [];
        this.remoteStream.getTracks().forEach((t) => t.stop());
        this.pc.close();
    }

    private async flushPendingIceCandidates() {
        const candidates = this.pendingIceCandidates.splice(0);
        for (const candidate of candidates) {
            await this.pc.addIceCandidate(candidate).catch(() => {});
        }
    }
}

// --------------------------------------------------------------------------
// Mesh manager – handles all peer connections in a group call
// --------------------------------------------------------------------------

export class MeshWebRTCManager {
    private peers = new Map<number, MeshPeer>();
    private localStream: MediaStream | null = null;
    private facingMode: "user" | "environment" = "user";
    private readonly callbacks: MeshPeerCallbacks;

    constructor(callbacks: MeshPeerCallbacks) {
        this.callbacks = callbacks;
    }

    async prepare(type: CallType) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: type === "video",
        });
        // Add tracks to all existing peers (in case we join late)
        for (const peer of this.peers.values()) {
            peer.addLocalTracks(this.localStream);
        }
        return this.localStream;
    }

    getOrCreatePeer(remoteUserId: number): MeshPeer {
        let peer = this.peers.get(remoteUserId);
        if (!peer) {
            peer = new MeshPeer(remoteUserId, this.callbacks);
            if (this.localStream) {
                peer.addLocalTracks(this.localStream);
            }
            this.peers.set(remoteUserId, peer);
        }
        return peer;
    }

    getPeer(remoteUserId: number): MeshPeer | undefined {
        return this.peers.get(remoteUserId);
    }

    removePeer(remoteUserId: number) {
        const peer = this.peers.get(remoteUserId);
        if (peer) {
            peer.close();
            this.peers.delete(remoteUserId);
        }
    }

    getLocalStream() {
        return this.localStream;
    }

    toggleMic(): boolean {
        const track = this.localStream?.getAudioTracks()[0];
        if (!track) return false;
        track.enabled = !track.enabled;
        return track.enabled;
    }

    toggleCamera(): boolean {
        const track = this.localStream?.getVideoTracks()[0];
        if (!track) return false;
        track.enabled = !track.enabled;
        return track.enabled;
    }

    async enableCamera(): Promise<MediaStream | null> {
        if (!this.localStream) return null;
        const existingTrack = this.localStream.getVideoTracks()[0];
        if (existingTrack?.readyState === "live") {
            existingTrack.enabled = true;
            return this.localStream;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const newTrack = stream.getVideoTracks()[0];
            this.localStream.addTrack(newTrack);
        } catch {
            // no camera / permission denied
        }
        return this.localStream;
    }

    async switchCamera(): Promise<MediaStream | null> {
        if (!this.localStream?.getVideoTracks().length) return this.localStream;
        this.facingMode = this.facingMode === "user" ? "environment" : "user";
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { exact: this.facingMode } },
        }).catch(() =>
            navigator.mediaDevices.getUserMedia({
                audio: false,
                video: { facingMode: this.facingMode },
            })
        );
        const newVideoTrack = stream.getVideoTracks()[0];
        // Replace track in all peer connections
        for (const peer of this.peers.values()) {
            const sender = peer.pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) await sender.replaceTrack(newVideoTrack);
        }
        this.localStream.getVideoTracks().forEach((t) => t.stop());
        this.localStream.getVideoTracks().forEach((t) => this.localStream!.removeTrack(t));
        this.localStream.addTrack(newVideoTrack);
        return this.localStream;
    }

    stop() {
        this.localStream?.getTracks().forEach((t) => t.stop());
        this.localStream = null;
        for (const peer of this.peers.values()) {
            peer.close();
        }
        this.peers.clear();
    }
}
