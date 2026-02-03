import { useState, useEffect, useCallback } from 'react';

export function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const reco = new SpeechRecognition();
                reco.continuous = false; // Stop after one sentence
                reco.interimResults = true; // Show results while speaking
                reco.lang = 'en-US';

                reco.onresult = (event: SpeechRecognitionEvent) => {
                    let currentTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        currentTranscript += event.results[i][0].transcript;
                    }
                    setTranscript(currentTranscript);
                };

                reco.onend = () => {
                    setIsListening(false);
                };

                reco.onerror = (event: SpeechRecognitionErrorEvent) => {
                    console.error('Speech Recognition Error', event.error);
                    setIsListening(false);
                };

                setRecognition(reco);
            }
        }
    }, []);

    const startListening = useCallback(() => {
        if (recognition) {
            setTranscript('');
            try {
                recognition.start();
                setIsListening(true);
            } catch (e) {
                console.error(e);
            }
        }
    }, [recognition]);

    const stopListening = useCallback(() => {
        if (recognition) {
            recognition.stop();
            setIsListening(false);
        }
    }, [recognition]);

    return { isListening, transcript, startListening, stopListening, hasRecognition: !!recognition };
}
