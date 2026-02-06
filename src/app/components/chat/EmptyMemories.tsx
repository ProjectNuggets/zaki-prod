/**
 * EmptyMemories - When ZAKI hasn't learned anything yet
 * 
 * Personality: Curious, eager to learn, personal
 */

import { Brain, MessageCircle, Heart, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyMemoriesProps {
  userName?: string;
  memoryCount?: number;
  className?: string;
}

export function EmptyMemories({ 
  userName = "you", 
  memoryCount = 0,
  className 
}: EmptyMemoriesProps) {
  const learningExamples = [
    { icon: Heart, label: "What you care about", color: "text-rose-500" },
    { icon: Target, label: "Your goals", color: "text-amber-500" },
    { icon: Brain, label: "How you think", color: "text-violet-500" },
  ];

  return (
    <div className={cn("flex flex-col items-center justify-center h-full px-6 py-12", className)}>
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-200 via-rose-200 to-amber-200 rounded-full blur-2xl opacity-60 animate-pulse" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 via-rose-50 to-amber-50 border border-white/50 flex items-center justify-center shadow-lg">
          <div className="text-4xl">🧠</div>
        </div>
        {/* Floating elements */}
        <div className="absolute -top-3 -right-4 text-2xl animate-bounce" style={{ animationDuration: '3s' }}>
          💭
        </div>
        <div className="absolute -bottom-2 -left-4 text-xl animate-pulse">
          ✨
        </div>
      </div>

      {/* Personalized greeting */}
      <h2 className="text-xl font-semibold text-zaki-primary mb-2 text-center">
        I'm eager to learn about {userName}
      </h2>

      {/* Context-aware message */}
      <p className="text-zaki-muted text-center max-w-xs mb-6 leading-relaxed text-sm">
        {memoryCount === 0 ? (
          "Every conversation we have helps me understand you better. Share your thoughts, goals, or just chat!"
        ) : (
          `I've remembered ${memoryCount} things so far. The more we talk, the better I can help you.`
        )}
      </p>

      {/* What I'll learn */}
      <div className="w-full max-w-xs bg-zaki-elevated/50 rounded-2xl p-5 mb-6">
        <p className="text-xs font-medium text-zaki-muted uppercase tracking-wide mb-3 text-center">
          What I learn from our chats
        </p>
        <div className="space-y-3">
          {learningExamples.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm", item.color)}>
                <item.icon className="size-4" />
              </div>
              <span className="text-sm text-zaki-secondary">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation starter */}
      <div className="flex items-center gap-2 text-sm text-zaki-muted">
        <MessageCircle className="size-4" />
        <span>Try: "I want to learn Spanish" or "I'm working on a startup"</span>
      </div>
    </div>
  );
}
