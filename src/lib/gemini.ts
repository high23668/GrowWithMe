import { GoogleGenerativeAI } from '@google/generative-ai';
import { Profile, WordItem } from './store';

// Initialize Gemini
// NOTE: For client-side usage we strictly need NEXT_PUBLIC prefix if calling from component.
// However, for security, it is BETTER to call this from a Server Action or API Route.
// For this MVP, we will try to use a Server Action approach if possible, but if not, client side is easiest for "personal" app.
// Let's assume user puts key in .env.local

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

// If we are on the client and no key, we can't do much.
// We'll define the model based on the key presence.

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export type GeneratedSentence = {
    word: string;
    sentence: string;
    translation: string;
    meaning: string;
    pronunciation: string;
    reason: string;
    used_fields: string[];
};

export async function generateSentences(
    profile: Profile,
    words: WordItem[],
    usageHistory: Record<string, number> = {}
): Promise<GeneratedSentence[]> {
    if (!apiKey) {
        throw new Error('Gemini API Key is missing. Please set NEXT_PUBLIC_GEMINI_API_KEY in .env.local');
    }

    // Calculate under-used topics
    const fields = ['occupation', 'family', 'origin', 'hobbies', 'topics', 'additionalContext', 'dream'];
    // Sort fields by usage count (ascending)
    const sortedFields = fields.sort((a, b) => (usageHistory[a] || 0) - (usageHistory[b] || 0));
    const focusFields = sortedFields.slice(0, 3); // Top 3 under-used fields
    const avoidFields = sortedFields.slice(-2).filter(f => (usageHistory[f] || 0) > 2); // Avoid top 2 used IF they have been used > 2 times.

    // Construct Prompt
    const wordsStr = words.map((w) => w.word).join(', ');

    const prompt = `
    You are an expert English teacher creating personalized learning materials.
    
    Target User Profile:
    - occupation: ${profile.occupation}
    - family: ${profile.family}
    - origin: ${profile.origin}
    - hobbies: ${profile.hobbies}
    - topics: ${profile.topics}
    - additionalContext: ${profile.additionalContext}
    - dream: ${profile.dream}
    - motivationQuotes: ${profile.motivationQuotes}
    
    (Metadata)
    - Name: ${profile.name}
    - Age: ${profile.age} / ${profile.gender}
    - Level: ${profile.level}
    - Tone: ${profile.tone}

    Goal:
    Create ONE English sentence for EACH of the following target words:
    ${wordsStr}

    CRITICAL INSTRUCTION - TOPIC BALANCE:
    The user wants a balanced mix of topics.
    - HISTORY: The user has seen many sentences about [${avoidFields.join(', ')}].
    - TARGET: Please prioritize using context from [${focusFields.join(', ')}] this time.
    
    Style Instruction:
    - Reflect the user's "Motivation Quotes" in the spirit/tone of the sentences if applicable.
    
    Output Schema (JSON Array):
    {
        "word": "target_word",
        "sentence": "English sentence (Concise, approx 5-10 words). Focus on clear usage of the target word.",
        "translation": "Japanese translation of the sentence",
        "meaning": "Japanese meaning of the target word (Definition)",
        "pronunciation": "IPA pronunciation symbol (e.g. /həˈləʊ/)",
        "reason": "Brief context explanation (JP)",
        "used_fields": ["occupation", "hobbies"]
    }

    Constraints:
    1. Sentence must be deeply personalized but CONCISE. Easy to memorize.
    2. Difficulty: ${profile.level}. Tone: ${profile.tone}.
    3. Output ONLY valid JSON.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const data = JSON.parse(cleanText) as GeneratedSentence[];
        return data;
    } catch (error) {
        console.error('Gemini Generation Error:', error);
        throw error;
    }
}

export type GeneratedScript = {
    title: string;
    content: string;
    translation: string;
    topic: string; // The specific topic used
    used_fields?: string[]; // Optional for backward/forward compatibility
};

// Helper to estimate number of items in a text (comma/newline separated)
function countItems(text: string): number {
    if (!text) return 0;
    return text.split(/[\n,]+/).filter(s => s.trim().length > 0).length;
}

export async function generateShadowingScript(
    profile: Profile,
    topic: string,
    options?: { length: string; difficulty: string; mode?: string },
    usageHistory: Record<string, number> = {},
    recentTopics: string[] = []
): Promise<GeneratedScript> {
    if (!apiKey) {
        throw new Error('API Key missing');
    }

    const { length = 'Short', difficulty = profile.level || 'B1', mode = 'default' } = options || {};

    let wordCount = '40-70'; // Reduced from 60-100 based on user feedback
    if (length === 'Medium') wordCount = '100-150';
    if (length === 'Long') wordCount = '180-250';

    // Calculate under-used topics - Restricted to User Preferences
    const fields = ['hobbies', 'topics', 'dream']; // "topics" = Topics to learn

    // Sort by "Usage per Item Density" to be fair to fields with many items (e.g. Hobbies)
    // Score = UsageCount / (ItemCount + 1). Lower score = Less used relative to its size.
    const sortedFields = fields.sort((a, b) => {
        // @ts-ignore
        const countA = countItems(profile[a]);
        // @ts-ignore
        const countB = countItems(profile[b]);
        const scoreA = (usageHistory[a] || 0) / (countA + 1);
        const scoreB = (usageHistory[b] || 0) / (countB + 1);
        return scoreA - scoreB;
    });

    // Pick top candidates
    const focusFields = sortedFields.slice(0, 1);
    const secondaryFields = sortedFields.slice(1, 2);

    const isRandom = topic === 'SURPRISE_ME';
    const topicInstruction = isRandom
        ? "Please choose a CREATIVE, SPECIFIC topic relevant to the User's Profile (e.g. a specific scenario related to their Dream, Hobbies, or Topics). Do NOT use 'SURPRISE_ME' as the topic."
        : topic;

    // Narrative Mode Instructions
    const narrativeInstruction = mode === 'story_future'
        ? `
        NARRATIVE MODE (FUTURE SELF):
        - SETTING: The user has ALREADY achieved their Dream/Goal: "${profile.dream}".
        - CONTEXT: Create a scene where the user is living this dream (e.g. if dream is "CEO", scene is "Boardroom" or "Industry Conference").
        - ACTOR: The user is the main character, confident and successful.
        - TASK: Discuss the Target Topic naturally within this "Future" setting.
        `
        : `
        Standard Mode:
        - The content should feature the user (or a persona similar to the user) making progress towards their dream or enjoying their interests.
        `;

    const prompt = `
    You are an expert English coach creating personalized shadowing materials.
    
    User Profile:
    - Dream/Goal: ${profile.dream}
    - Interests: ${profile.hobbies}
    - Occupation: ${profile.occupation}
    - Topics to Learn: ${profile.topics}
    - Level (General): ${profile.level}
    
    Requested Topic: ${topicInstruction}
    Target Length: ${length} (${wordCount} words)
    Target Difficulty: ${difficulty} (CEFR Scale)

    TOPIC BALANCE INSTRUCTION:
    The user wants a balanced mix.
    - RECENTLY COVERED (Avoid these specific topics): [${recentTopics.join(', ')}]
    - TARGET CATEGORY: Please prioritize using context from [${focusFields.join(', ')}] or [${secondaryFields.join(', ')}].
    - ROTATION: If a category has multiple items (e.g. multiple hobbies), please pick one that is DIFFERENT from the recent topics.
    
    Goal:
    Create a Short Story or Dialogue suitable for Shadowing practice.
    ${narrativeInstruction}
    
    Tone: ${profile.tone} (Encouraging, Professional, etc.)
    
    Output Schema (JSON):
    {
        "title": "Engaging Title",
        "content": "Full English text. Natural flow, suitable for speaking practice.",
        "translation": "Natural Japanese translation",
        "topic": "The Specific Topic (e.g. 'Coffee Brewing', 'Coding Interview')",
        "used_fields": ["hobbies", "dream"] // Which profile fields were mainly used?
    }
    
    Constraints:
    1. Output ONLY valid JSON.
    2. English level should strictly match CEFR Level: ${difficulty}. Use appropriate vocabulary and grammar for this level.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText) as GeneratedScript;
    } catch (error) {
        console.error('Gemini Script Gen Error:', error);
        throw error;
    }
}
