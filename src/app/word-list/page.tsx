'use client';

import { useStore, WordItem, WordStatus } from '@/lib/store';
import { generateSentences } from '@/lib/gemini';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, ArrowLeft, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function WordListPage() {
    const words = useStore((state) => state.words);
    const profile = useStore((state) => state.profile); // Need profile for generation
    const topicUsageHistory = useStore((state) => state.topicUsageHistory); // For balancing
    const updateTopicUsage = useStore((state) => state.updateTopicUsage);

    const addWord = useStore((state) => state.addWord);
    const addWordsBulk = useStore((state) => state.addWordsBulk);
    const deleteWord = useStore((state) => state.deleteWord);
    const updateWordStatus = useStore((state) => state.updateWordStatus); // Added
    const updateWordContent = useStore((state) => state.updateWordContent); // To save results
    const exportData = useStore((state) => state.exportData);
    const importData = useStore((state) => state.importData);

    const [inputWord, setInputWord] = useState('');
    const [bulkInput, setBulkInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedWordId, setExpandedWordId] = useState<string | null>(null);

    // Backup handling
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerate = async () => {
        // Find words that don't have sentences yet OR don't have a meaning OR don't have pronunciation
        const targetWords = words.filter(w => !w.sentence || !w.meaning || !w.pronunciation);

        if (targetWords.length === 0) {
            alert("All words already have sentences, meanings, and pronunciation! Add new words first.");
            return;
        }

        if (!confirm(`Generate content for ${targetWords.length} words? This might take a few seconds.`)) return;

        setIsGenerating(true);
        try {
            const results = await generateSentences(profile, targetWords, topicUsageHistory);

            const allUsedFields: string[] = [];

            // Save results to store
            results.forEach(res => {
                // Collect usage stats
                if (res.used_fields) {
                    allUsedFields.push(...res.used_fields);
                }

                // Find word by text
                const original = targetWords.find(w => w.word.toLowerCase() === res.word.toLowerCase());
                if (original) {
                    updateWordContent(original.id, {
                        sentence: res.sentence,
                        translation: res.translation,
                        meaning: res.meaning,
                        pronunciation: res.pronunciation,
                        reason: res.reason
                    });
                }
            });

            // Update history
            if (allUsedFields.length > 0) {
                updateTopicUsage(allUsedFields);
            }

            alert("Generation Complete!");
        } catch (e: any) {
            console.error(e);
            alert(`Generation Failed: ${e.message || 'Unknown Error'}`);
        } finally {
            setIsGenerating(false);
        }
    };


    const handleAddSingle = () => {
        if (inputWord.trim()) {
            addWord(inputWord);
            setInputWord('');
        }
    };

    const handleBulkAdd = () => {
        if (!bulkInput.trim()) return;
        // Split by newline or comma
        const list = bulkInput.split(/[\n,]+/).map(s => s.trim()).filter(s => s);
        addWordsBulk(list);
        setBulkInput('');
        alert(`Added ${list.length} words!`);
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'mastered': return 'bg-green-500 hover:bg-green-600';
            case 'learning': return 'bg-yellow-500 hover:bg-yellow-600';
            case 'review': return 'bg-red-500 hover:bg-red-600';
            default: return 'bg-gray-500 hover:bg-gray-600'; // new
        }
    };

    const handleExport = () => {
        const json = exportData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gwm_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            const result = importData(content);
            alert(result.message);
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    const toggleStatus = (word: WordItem) => {
        const nextStatus: Record<string, WordStatus> = {
            'new': 'learning',
            'learning': 'mastered',
            'mastered': 'review', // Loop back to review (revive)
            'review': 'mastered' // Review -> Mastered
        };
        // If somehow status is invalid, default to new
        const next = nextStatus[word.status] || 'new';
        updateWordStatus(word.id, next);
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <div className="mb-4">
                <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                </Link>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Word List Manager</h1>
                <div className="space-x-2">
                    {/* Backup Controls */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={handleFileChange}
                    />
                    <Button variant="outline" onClick={handleImportClick}>Import Backup</Button>
                    <Button variant="outline" onClick={handleExport}>Export Backup</Button>
                </div>
            </div>

            {/* AI Generation Call to Action */}
            <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900">
                <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-full text-white">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Ready to Learn?</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Generate personalized example sentences for your words.
                            </p>
                        </div>
                    </div>
                    <Button onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            'Generate Sentences'
                        )}
                    </Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Input Forms */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Words</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="single">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="single">Single</TabsTrigger>
                                    <TabsTrigger value="bulk">Bulk</TabsTrigger>
                                </TabsList>

                                <TabsContent value="single" className="space-y-4">
                                    <Input
                                        placeholder="Enter a word..."
                                        value={inputWord}
                                        onChange={(e) => setInputWord(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSingle()}
                                    />
                                    <Button onClick={handleAddSingle} className="w-full">Add</Button>
                                </TabsContent>

                                <TabsContent value="bulk" className="space-y-4">
                                    <Textarea
                                        placeholder="apple, banana, orange..."
                                        className="h-32"
                                        value={bulkInput}
                                        onChange={(e) => setBulkInput(e.target.value)}
                                    />
                                    <Button onClick={handleBulkAdd} className="w-full">Import CSV/Text</Button>
                                    <p className="text-xs text-muted-foreground">Accepts commas or newlines.</p>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Stats</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span>Total Words:</span>
                                    <span className="font-bold">{words.length}</span>
                                </div>
                                <div className="flex justify-between text-green-600">
                                    <span>Mastered:</span>
                                    <span>{words.filter(w => w.status === 'mastered').length}</span>
                                </div>
                                <div className="flex justify-between text-yellow-600">
                                    <span>Learning:</span>
                                    <span>{words.filter(w => w.status === 'learning').length}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: List */}
                <div className="md:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Your List</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {words.length === 0 ? (
                                <div className="text-center text-muted-foreground py-10">
                                    No words yet. Add some!
                                </div>
                            ) : (
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Word</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {[...words].reverse().map((word) => (
                                                <>
                                                    <TableRow key={word.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedWordId(expandedWordId === word.id ? null : word.id)}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center">
                                                                {word.word}
                                                                {word.sentence && <Sparkles className="h-3 w-3 text-blue-500 ml-2" />}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell onClick={(e) => { e.stopPropagation(); toggleStatus(word); }}>
                                                            <div className="flex items-center gap-2 cursor-pointer group" title="Click to change status">
                                                                <Badge className={cn(statusColor(word.status), "group-hover:opacity-80 transition-opacity")} variant="secondary">
                                                                    {word.status}
                                                                </Badge>
                                                                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button size="icon" variant="ghost" onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteWord(word.id);
                                                                }}>
                                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                                </Button>
                                                                {expandedWordId === word.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                    {expandedWordId === word.id && (
                                                        <TableRow className="bg-muted/50">
                                                            <TableCell colSpan={3}>
                                                                <div className="p-4 space-y-2">
                                                                    {word.sentence ? (
                                                                        <>
                                                                            <div>
                                                                                <span className="font-semibold text-blue-600 mr-2">English:</span>
                                                                                <span>{word.sentence}</span>
                                                                            </div>
                                                                            <div className="text-sm text-muted-foreground">
                                                                                <span className="font-semibold mr-2">JP:</span>
                                                                                <span>{word.translation}</span>
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground mt-2 italic bg-background p-2 rounded border">
                                                                                Context: {word.reason}
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <div className="text-sm text-muted-foreground italic flex items-center">
                                                                            No sentence generated yet. Click 'Generate Sentences' above.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
