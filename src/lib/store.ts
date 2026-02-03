import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// --- Types ---
export type Profile = {
    name: string;
    age: string;
    gender: string;
    occupation: string;
    hobbies: string;
    family: string;
    origin: string;
    topics: string; // Things you want to learn / Interests
    additionalContext: string; // Other keywords (companies, locations, favorite things)
    dream: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    tone: 'friendly' | 'spartan' | 'business' | 'kind';
    // Additional "Flavor" options
    motivationQuotes: string; // Newline separated
    apiKey?: string; // App-Level API Key (User Provided)
};

export type WordStatus = 'new' | 'learning' | 'mastered' | 'review';

export type WordItem = {
    id: string; // uuid
    word: string;
    status: WordStatus;
    addedAt: number;
    lastReviewedAt?: number;
    masteredAt?: number;
    learningCount: number; // How many times reviewed
    // AI Generated Content
    sentence?: string;
    translation?: string;
    meaning?: string;
    pronunciation?: string; // IPA e.g. /wɜːrd/
    reason?: string; // Why this context?
};

export type ShadowingScript = {
    id: string;
    title: string;
    content: string; // English text
    translation: string; // Japanese translation
    topic: string;
    createdAt: number;
};

export type AppState = {
    profile: Profile;
    words: WordItem[];
    scripts: ShadowingScript[];

    // Actions
    updateProfile: (profile: Partial<Profile>) => void;
    addWord: (word: string) => void;
    addWordsBulk: (words: string[]) => void;
    updateWordStatus: (id: string, status: WordStatus) => void;
    updateWordContent: (id: string, content: { sentence: string; translation: string; meaning?: string; pronunciation?: string; reason: string }) => void;
    deleteWord: (id: string) => void;

    // Shadowing Actions
    addScript: (script: ShadowingScript) => void;
    deleteScript: (id: string) => void;

    // Backup/Restore
    exportData: () => string;
    importData: (jsonData: string) => { success: boolean; message: string };

    // Topic Balancing
    topicUsageHistory: Record<string, number>;
    updateTopicUsage: (fields: string[]) => void;

    // Gamification
    growth: {
        totalTrees: number;
        currentStage: number; // 0-30
        lastActivityDate: number;
    };
    checkDailyGrowth: () => void;
    // Debug
    debugSetGrowth: (stage: number, total: number, daysAgo: number) => void;
};

// --- Initial State ---
const initialProfile: Profile = {
    name: '',
    age: '',
    gender: '',
    occupation: '',
    hobbies: '',
    family: '',
    origin: '',
    topics: '',
    additionalContext: '',
    dream: '',
    level: 'intermediate',
    tone: 'friendly',
    motivationQuotes: '',
};

// --- Store ---
export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            profile: initialProfile,
            words: [],
            scripts: [],
            topicUsageHistory: {},
            growth: {
                totalTrees: 0,
                currentStage: 0,
                lastActivityDate: 0,
            },

            checkDailyGrowth: () =>
                set((state) => {
                    const now = Date.now();
                    const last = state.growth.lastActivityDate;

                    // First time user
                    if (last === 0) {
                        return {
                            growth: {
                                totalTrees: 0,
                                currentStage: 1, // Start with 1 on first day
                                lastActivityDate: now,
                            }
                        };
                    }

                    const oneDay = 24 * 60 * 60 * 1000;
                    const todayStart = new Date(now).setHours(0, 0, 0, 0);
                    const lastStart = new Date(last).setHours(0, 0, 0, 0);
                    const diffDays = Math.floor((todayStart - lastStart) / oneDay);

                    if (diffDays === 0) return state; // Already recorded today

                    // Apply Decay
                    // Rule: "3 days gap -> lose 1 day accumulation. Subsequent days lose 1 more"
                    // Gap=1 (Consecutive days): 0 decay.
                    // Gap=2 (Skipped 1 day): 0 decay.
                    // Gap=3 (Skipped 2 days): 1 penalty.
                    // Penalty = max(0, diffDays - 2)
                    let newStage = state.growth.currentStage;
                    if (diffDays >= 3) {
                        const penalty = diffDays - 2;
                        newStage = Math.max(0, newStage - penalty);
                    }

                    // Apply Growth (Login bonus)
                    // Only grow if not maxed out (though logic says reset at 30, so effectively 0-29 -> 30)
                    newStage = Math.min(30, newStage + 1);

                    let newTotal = state.growth.totalTrees;
                    // Check if Tree Finished
                    if (newStage >= 30) {
                        newTotal += 1;
                        newStage = 0; // Reset to Seed
                    }

                    return {
                        growth: {
                            totalTrees: newTotal,
                            currentStage: newStage,
                            lastActivityDate: now,
                        }
                    };
                }),

            debugSetGrowth: (stage, total, daysAgo) =>
                set((state) => {
                    const now = Date.now();
                    const oneDay = 24 * 60 * 60 * 1000;
                    return {
                        growth: {
                            currentStage: stage,
                            totalTrees: total,
                            lastActivityDate: now - (daysAgo * oneDay)
                        }
                    };
                }),

            updateProfile: (newProfile) =>
                set((state) => ({ profile: { ...state.profile, ...newProfile } })),

            addWord: (wordText) =>
                set((state) => {
                    const trimmed = wordText.trim();
                    if (!trimmed) return state;
                    // Avoid duplicates based on text content (case-insensitive check maybe? Let's keep it simple first)
                    const exists = state.words.some((w) => w.word.toLowerCase() === trimmed.toLowerCase());
                    if (exists) return state;

                    const newWord: WordItem = {
                        id: crypto.randomUUID(),
                        word: trimmed,
                        status: 'new',
                        addedAt: Date.now(),
                        learningCount: 0,
                    };
                    return { words: [...state.words, newWord] };
                }),

            addWordsBulk: (wordTexts) =>
                set((state) => {
                    const newWords: WordItem[] = [];
                    const existingWords = new Set(state.words.map((w) => w.word.toLowerCase()));

                    wordTexts.forEach((text) => {
                        const trimmed = text.trim();
                        if (trimmed && !existingWords.has(trimmed.toLowerCase())) {
                            newWords.push({
                                id: crypto.randomUUID(),
                                word: trimmed,
                                status: 'new',
                                addedAt: Date.now(),
                                learningCount: 0,
                            });
                            existingWords.add(trimmed.toLowerCase());
                        }
                    });

                    if (newWords.length === 0) return state;
                    return { words: [...state.words, ...newWords] };
                }),

            updateWordStatus: (id, status) => set((state) => ({
                words: state.words.map(w => {
                    if (w.id !== id) return w;
                    const now = Date.now();
                    return {
                        ...w,
                        status,
                        lastReviewedAt: now,
                        learningCount: w.learningCount + 1,
                        masteredAt: status === 'mastered' ? now : w.masteredAt
                    };
                })
            })),

            updateWordContent: (id, content) =>
                set((state) => ({
                    words: state.words.map((w) =>
                        w.id === id ? { ...w, ...content } : w
                    ),
                })),

            deleteWord: (id) =>
                set((state) => ({
                    words: state.words.filter((w) => w.id !== id),
                })),

            addScript: (script) =>
                set((state) => ({
                    scripts: [script, ...state.scripts],
                })),

            deleteScript: (id) =>
                set((state) => ({
                    scripts: state.scripts.filter((s) => s.id !== id),
                })),

            updateTopicUsage: (fields) =>
                set((state) => {
                    const newHistory = { ...state.topicUsageHistory };
                    fields.forEach(f => {
                        newHistory[f] = (newHistory[f] || 0) + 1;
                    });
                    return { topicUsageHistory: newHistory };
                }),

            exportData: () => {
                const state = get();
                const backup = {
                    version: 1,
                    exportedAt: Date.now(),
                    profile: state.profile,
                    words: state.words,
                    topicUsageHistory: state.topicUsageHistory,
                    growth: state.growth,
                };
                return JSON.stringify(backup, null, 2);
            },

            importData: (jsonStr) => {
                try {
                    const backup = JSON.parse(jsonStr);
                    if (!backup || !backup.words) {
                        return { success: false, message: 'Invalid backup format' };
                    }

                    set((state) => {
                        // Smart Merge Logic

                        // 1. Profile: Overwrite if backup has data? Or keep local?
                        // Usually restore means "I want this state". But user asked for "Merge".
                        // Let's assume Profile is updated to the backup's profile if it exists, roughly.
                        const mergedProfile = { ...state.profile, ...backup.profile };

                        // 2. Words: Merge
                        // - If distinct word: Add it.
                        // - If same word:
                        //   - Strategy: "Max Progress". If backup says "Mastered" and local says "New", take "Mastered".
                        //   - Let's define specific priority: Mastered > Review > Learning > New.

                        const statusPriority: Record<WordStatus, number> = {
                            'mastered': 4,
                            'review': 3,
                            'learning': 2,
                            'new': 1,
                        };

                        const mergedWordsMap = new Map<string, WordItem>();

                        // Add existing local words first
                        state.words.forEach(w => mergedWordsMap.set(w.word.toLowerCase(), w));

                        // Merge backup words
                        backup.words.forEach((bw: WordItem) => {
                            const key = bw.word.toLowerCase();
                            const existing = mergedWordsMap.get(key);

                            if (!existing) {
                                // New word from backup
                                mergedWordsMap.set(key, bw);
                            } else {
                                // Conflict: Merge logic
                                const existingP = statusPriority[existing.status] || 0;
                                const backupP = statusPriority[bw.status] || 0;

                                // If backup has higher or equal progress, take backup's status/stats
                                // Also sum up learning counts? Or take max? Let's take max for now to be safe.
                                if (backupP >= existingP) {
                                    mergedWordsMap.set(key, {
                                        ...bw,
                                        id: existing.id, // Keep local ID to avoid weirdness if possible, though ID doesn't matter much if completely refreshing. actually let's use backup's ID? No, local ID is better if we have referenced it elsewhere.
                                        // Actually, simpler to just take the "better" object entirely.
                                        learningCount: Math.max(existing.learningCount, bw.learningCount)
                                    });
                                } else {
                                    // Local is more advanced, keep local but maybe update metadata
                                    mergedWordsMap.set(key, {
                                        ...existing,
                                        learningCount: Math.max(existing.learningCount, bw.learningCount)
                                    });
                                }
                            }
                        });

                        return {
                            profile: mergedProfile,
                            words: Array.from(mergedWordsMap.values()),
                            growth: backup.growth || state.growth,
                        };
                    });

                    return { success: true, message: 'Import successful with Smart Merge!' };
                } catch (e) {
                    console.error(e);
                    return { success: false, message: 'Failed to parse JSON' };
                }
            },
        }),
        {
            name: 'english-app-storage', // Key in LocalStorage
            storage: createJSONStorage(() => localStorage),
        }
    )
);
