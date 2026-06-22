const TTS_URL = `${import.meta.env.VITE_BACKEND_URL ?? ""}/api/v1/tts/speak`;

type Gender = "male" | "female" | "other" | string | undefined;

const resolveVoiceGender = (gender: Gender): "male" | "female" => {
	return gender === "female" ? "female" : "male";
};

const speakWithBrowser = (text: string, gender: "male" | "female"): void => {
	if (!("speechSynthesis" in window)) return;

	window.speechSynthesis.cancel();

	const utterance = new SpeechSynthesisUtterance(text);
	utterance.lang = "vi-VN";

	const voices = window.speechSynthesis.getVoices();
	const viVoice = voices.find((v) => v.lang.startsWith("vi"));
	if (viVoice) {
		utterance.voice = viVoice;
	}

	utterance.rate = 0.95;
	utterance.pitch = gender === "female" ? 1.1 : 0.85;

	window.speechSynthesis.speak(utterance);
};

export const speakText = async (
	text: string,
	gender?: Gender,
): Promise<void> => {
	const resolvedGender = resolveVoiceGender(gender);
	const token = localStorage.getItem("access_token");

	try {
		const response = await fetch(TTS_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify({ text, gender: resolvedGender }),
		});

		if (!response.ok) {
			speakWithBrowser(text, resolvedGender);
			return;
		}

		const blob = await response.blob();
		const audioUrl = URL.createObjectURL(blob);
		const audio = new Audio(audioUrl);
		audio.onended = () => URL.revokeObjectURL(audioUrl);
		audio.onerror = () => {
			URL.revokeObjectURL(audioUrl);
			speakWithBrowser(text, resolvedGender);
		};
		await audio.play();
	} catch {
		speakWithBrowser(text, resolvedGender);
	}
};
