'use client';

import { useStore, ShadowingScript } from '@/lib/store';
import { generateShadowingScript } from '@/lib/gemini';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Play, Trash2, Home, BookOpen, Shuffle } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function ShadowingPage() {
    const router = useRouter();
    const scripts = useStore((state) => state.scripts);
    const profile = useStore((state) => state.profile);
    const addScript = useStore((state) => state.addScript);
    const deleteScript = useStore((state) => state.deleteScript);

    const topicUsageHistory = useStore((state) => state.topicUsageHistory);
    const updateTopicUsage = useStore((state) => state.updateTopicUsage);

    const [isGenerating, setIsGenerating] = useState(false);
    const [topicInput, setTopicInput] = useState('');
    const [showInput, setShowInput] = useState(false);

    // Generation Options
    const [length, setLength] = useState<string>('Short');
    const [difficulty, setDifficulty] = useState<string>(profile.level || 'B1');
    const [narrativeMode, setNarrativeMode] = useState<string>('default');

    const handleGenerate = async (topicOverride?: string) => {
        const targetTopic = topicOverride || topicInput;
        if (!targetTopic.trim()) return;

        setIsGenerating(true);
        try {
            // Get last 5 topics to avoid repetition
            const recentTopics = scripts.slice(0, 5).map(s => s.topic);
            const res = await generateShadowingScript(
                profile,
                targetTopic,
                { length, difficulty, mode: narrativeMode },
                topicUsageHistory,
                recentTopics,
                profile.apiKey
            );
            const newScript: ShadowingScript = {
                id: uuidv4(),
                title: res.title,
                content: res.content,
                translation: res.translation,
                topic: res.topic, // AI will return the actual topic name if random
                createdAt: Date.now()
            };
            addScript(newScript);

            // Update topic balance history
            if (res.used_fields) {
                updateTopicUsage(res.used_fields);
            }

            setTopicInput('');
            setShowInput(false);
        } catch (error) {
            console.error(error);
            alert('Generation failed. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl min-h-screen">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Shadowing</h1>
                    <p className="text-muted-foreground">Practice speaking with longer context.</p>
                </div>
                <Button variant="ghost" onClick={() => router.push('/')}>
                    <Home className="mr-2 h-4 w-4" /> Dashboard
                </Button>
            </header>

            {/* Generation Settings (Global) */}
            <Card className="mb-6 p-4 bg-muted/30">
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Narrative Mode</label>
                            <Select value={narrativeMode} onValueChange={setNarrativeMode}>
                                <SelectTrigger className={narrativeMode === 'story_future' ? "border-indigo-500 bg-indigo-50/50" : ""}>
                                    <SelectValue placeholder="Select mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Standard (Making Progress)</SelectItem>
                                    <SelectItem value="story_future">Future Self (Immersive 🌟)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Target Length</label>
                            <Select value={length} onValueChange={setLength}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select length" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Short">Short (40-70w)</SelectItem>
                                    <SelectItem value="Medium">Medium (100-150w)</SelectItem>
                                    <SelectItem value="Long">Long (180-250w)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Difficulty (CEFR)</label>
                            <Select value={difficulty} onValueChange={setDifficulty}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="A1">A1 (Beginner)</SelectItem>
                                    <SelectItem value="A2">A2 (Elementary)</SelectItem>
                                    <SelectItem value="B1">B1 (Intermediate)</SelectItem>
                                    <SelectItem value="B2">B2 (Upper Interm)</SelectItem>
                                    <SelectItem value="C1">C1 (Advanced)</SelectItem>
                                    <SelectItem value="C2">C2 (Proficient)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Actions */}
            <div className="mb-8 flex flex-col md:flex-row gap-4">
                {!showInput ? (
                    <>
                        <Button onClick={() => setShowInput(true)} className="flex-1 md:flex-none">
                            <Plus className="mr-2 h-4 w-4" /> Create New Script (Custom Topic)
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => handleGenerate('SURPRISE_ME')}
                            disabled={isGenerating}
                            className="flex-1 md:flex-none bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
                        >
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shuffle className="mr-2 h-4 w-4" />}
                            Surprise Me
                        </Button>
                    </>
                ) : (
                    <Card className="p-4 bg-muted/50 border-dashed w-full">
                        <div className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Manual Topic</label>
                                <Input
                                    placeholder="e.g. My morning routine"
                                    value={topicInput}
                                    onChange={(e) => setTopicInput(e.target.value)}
                                />
                            </div>

                            {/* Settings are now global above */}

                            <div className="flex gap-2 justify-end pt-2">
                                <Button variant="outline" onClick={() => setShowInput(false)}>Cancel</Button>
                                <Button onClick={() => handleGenerate()} disabled={isGenerating || !topicInput.trim()}>
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SparklesIcon className="mr-2 h-4 w-4" />}
                                    Generate
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scripts.length === 0 && !showInput && (
                    <div className="col-span-full text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border-dashed border-2">
                        <BookOpen className="mx-auto h-12 w-12 opacity-20 mb-4" />
                        <p>No scripts yet. Generate one to start shadowing!</p>
                    </div>
                )}

                {scripts.map(script => (
                    <Card key={script.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-xl line-clamp-1" title={script.title}>{script.title}</CardTitle>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => deleteScript(script.id)}
                                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardDescription>{new Date(script.createdAt).toLocaleDateString()}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Badge variant="secondary" className="mb-2">{script.topic}</Badge>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                                {script.content}
                            </p>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => router.push(`/shadowing/practice/${script.id}`)}>
                                <Play className="mr-2 h-4 w-4" /> Practice
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function SparklesIcon(props: any) {
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
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M9 3v4" />
            <path d="M21 3v4" />
            <path d="M17 3v4" />
        </svg>
    )
}
