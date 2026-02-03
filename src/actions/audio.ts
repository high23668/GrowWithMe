'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

export type WordAnalysis = {
    word: string;
    score: number;
    status: 'good' | 'weak' | 'bad';
    phonetic?: string; // IPA
    heard_as?: string;
    advice?: string;
    link_to_next?: 'none' | 'good' | 'missed'; // Linking to the following word
};

export type EvaluationResult = {
    total_score: number;
    feedback_summary: string;
    words: WordAnalysis[];
};

export async function evaluateAudio(audioBase64: string, referenceText: string, apiKey?: string): Promise<EvaluationResult> {
    console.log('--- evaluateAudio Started ---');

    // Priority: Fn Arg > Env Var
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!key) {
        console.error('SERVER ALERT: API Key is missing');
        throw new Error('API Key missing. Please set it in Profile or .env');
    }

    const genAI = new GoogleGenerativeAI(key);
    // Using a flash model that supports multimodal input. 
    // Verified available model from API list: "models/gemini-2.5-flash"
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    try {
        // Convert Base64 to Part
        // audioBase64 comes as "data:audio/webm;base64,....." or just the base64 string
        const base64Data = audioBase64.split(',')[1] || audioBase64;
        console.log(`Audio Data Length: ${base64Data.length} chars`);
        console.log(`Reference Text: ${referenceText}`);

        const prompt = `
        You are a strict English pronunciation coach.
        
        Task:
        Analyze the user's pronunciation of the reference text: "${referenceText}".
        
        Requirements:
        1. Break down the reference text into individual words.
        2. Assign a score (0-100) and status to EACH word.
        3. Provide the standard IPA phonetic symbol for EACH word in the "phonetic" field.
        4. CHECK FOR LINKING (Liaison): Does this word naturally link to the next? (e.g. consonant + vowel).
           - "good": User linked them smoothly.
           - "missed": User stopped/paused where they should have linked.
           - "none": No linking expected.
        5. If a word is "bad" or "weak":
           - "heard_as": What you actually heard (Use alphabet or Katakana).
           - "advice": Specific advice on how to fix it **IN JAPANESE**.
        6. "feedback_summary" MUST be written in **JAPANESE**.
        
        Output JSON format ONLY:
        {
            "total_score": 85,
            "feedback_summary": "全体的なフィードバックを日本語で記述します。",
            "words": [
                {
                    "word": "Check",
                    "score": 100,
                    "status": "good",
                    "phonetic": "/tʃek/",
                    "link_to_next": "good"
                },
                {
                    "word": "out",
                    "score": 40,
                    "status": "bad",
                    "phonetic": "/aʊt/",
                    "heard_as": "au-to",
                    "advice": "語尾のtが強すぎます。もっとソフトに。",
                    "link_to_next": "none"
                }
            ]
        }
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'audio/webm', // TODO: Dynamically detect MIME if possible, but webm is standard for MediaRecorder
                    data: base64Data
                }
            }
        ]);

        const response = result.response;
        const text = response.text();
        console.log('Gemini Raw Response:', text);
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText) as EvaluationResult;
    } catch (error: any) {
        console.error('Audio Evaluation Error Detailed:', error);
        // Extract inner error message if possible
        const msg = error.message || 'Unknown Error';
        if (msg.includes('API key')) {
            throw new Error('API Key Invalid or Missing');
        }
        throw new Error(`Analysis Failed: ${msg}`);
    }
}
