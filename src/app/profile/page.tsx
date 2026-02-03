'use client';

import { useStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ProfilePage() {
    const profile = useStore((state) => state.profile);
    const updateProfile = useStore((state) => state.updateProfile);

    // Local state for form handling to avoid jitter, initialized from store
    const [formData, setFormData] = useState(profile);

    // Sync from store on mount/update (in case store changes externally, though rare here)
    useEffect(() => {
        setFormData(profile);
    }, [profile]);

    const handleChange = (key: keyof typeof profile, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        updateProfile(formData);
        alert('Profile Saved Successfully!');
    };

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <div className="mb-6">
                <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                </Link>
            </div>

            <h1 className="text-2xl font-bold mb-6">Your Profile</h1>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Tell the AI about yourself to generate personalized content.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                placeholder="Name"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label htmlFor="age">Age</Label>
                                <Input
                                    id="age"
                                    placeholder="Ex: 25"
                                    value={formData.age}
                                    onChange={(e) => handleChange('age', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gender">Gender</Label>
                                <Input
                                    id="gender"
                                    placeholder="Ex: Male"
                                    value={formData.gender}
                                    onChange={(e) => handleChange('gender', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="occupation">Occupation</Label>
                            <Input
                                id="occupation"
                                placeholder="例: Webエンジニア, 学生"
                                value={formData.occupation}
                                onChange={(e) => handleChange('occupation', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="origin">Origin / Hometown</Label>
                            <Input
                                id="origin"
                                placeholder="例: 大阪, Tokyo"
                                value={formData.origin}
                                onChange={(e) => handleChange('origin', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="family">Family Structure</Label>
                        <Input
                            id="family"
                            placeholder="Ex: Wife and 2 kids (son 5yo, daughter 3yo)"
                            value={formData.family}
                            onChange={(e) => handleChange('family', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Used to create sentences about your daily life.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hobbies">Hobbies</Label>
                        <Textarea
                            id="hobbies"
                            placeholder="Ex: Soccer, Cooking, Reading sci-fi novels..."
                            value={formData.hobbies}
                            onChange={(e) => handleChange('hobbies', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="topics">Topics to Learn</Label>
                        <Textarea
                            id="topics"
                            placeholder="Ex: Computer Science, History, Marketing..."
                            value={formData.topics}
                            onChange={(e) => handleChange('topics', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="additionalContext">Other Context / Keywords</Label>
                        <Input
                            id="additionalContext"
                            placeholder="例: Google, 禅, 猫, スタートアップ..."
                            value={formData.additionalContext}
                            onChange={(e) => handleChange('additionalContext', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Any specific entities, companies, or concepts you want to appear in examples.</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>AI Persona Settings</CardTitle>
                    <CardDescription>Customize how the AI teaches you.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="dream">Future Dream / Goal</Label>
                        <Textarea
                            id="dream"
                            placeholder="例: シリコンバレーで起業したい、世界一周旅行に行きたい..."
                            value={formData.dream}
                            onChange={(e) => handleChange('dream', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Used for 'Narrative Mode' stories.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>English Level</Label>
                            <Select
                                value={formData.level}
                                onValueChange={(val: any) => handleChange('level', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="beginner">Beginner</SelectItem>
                                    <SelectItem value="intermediate">Intermediate</SelectItem>
                                    <SelectItem value="advanced">Advanced</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Tone</Label>
                            <Select
                                value={formData.tone}
                                onValueChange={(val: any) => handleChange('tone', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select tone" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="friendly">Friendly</SelectItem>
                                    <SelectItem value="spartan">Spartan (Strict)</SelectItem>
                                    <SelectItem value="business">Business</SelectItem>
                                    <SelectItem value="kind">Kind / Gentle</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="quotes">Motivation Quotes (Optional)</Label>
                        <Textarea
                            id="quotes"
                            placeholder="Write quotes that motivate you, separated by newlines."
                            value={formData.motivationQuotes}
                            onChange={(e) => handleChange('motivationQuotes', e.target.value)}
                        />
                    </div>
                </CardContent>
                <Card className="mb-8 border-2 border-indigo-100 dark:border-indigo-900">
                    <CardHeader>
                        <CardTitle>API Configuration (Crucial)</CardTitle>
                        <CardDescription>
                            Set your own Google Gemini API Key to enable AI features.
                            <br />
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                Get your free API Key here
                            </a>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="apiKey">Google Gemini API Key</Label>
                            <Input
                                id="apiKey"
                                type="password"
                                placeholder="AIzaSy..."
                                value={formData.apiKey || ''}
                                onChange={(e) => handleChange('apiKey', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Your key is stored only in your browser (LocalStorage).</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button onClick={handleSave} size="lg">Save Profile</Button>
                </div>
        </div>
    );
}
