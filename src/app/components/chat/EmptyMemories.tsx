/**
 * EmptyMemories - When ZAKI hasn't learned anything yet
 *
 * Personality: Curious, eager to learn, personal
 */

import { Brain, MessageCircle, Heart, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/app/components/ui/zaki";

interface EmptyMemoriesProps {
  userName?: string;
  memoryCount?: number;
  className?: string;
}

export function EmptyMemories({
  userName = "you",
  memoryCount = 0,
  className,
}: EmptyMemoriesProps) {
  const learningExamples = [
    { icon: Heart, label: "What you care about", color: "text-rose-500" },
    { icon: Target, label: "Your goals", color: "text-amber-500" },
    { icon: Brain, label: "How you think", color: "text-violet-500" },
  ];

  const helper =
    memoryCount === 0
      ? "Every conversation we have helps me understand you better. Share your thoughts, goals, or just chat."
      : `I've remembered ${memoryCount} things so far. The more we talk, the better I can help you.`;

  return (
    <div className={cn("flex flex-col items-center justify-center h-full px-6 py-12", className)}>
      <EmptyState
        icon={<Brain className="size-5" />}
        title={`I'm eager to learn about ${userName}`}
        helper={helper}
        action={
          <div className="w-full max-w-xs bg-zaki-elevated/50 rounded-2xl p-5">
            <p className="zaki-meta mb-3 text-center">
              What I learn from our chats
            </p>
            <div className="space-y-3">
              {learningExamples.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm",
                      item.color
                    )}
                  >
                    <item.icon className="size-4" />
                  </div>
                  <span className="text-sm text-zaki-secondary">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        }
      />
      <div className="mt-6 flex items-center gap-2 text-sm text-zaki-muted">
        <MessageCircle className="size-4" />
        <span>Try: "I want to learn Spanish" or "I'm working on a startup"</span>
      </div>
    </div>
  );
}
