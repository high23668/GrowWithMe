export const speak = (text: string, lang: 'en-US' | 'ja-JP' = 'en-US') => {
    if (typeof window === 'undefined') return;

    // Cancel current speaking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    // Optional: Adjust rate/pitch based on language?
    if (lang === 'en-US') {
        utterance.rate = 1.0;
    } else {
        utterance.rate = 1.0;
    }

    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    // Prefer Google or Microsoft voices if available
    const preferredVoice = voices.find(v =>
        (v.name.includes('Google') || v.name.includes('Microsoft')) && v.lang.includes(lang)
    );

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
};
