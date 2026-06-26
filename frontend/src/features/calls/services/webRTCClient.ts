import type { CallType } from "../types/call.types";

export class WebRTCClient {
	private pc: RTCPeerConnection | null = null;
	private localStream: MediaStream | null = null;
	private remoteStream = new MediaStream();
	private videoDeviceIndex = 0;
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

	toggleCamera() {
		const track = this.localStream?.getVideoTracks()[0];
		if (!track) return false;
		track.enabled = !track.enabled;
		return track.enabled;
	}

	async switchCamera() {
		if (!this.localStream?.getVideoTracks().length) return this.localStream;
		const devices = await navigator.mediaDevices.enumerateDevices();
		const cameras = devices.filter((device) => device.kind === "videoinput");
		if (cameras.length < 2) return this.localStream;
		this.videoDeviceIndex = (this.videoDeviceIndex + 1) % cameras.length;
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: { deviceId: { exact: cameras[this.videoDeviceIndex].deviceId } },
		});
		const newVideoTrack = stream.getVideoTracks()[0];
		const sender = this.pc
			?.getSenders()
			.find((item) => item.track?.kind === "video");
		await sender?.replaceTrack(newVideoTrack);
		this.localStream.getVideoTracks().forEach((track) => track.stop());
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
		this.pc = new RTCPeerConnection({
			iceServers: [
				{ urls: import.meta.env.VITE_CALL_STUN_URL || "stun:stun.l.google.com:19302" },
			],
		});
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
