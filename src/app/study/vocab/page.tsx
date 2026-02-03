'use client';

import { useState, useEffect } from 'react';
import { useStore, WordItem, WordStatus } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, RotateCcw, Home, Sparkles, Volume2, Mic, Square, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { speak } from '@/lib/audio';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

export default function StudyVocabPage() {
    const router = useRouter();
    const { isRecording, audioUrl, toggleRecording, clearRecording, stopRecording } = useAudioRecorder();

    // ... rest of store hooks
    const words = useStore((state) => state.words);
    const updateWordStatus = useStore((state) => state.updateWordStatus);

    const [studyMode, setStudyMode] = useState<'setup' | 'session' | 'result'>('setup');
    const [deck, setDeck] = useState<WordItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [sessionStats, setSessionStats] = useState({ known: 0, unknown: 0 });

    // Counts for UI
    const newWordsCount = words.filter(w => w.status === 'new').length;
    // Review targets: 'learning' or 'review'. 'mastered' is excluded.
    const reviewWordsCount = words.filter(w => w.status === 'learning' || w.status === 'review').length;
    const masteredWordsCount = words.filter(w => w.status === 'mastered').length;

    const startSession = (mode: 'new' | 'review') => {
        let candidates: WordItem[] = [];

        if (mode === 'new') {
            candidates = words.filter(w => w.status === 'new');
            // For new words, just shuffle or addedAt? Shuffle is fine for variety.
            candidates.sort(() => Math.random() - 0.5);
        } else {
            // Review: learning, review. NOT mastered.
            candidates = words.filter(w => w.status === 'learning' || w.status === 'review');

            // Sort by Last Reviewed Time (Ascending = Oldest first)
            // If lastReviewedAt is undefined, it's treated as 0 (very old).
            candidates.sort((a, b) => (a.lastReviewedAt || 0) - (b.lastReviewedAt || 0));
        }

        if (candidates.length === 0) return;

        // Take top 10 (Oldest first for review)
        setDeck(candidates.slice(0, 10));
        setCurrentIndex(0);
        setIsFlipped(false); // Reset flip state for new session
        setSessionStats({ known: 0, unknown: 0 });
        setStudyMode('session');
    };

    // Actions
    const handleNext = (known: boolean) => {
        const currentWord = deck[currentIndex];

        // Update Stats
        setSessionStats(prev => ({
            known: known ? prev.known + 1 : prev.known,
            unknown: !known ? prev.unknown + 1 : prev.unknown
        }));

        // Update Store Status
        if (known) {
            // Promotion Logic
            let nextStatus: WordStatus = currentWord.status;
            if (currentWord.status === 'new') nextStatus = 'learning';
            else if (currentWord.status === 'learning') nextStatus = 'mastered';
            else if (currentWord.status === 'review') nextStatus = 'mastered';

            if (nextStatus !== currentWord.status) {
                updateWordStatus(currentWord.id, nextStatus);
            }
        } else {
            // Demotion Logic (or stay)
            if (currentWord.status === 'new') updateWordStatus(currentWord.id, 'learning'); // Even if unknown, START learning
            else if (currentWord.status === 'mastered') updateWordStatus(currentWord.id, 'review'); // Downgrade if forgot
        }

        // Move next
        if (currentIndex < deck.length - 1) {
            setIsFlipped(false);
            setCurrentIndex(prev => prev + 1);
        } else {
            setStudyMode('result');
        }
    };

    const handleRestart = () => {
        setStudyMode('setup');
        setDeck([]);
    };

    // --- RENDER: GLOBAL NO WORDS ---
    if (words.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-4">
                <h2 className="text-xl font-bold">No words found</h2>
                <p className="text-muted-foreground">Please add some words to your list first.</p>
                <Button variant="outline" onClick={() => router.push('/word-list')}>
                    Go to Word List
                </Button>
                <Button variant="ghost" onClick={() => router.push('/')}>
                    <Home className="mr-2 h-4 w-4" /> Back Home
                </Button>
            </div>
        );
    }

    // --- RENDER: SETUP ---
    if (studyMode === 'setup') {
        const totalCandidates = newWordsCount + reviewWordsCount;
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-zinc-950 space-y-8 animate-in fade-in">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Study Session</h1>
                    <p className="text-muted-foreground">Choose what you want to focus on today.</p>
                    {masteredWordsCount > 0 && (
                        <Badge variant="outline" className="mt-2 text-green-600 border-green-200 bg-green-50">
                            {masteredWordsCount} words mastered! (Hidden from review)
                        </Badge>
                    )}
                </div>

                {totalCandidates === 0 ? (
                    <div className="flex flex-col items-center justify-center p-4 space-y-4">
                        <h2 className="text-xl font-bold">All caught up!</h2>
                        <p className="text-muted-foreground">You have mastered all existing words!</p>
                        <Button variant="outline" onClick={() => router.push('/word-list')}>
                            Add more words
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                        {/* New Words Card */}
                        <Card className={cn("hover:border-blue-400 transition-colors cursor-pointer group", newWordsCount === 0 && "opacity-50 cursor-not-allowed")} onClick={() => newWordsCount > 0 && startSession('new')}>
                            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                                <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:bg-blue-200 transition-colors">
                                    <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">New Words</h2>
                                    <p className="text-sm text-muted-foreground">Learn untouched words.</p>
                                </div>
                                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                    {newWordsCount}
                                </div>
                                <Button className="w-full" disabled={newWordsCount === 0} onClick={(e) => { e.stopPropagation(); startSession('new'); }}>
                                    Start Learning
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Review Card */}
                        <Card className={cn("hover:border-orange-400 transition-colors cursor-pointer group", reviewWordsCount === 0 && "opacity-50 cursor-not-allowed")} onClick={() => reviewWordsCount > 0 && startSession('review')}>
                            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                                <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-full group-hover:bg-orange-200 transition-colors">
                                    <RotateCcw className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">Review</h2>
                                    <p className="text-sm text-muted-foreground">Reinforce what you know.</p>
                                </div>
                                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                                    {reviewWordsCount}
                                </div>
                                <Button className="w-full" variant="outline" disabled={reviewWordsCount === 0} onClick={(e) => { e.stopPropagation(); startSession('review'); }}>
                                    Start Review
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <Button variant="ghost" onClick={() => router.push('/')}>
                    <Home className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>
            </div>
        );
    }

    // --- RENDER: RESULT ---
    if (studyMode === 'result') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-6 animate-in fade-in zoom-in">
                <h2 className="text-2xl font-bold">Session Complete!</h2>
                <div className="flex gap-8 text-center bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm">
                    <div>
                        <div className="text-4xl font-bold text-green-500">{sessionStats.known}</div>
                        <div className="text-sm text-muted-foreground font-medium">Known</div>
                    </div>
                    <div className="w-px bg-border"></div>
                    <div>
                        <div className="text-4xl font-bold text-orange-500">{sessionStats.unknown}</div>
                        <div className="text-sm text-muted-foreground font-medium">Learning</div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <Button onClick={handleRestart} className="w-full">
                        <RotateCcw className="mr-2 h-4 w-4" /> Another Session
                    </Button>
                    <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                        <Home className="mr-2 h-4 w-4" /> Dashboard
                    </Button>
                </div>
            </div>
        )
    }

    // --- RENDER: SESSION (Flashcard) ---
    const word = deck[currentIndex];

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-zinc-950 overflow-hidden">
            {/* Progress Bar */}
            <div className="w-full max-w-lg mb-8 space-y-2">
                <div className="flex justify-between text-sm font-medium text-slate-500">
                    <span>Word {currentIndex + 1} of {deck.length}</span>
                    <span>{sessionStats.known} Correct / {sessionStats.unknown} Try Again</span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${((currentIndex) / deck.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Flashcard Area */}
            <div className="relative w-full max-w-md h-96 perspective-1000">
                <div
                    className={cn(
                        "relative w-full h-80 transition-transform duration-500 transform-style-3d cursor-pointer",
                        isFlipped ? "rotate-y-180" : ""
                    )}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    {/* Front of Card */}
                    <Card className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-6 shadow-xl border-2 border-primary/5 hover:border-primary/20 transition-colors bg-white dark:bg-zinc-900">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6 bg-muted px-2 py-1 rounded">Vocabulary</div>
                        <h2 className="text-4xl font-bold text-center mb-2 tracking-tight">{word.word}</h2>
                        {word.pronunciation && (
                            <p className="text-xl text-slate-500 font-serif mb-4">{word.pronunciation}</p>
                        )}

                        <div className="flex items-center justify-center gap-4 mt-8">
                            {/* TTS Button */}
                            <Button
                                size="icon"
                                variant="outline"
                                className="hover:bg-blue-50 text-blue-600 rounded-full h-12 w-12 border-2"
                                onClick={(e) => { e.stopPropagation(); speak(word.word); }}
                                title="Listen to AI"
                            >
                                <Volume2 className="h-6 w-6" />
                            </Button>

                            {/* User Recording Button */}
                            <Button
                                size="icon"
                                variant={isRecording ? "destructive" : "outline"}
                                className={cn(
                                    "rounded-full h-12 w-12 border-2 transition-all duration-300",
                                    isRecording ? "animate-pulse ring-4 ring-red-200" : "hover:bg-red-50 text-red-500"
                                )}
                                onClick={(e) => { e.stopPropagation(); toggleRecording(); }}
                                title={isRecording ? "Stop Recording" : "Record Yourself"}
                            >
                                {isRecording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-6 w-6" />}
                            </Button>

                            {/* Play User Audio */}
                            {audioUrl && !isRecording && (
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="hover:bg-green-50 text-green-600 rounded-full h-12 w-12 border-2 animate-in fade-in slide-in-from-left-4"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const audio = new Audio(audioUrl);
                                        audio.play();
                                    }}
                                    title="Play Your Recording"
                                >
                                    <Play className="h-6 w-6 fill-current" />
                                </Button>
                            )}
                        </div>

                        <p className="text-muted-foreground text-xs mt-8 animate-pulse font-medium">Tap to flip</p>
                    </Card>

                    <Card className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-6 shadow-xl bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900 overflow-y-auto">
                        {/* Large Meaning (Word Definition) */}
                        <h3 className="text-4xl font-bold mb-8 text-center text-blue-900 dark:text-blue-100 tracking-tight">
                            {word.meaning || "Definition missing (Regenerate)"}
                        </h3>

                        {word.sentence ? (
                            <div className="w-full space-y-4">
                                {/* Sentence */}
                                <div className="text-center bg-white/60 dark:bg-black/30 p-4 rounded-xl border border-blue-100/50 dark:border-blue-900/30 relative">
                                    <p className="text-xl font-medium text-slate-800 dark:text-slate-200 leading-relaxed font-serif pb-2">
                                        "{word.sentence}"
                                    </p>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 absolute bottom-1 right-1"
                                        onClick={(e) => { e.stopPropagation(); speak(word.sentence || ''); }}
                                    >
                                        <Volume2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                {/* Sentence Translation (Medium Size) */}
                                <div className="text-center">
                                    <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">
                                        {word.translation}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                No sentence generated yet.
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-8 mt-12">
                <Button
                    variant="outline"
                    size="lg"
                    className="h-16 w-16 rounded-full border-2 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:border-slate-800 dark:hover:bg-red-950/30 transition-all shadow-sm"
                    onClick={(e) => { e.stopPropagation(); handleNext(false); }}
                >
                    <X className="h-8 w-8" />
                </Button>

                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Swipe or Click
                </div>

                <Button
                    variant="outline"
                    size="lg"
                    className="h-16 w-16 rounded-full border-2 border-slate-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200 dark:border-slate-800 dark:hover:bg-green-950/30 transition-all shadow-sm"
                    onClick={(e) => { e.stopPropagation(); handleNext(true); }}
                >
                    <Check className="h-8 w-8" />
                </Button>
            </div>

            <style jsx global>{`
            .perspective-1000 { perspective: 1000px; }
            .transform-style-3d { transform-style: preserve-3d; }
            .backface-hidden { backface-visibility: hidden; }
            .rotate-y-180 { transform: rotateY(180deg); }
        `}</style>
        </div>
    );
}
