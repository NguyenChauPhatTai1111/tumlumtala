type ToneKind = "incoming" | "outgoing";

class CallRingtoneService {
	private audioContext: AudioContext | null = null;
	private oscillator: OscillatorNode | null = null;
	private gain: GainNode | null = null;
	private interval: number | ReturnType<typeof setInterval> | null = null;

	playIncoming() {
		this.play("incoming");
	}

	playOutgoing() {
		this.play("outgoing");
	}

	stop() {
		if (this.interval) {
				window.clearInterval(this.interval as number);
			this.interval = null;
		}
		this.oscillator?.stop();
		this.oscillator?.disconnect();
		this.gain?.disconnect();
		this.oscillator = null;
		this.gain = null;
	}

	private play(kind: ToneKind) {
		this.stop();
		try {
			const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
			if (!AudioContextCtor) return;
			this.audioContext = this.audioContext ?? new AudioContextCtor();
			void this.audioContext.resume();
			const tick = () => this.beep(kind);
			tick();
			this.interval = window.setInterval(tick, kind === "incoming" ? 1600 : 2200);
		} catch {
			this.stop();
		}
	}

	private beep(kind: ToneKind) {
		if (!this.audioContext) return;
		this.oscillator?.stop();
		this.oscillator?.disconnect();
		this.gain?.disconnect();

		const oscillator = this.audioContext.createOscillator();
		const gain = this.audioContext.createGain();
		oscillator.type = "sine";
		oscillator.frequency.value = kind === "incoming" ? 720 : 480;
		gain.gain.setValueAtTime(0.0001, this.audioContext.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.08, this.audioContext.currentTime + 0.03);
		gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 0.42);
		oscillator.connect(gain);
		gain.connect(this.audioContext.destination);
		oscillator.start();
		oscillator.stop(this.audioContext.currentTime + 0.45);
		this.oscillator = oscillator;
		this.gain = gain;
	}
}

export const callRingtone = new CallRingtoneService();

declare global {
	interface Window {
		webkitAudioContext?: typeof AudioContext;
	}
}
