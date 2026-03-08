'use client';

import React from 'react';
import { Brain, Loader2 } from 'lucide-react';

interface AIThinkingBannerProps {
    aiThinking: { assetId: string; message: string } | null;
}

export default function AIThinkingBanner({ aiThinking }: AIThinkingBannerProps) {
    if (!aiThinking) return null;

    return (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-purple-950/90 border border-purple-500/40 shadow-2xl shadow-purple-500/20 backdrop-blur-lg">
                <div className="relative flex items-center justify-center w-8 h-8">
                    <Brain size={18} className="text-purple-400" />
                    <Loader2 size={28} className="absolute text-purple-500/50 animate-spin" />
                </div>
                <div>
                    <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                        Groq AI Analyzing
                    </div>
                    <div className="text-xs text-purple-200 max-w-md">
                        {aiThinking.message}
                    </div>
                </div>
            </div>
        </div>
    );
}
