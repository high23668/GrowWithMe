import { useState, useEffect, useCallback } from 'react';

export function useSpeechRecognition(options?: { continuous?: boolean }) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

    const { continuous = true } = options || {};

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const reco = new SpeechRecognition();
                reco.continuous = continuous;
                reco.interimResults = true; // Show results while speaking
                reco.lang = 'en-US';

                reco.onresult = (event: SpeechRecognitionEvent) => {
                    let finalTrans = '';
                    let interimTrans = '';

                    for (let i = 0; i < event.results.length; i++) {
                        const result = event.results[i];
                        if (result.isFinal) {
                            finalTrans += result[0].transcript;
                        } else {
                            interimTrans += result[0].transcript;
                        }
                    }
                    setTranscript(finalTrans + interimTrans);
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
