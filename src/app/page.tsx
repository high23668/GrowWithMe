'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UserCircle, BookOpen, Sprout, TreePine, Flower2, Flame, TentTree, Wrench } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function Home() {
  const { growth, checkDailyGrowth, debugSetGrowth } = useStore();

  useEffect(() => {
    checkDailyGrowth();
  }, []);

  const getTreeIcon = () => {
    if (growth.currentStage < 5) return <Sprout className="w-16 h-16 text-green-400 animate-bounce-slow" />;
    if (growth.currentStage < 15) return <TreePine className="w-20 h-20 text-green-500" />;
    if (growth.currentStage < 25) return <TreePine className="w-24 h-24 text-green-600" />;
    return <TreePine className="w-28 h-28 text-emerald-700 drop-shadow-xl" />;
  };

  const getStageName = () => {
    if (growth.currentStage < 5) return "Sprout Phase";
    if (growth.currentStage < 15) return "Sapling Phase";
    if (growth.currentStage < 25) return "Young Tree";
    return "Maturing Tree";
  };

  // Forest calculation: e.g. "Richness" score
  const richness = growth.totalTrees * 100 + growth.currentStage;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      {/* Growth Dashboard */}
      <div className="mb-10 bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background p-6 rounded-3xl shadow-sm border border-green-100 dark:border-green-900 text-center relative overflow-hidden">
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/50 dark:bg-black/20 p-2 rounded-full px-4 backdrop-blur-sm">
          <TentTree className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
          <span className="font-bold text-emerald-900 dark:text-emerald-100">{growth.totalTrees} Trees</span>
          <span className="text-xs text-muted-foreground ml-1">in your forest</span>
        </div>

        <div className="flex flex-col items-center justify-center py-6">
          <div className="relative mb-6">
            {/* Sun glow effect */}
            <div className="absolute inset-0 bg-yellow-200 blur-3xl opacity-20 rounded-full scale-150"></div>
            {getTreeIcon()}
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{getStageName()}</h2>
          <p className="text-muted-foreground mb-6">Day {growth.currentStage} / 30 to Blooming</p>

          <div className="w-full max-w-sm space-y-2">
            <Progress value={(growth.currentStage / 30) * 100} className="h-4 bg-green-100 dark:bg-green-900/30" />
            <p className="text-xs text-right text-muted-foreground">Keep the streak alive!</p>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/profile" className="block transform transition hover:scale-105">
          <Card className="h-full border-2 hover:border-blue-500 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <UserCircle className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle>Profile Setup</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Tell the AI who you are. Define your hobbies, career, and dreams to get personalized content.
              </CardDescription>
              <Button className="mt-4 w-full" variant="secondary">Edit Profile</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/word-list" className="block transform transition hover:scale-105">
          <Card className="h-full border-2 hover:border-green-500 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <BookOpen className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle>Word List (Manage)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Manage your target words. Import vocabulary lists and generate AI sentences.
              </CardDescription>
              <Button className="mt-4 w-full" variant="outline">Manage Words</Button>
            </CardContent>
          </Card>
        </Link>

        {/* Study Mode Card - Spanning 2 cols on md or just distinct */}
        <Link href="/study/vocab" className="block transform transition hover:scale-105 md:col-span-2">
          <Card className="h-full border-2 border-orange-200 hover:border-orange-500 cursor-pointer bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-zinc-900">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <CardTitle className="text-xl">Practice Vocabulary</CardTitle>
                  <CardDescription>Review session</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Jump into a quick Flashcard session. Master your words with spaced repetition actions.
              </p>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">Start Session</Button>
            </CardContent>
          </Card>
        </Link>

        {/* Shadowing Mode Card */}
        <Link href="/shadowing" className="block transform transition hover:scale-105 md:col-span-2">
          <Card className="h-full border-2 border-purple-200 hover:border-purple-500 cursor-pointer bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-zinc-900">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <span className="text-2xl">🎙️</span>
                </div>
                <div>
                  <CardTitle className="text-xl">Shadowing Practice</CardTitle>
                  <CardDescription>Long-form speaking</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Practice speaking with AI-generated stories and dialogues based on your interests.
              </p>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">Go to Shadowing</Button>
            </CardContent>
          </Card>
        </Link>


      </div>

      {/* DEBUG PANEL */}
      <div className="mt-12 p-6 border rounded-xl border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <h3 className="text-sm font-mono font-bold text-muted-foreground mb-4 flex items-center gap-2">
          <Wrench className="h-4 w-4" /> Debug Tools (Simulation)
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => debugSetGrowth(29, growth.totalTrees, 0)}>
            Set Stage 29 (Pre-Bloom)
          </Button>
          <Button size="sm" variant="outline" onClick={() => debugSetGrowth(5, growth.totalTrees, 4)}>
            Simulate 4 Days Inactivity
          </Button>
          <Button size="sm" variant="outline" onClick={() => debugSetGrowth(0, growth.totalTrees + 1, 0)}>
            Add 1 Forest Tree
          </Button>
          <Button size="sm" variant="outline" onClick={() => debugSetGrowth(0, 0, 0)}>
            Reset All
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          * "Simulate Inactivity" sets last activity to 4 days ago. Reload page to trigger decay logic.
        </p>
      </div>

    </div>
  );
}
