'use client';

import { useStore } from '@/lib/store';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, Square, Play, Eye, EyeOff, Volume2, Repeat, CheckCircle, MicOff, Sparkles } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { evaluateAudio, EvaluationResult, WordAnalysis } from '@/actions/audio';
import { speak } from '@/lib/audio';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

// Helper for TTS with speed
// We need to override the generic speak to support speed properly or just use window.speechSynthesis directly here for control
const playText = (text: string, rate: number, onEnd?: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.onend = () => {
        if (onEnd) onEnd();
    };
    // Attempt to set voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => (v.name.includes('Google') || v.name.includes('Microsoft')) && v.lang.includes('en-US'));
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
};

export default function ShadowingPracticePage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const scripts = useStore((state) => state.scripts);
    const script = scripts.find(s => s.id === id);
    const profile = useStore((state) => state.profile);


    // States
    const [showText, setShowText] = useState(true);
    const [showTranslation, setShowTranslation] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [isPlayingModel, setIsPlayingModel] = useState(false);

    // Step Mode States
    const [mode, setMode] = useState<'full' | 'step'>('full');
    const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(0);

    // Recorder
    const { isRecording, audioUrl, toggleRecording, stopRecording } = useAudioRecorder();

    // STT
    const { isListening: isSttListening, transcript, startListening, stopListening, hasRecognition } = useSpeechRecognition();

    // AI Evaluation
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    // New Type Definition
    type WordAnalysis = {
        word: string;
        score: number;
        status: 'good' | 'weak' | 'bad';
        phonetic?: string;
        heard_as?: string;
        advice?: string;
        link_to_next?: 'none' | 'good' | 'missed';
    };
    type EvaluationResult = {
        total_score: number;
        feedback_summary: string;
        words: WordAnalysis[];
    };
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    // Analysis UI State
    const [selectedWord, setSelectedWord] = useState<WordAnalysis | null>(null);

    const handleToggleRecording = () => {
        if (isRecording) {
            stopRecording();
            stopListening();
        } else {
            setEvaluation(null); // Reset prev evaluation
            toggleRecording();
            startListening();
        }
    };

    const handleAnalyze = async () => {
        if (!audioUrl) return;
        setIsAnalyzing(true);
        try {
            console.log('Fetching audio blob...');
            const response = await fetch(audioUrl);
            const blob = await response.blob();
            console.log('Audio Blob Type:', blob.type, 'Size:', blob.size);

            // Check if blob is valid
            if (blob.size < 100) {
                alert("Audio is too short or empty.");
                setIsAnalyzing(false);
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                // Full Mode = Analyze Full Script, Step Mode = Analyze Single Sentence
                const text = mode === 'step' ? sentences[activeSentenceIndex] : script.content;
                try {
                    // Pass User API Key
                    const result = await evaluateAudio(base64, text, profile.apiKey);
                    setEvaluation(result);
                } catch (e: any) {
                    console.error('Analysis failed:', e);
                    alert(`Analysis Error: ${e.message}`);
                } finally {
                    setIsAnalyzing(false);
                }
            };
        } catch (e: any) {
            console.error('Client Prep Error:', e);
            alert(`Preparation Error: ${e.message}`);
            setIsAnalyzing(false);
        }
    };

    // Compare Mode State
    const [isComparing, setIsComparing] = useState(false);

    useEffect(() => {
        if (!script) {
            // alert('Script not found'); 
            // Don't alert immediately on mount as scripts might load? 
            // In pure SPA, store is ready. If not found, it really is missing.
            // router.push('/shadowing');
        }
    }, [script, router]);

    if (!script) return <div className="p-8 text-center">Script not found. <Button variant="link" onClick={() => router.push('/shadowing')}>Go Back</Button></div>;

    // Helper to split sentences
    const getSentences = (text: string) => {
        if (typeof Intl !== 'undefined' && Intl.Segmenter) {
            const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
            return Array.from(segmenter.segment(text)).map(s => s.segment.trim()).filter(s => s.length > 0);
        }
        // Fallback for environments without Intl.Segmenter or for simpler cases
        return text.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g)?.map(s => s.trim()) || [text];
    };

    const sentences = getSentences(script.content);

    const handlePlayModel = () => {
        const textToPlay = mode === 'step' ? sentences[activeSentenceIndex] : script.content;

        if (isPlayingModel) {
            window.speechSynthesis.cancel();
            setIsPlayingModel(false);
        } else {
            setIsPlayingModel(true);
            playText(textToPlay, playbackRate, () => setIsPlayingModel(false));
        }
    };

    const handleCompare = () => {
        if (!audioUrl) return;
        setIsComparing(true);
        const textToPlay = mode === 'step' ? sentences[activeSentenceIndex] : script.content;

        // 1. Play Model
        playText(textToPlay, playbackRate, () => {
            // 2. Play User Audio after Model finishes
            setTimeout(() => {
                const audio = new Audio(audioUrl);
                audio.onended = () => setIsComparing(false);
                audio.play();
            }, 500);
        });
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl min-h-screen flex flex-col">
            <header className="mb-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold truncate">{script.title}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={mode === 'step' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setMode(mode === 'full' ? 'step' : 'full')}
                        className="text-xs font-semibold"
                    >
                        {mode === 'full' ? 'Full Mode' : 'Step Mode'}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowText(!showText)}
                        title={showText ? "Hide Text (Blind Mode)" : "Show Text"}
                    >
                        {showText ? <Eye className="h-4 w-4 text-blue-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                </div>
            </header>

            {/* Script Area */}
            <Card className="flex-1 mb-6 overflow-hidden flex flex-col transition-all">
                <CardContent className={cn(
                    "flex-1 p-6 overflow-y-auto max-h-[60vh] text-center flex flex-col items-center",
                    // Align to start to prevent top clipping when overflowing
                    "justify-start pt-8"
                )}>
                    {!showText ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 space-y-4">
                            <EyeOff className="h-12 w-12" />
                            <p>Blind Mode Active. Listen carefully.</p>
                        </div>
                    ) : mode === 'full' ? (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <p className="text-xl md:text-2xl font-serif font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                                {script.content}
                            </p>
                            {/* Simple Transcription in Full Mode */}
                            {transcript && isRecording && (
                                <div className="mt-4 p-4 rounded-lg bg-muted text-sm text-emerald-600 font-mono animate-pulse">
                                    <Mic className="inline h-4 w-4 mr-2" />
                                    {transcript}
                                </div>
                            )}

                            {/* Full Mode Analysis */}
                            {audioUrl && !isRecording && (
                                <div className="mt-4">
                                    {!evaluation ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleAnalyze}
                                            disabled={isAnalyzing}
                                            className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                        >
                                            {isAnalyzing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4 text-indigo-500" />}
                                            Analyze Pronunciation (Gemini)
                                        </Button>
                                    ) : (
                                        <EvaluationCard
                                            evaluation={evaluation}
                                            selectedWord={selectedWord}
                                            setSelectedWord={setSelectedWord}
                                        />
                                    )}
                                </div>
                            )}

                            {showTranslation && (
                                <p className="text-muted-foreground border-t pt-4">
                                    {script.translation}
                                </p>
                            )}
                            <Button variant="link" size="sm" onClick={() => setShowTranslation(!showTranslation)}>
                                {showTranslation ? "Hide Translation" : "Show Translation"}
                            </Button>
                        </div>
                    ) : (
                        // Step Mode View
                        <div className="space-y-4 w-full max-w-xl mx-auto pb-20">
                            {sentences.map((sent, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => { setActiveSentenceIndex(idx); setEvaluation(null); }}
                                    className={cn(
                                        "p-4 rounded-xl cursor-pointer transition-all border-2 text-left",
                                        activeSentenceIndex === idx
                                            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-105 shadow-sm"
                                            : "border-transparent hover:bg-muted"
                                    )}
                                >
                                    <p className={cn(
                                        "text-lg font-medium",
                                        activeSentenceIndex === idx ? "text-indigo-900 dark:text-indigo-100" : "text-muted-foreground"
                                    )}>
                                        {sent}
                                    </p>

                                    {/* Real-time Transcription Feedback */}
                                    {activeSentenceIndex === idx && transcript && (
                                        <div className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/40 p-2 rounded border border-emerald-200 dark:border-emerald-800">
                                            <Mic className="inline h-3 w-3 mr-2 mb-0.5" />
                                            {transcript}
                                        </div>
                                    )}

                                    {/* AI Evaluation Button & Result */}
                                    {activeSentenceIndex === idx && audioUrl && !isRecording && !isSttListening && (
                                        <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                                            {!evaluation ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleAnalyze}
                                                    disabled={isAnalyzing}
                                                    className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                >
                                                    {isAnalyzing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4 text-indigo-500" />}
                                                    Analyze Pronunciation (Gemini)
                                                </Button>
                                            ) : (
                                                <EvaluationCard
                                                    evaluation={evaluation}
                                                    selectedWord={selectedWord}
                                                    setSelectedWord={setSelectedWord}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Controls */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 pb-8 md:static md:bg-transparent md:border-0 md:p-0">
                <div className="max-w-4xl mx-auto flex flex-col gap-6">

                    {/* Speed Control */}
                    <div className="flex items-center justify-center gap-4 w-full max-w-xs mx-auto">
                        <span className="text-xs text-muted-foreground font-mono">0.5x</span>
                        <Slider
                            value={[playbackRate]}
                            min={0.5}
                            max={1.5}
                            step={0.1}
                            onValueChange={(vals) => setPlaybackRate(vals[0])}
                            className="w-full"
                        />
                        <span className="text-xs text-muted-foreground font-mono">1.5x</span>
                        <Badge variant="outline" className="text-xs font-mono ml-2 w-12 text-center">{playbackRate.toFixed(1)}x</Badge>
                    </div>

                    {/* Main Actions */}
                    <div className="flex items-center justify-center gap-6">
                        {/* Play Model */}
                        <Button
                            size="lg"
                            variant={isPlayingModel ? "outline" : "secondary"}
                            className="rounded-full h-16 w-16 shadow-sm border-2"
                            onClick={handlePlayModel}
                        >
                            {isPlayingModel ? <Square className="h-6 w-6 fill-current" /> : <Volume2 className="h-8 w-8" />}
                        </Button>

                        {/* Record */}
                        <Button
                            size="lg"
                            variant={isRecording ? "destructive" : "default"}
                            className={cn(
                                "rounded-full h-20 w-20 shadow-xl border-4 border-white dark:border-zinc-950 transition-all text-white",
                                isRecording ? "animate-pulse ring-4 ring-red-200 scale-110" : "bg-red-500 hover:bg-red-600"
                            )}
                            onClick={handleToggleRecording}
                        >
                            {isRecording ? <Square className="h-8 w-8 fill-current" /> : <Mic className="h-10 w-10" />}
                        </Button>

                        {/* Compare (Play Link) */}
                        <Button
                            size="lg"
                            variant="outline"
                            className="rounded-full h-16 w-16 shadow-sm border-2 text-green-600 hover:bg-green-50 disabled:opacity-30"
                            disabled={!audioUrl || isRecording || isPlayingModel || isComparing}
                            onClick={handleCompare}
                            title="Compare Model & User Audio"
                        >
                            {isComparing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Repeat className="h-8 w-8" />}
                        </Button>
                    </div>

                    <div className="text-center">
                        <span className="text-xs text-muted-foreground">
                            {isComparing ? "Comparing..." : isPlayingModel ? "Playing Model..." : isRecording ? "Recording..." : audioUrl ? "Ready to Compare" : "Tap Mic to Start"}
                        </span>
                    </div>
                </div>
            </div>
            {/* Spacer for fixed bottom controls on mobile */}
            <div className="h-32 md:h-0" />
        </div>
    );
}

function Loader2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}

function EvaluationCard({
    evaluation,
    selectedWord,
    setSelectedWord
}: {
    evaluation: EvaluationResult;
    selectedWord: WordAnalysis | null;
    setSelectedWord: (w: WordAnalysis | null) => void;
}) {
    return (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 text-left w-full max-w-2xl mx-auto">
            <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
                <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                <CheckCircle className="text-blue-500 h-5 w-5" />
                                Pronunciation Heatmap
                            </h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Tap words for advice</p>
                        </div>
                        <div className="text-right">
                            <span className={cn("text-3xl font-black block leading-none",
                                evaluation.total_score >= 80 ? "text-green-600" :
                                    evaluation.total_score >= 60 ? "text-amber-500" : "text-red-500"
                            )}>
                                {evaluation.total_score}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Score</span>
                        </div>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-900/50 p-2 rounded italic border border-slate-100 dark:border-slate-800">
                        "{evaluation.feedback_summary}"
                    </p>

                    {/* HEATMAP */}
                    <div className="flex flex-wrap items-center gap-y-3 mb-4 p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-inner">
                        {evaluation.words.map((w, idx) => (
                            <div key={idx} className="flex items-center">
                                {/* Word Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedWord(w); }}
                                    className={cn(
                                        "px-2 py-1 rounded-md transition-all relative text-base font-medium border border-transparent select-none",
                                        selectedWord === w ? "ring-2 ring-blue-500 ring-offset-1 z-10 bg-white dark:bg-slate-800 shadow-md" : "",
                                        w.status === 'bad' ? "text-red-600 bg-red-50/50 dark:bg-red-900/20 underline decoration-red-300 underline-offset-4" :
                                            w.status === 'weak' ? "text-amber-600 bg-amber-50/50 dark:bg-amber-900/20 underline decoration-amber-300 underline-offset-4" :
                                                "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                                    )}
                                >
                                    {w.word}
                                </button>

                                {/* Linking Connection (to next word) */}
                                {w.link_to_next && w.link_to_next !== 'none' && idx < evaluation.words.length - 1 && (
                                    <div className="flex flex-col items-center justify-end h-full -mx-1 pointer-events-none select-none z-0" style={{ marginBottom: '-6px' }}>
                                        {w.link_to_next === 'good' ? (
                                            <svg width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-emerald-500 dark:text-emerald-400">
                                                <path d="M2 1C6 10 18 10 22 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                            </svg>
                                        ) : (
                                            <svg width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-400 dark:text-red-500 opacity-80">
                                                <path d="M2 1C6 10 18 10 22 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
                                                <circle cx="12" cy="8" r="1.5" fill="currentColor" />
                                            </svg>
                                        )}
                                    </div>
                                )}
                                {(!w.link_to_next || w.link_to_next === 'none') && <div className="w-2" />}
                            </div>
                        ))}
                    </div>

                    {/* SELECTED WORD DETAIL */}
                    {selectedWord && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-100 dark:border-blue-900 animate-in zoom-in-95 duration-200 relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedWord(null); }}
                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1"
                            >
                                ✕
                            </button>
                            <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                                <span className="font-bold text-lg text-slate-800 dark:text-slate-100">{selectedWord.word}</span>
                                {selectedWord.phonetic && (
                                    <span className="font-mono text-slate-500 dark:text-slate-400 text-sm mr-1">
                                        {selectedWord.phonetic}
                                    </span>
                                )}
                                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                                    selectedWord.status === 'bad' ? "bg-red-100 text-red-700" :
                                        selectedWord.status === 'weak' ? "bg-amber-100 text-amber-700" :
                                            "bg-green-100 text-green-700"
                                )}>{selectedWord.status}</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {selectedWord.heard_as && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-[10px] uppercase text-muted-foreground w-12 shrink-0">Heard</span>
                                        <span className="font-mono text-red-600 bg-white dark:bg-black/20 px-1 rounded">{selectedWord.heard_as}</span>
                                    </div>
                                )}
                                {selectedWord.advice && (
                                    <div className="flex items-start gap-2 text-sm">
                                        <span className="text-[10px] uppercase text-muted-foreground w-12 shrink-0 mt-0.5">Advice</span>
                                        <span className="text-slate-700 dark:text-slate-300">{selectedWord.advice}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
