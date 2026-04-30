import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
  "data-sidebar"?: string;
}

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-zaki-skeleton rounded",
        className
      )}
      style={style}
      {...props}
    />
  );
}

export function SkeletonText({ className, lines = 1 }: SkeletonProps & { lines?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", className)}
          style={{ width: i === lines - 1 && lines > 1 ? "75%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonMessage({ isUser }: { isUser?: boolean }) {
  return (
    <div className={cn("flex gap-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <Skeleton className="size-8 rounded-full shrink-0" />}
      <Skeleton className="h-20 w-[70%] rounded-zaki-lg" />
      {isUser && <div className="size-8 shrink-0" />}
    </div>
  );
}

export function SkeletonThreadList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-zaki-md" />
      ))}
    </div>
  );
}

export function SkeletonSpaceList() {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-1.5">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonMemoryViewer() {
  return (
    <div className="px-6 py-8">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-48 rounded mb-2" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>

      {/* Search bar skeleton */}
      <Skeleton className="h-10 w-full rounded-lg mb-6" />

      {/* Stats row skeleton */}
      <div className="flex gap-4 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-24 rounded-md" />
        ))}
      </div>

      {/* Memory cards skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-zaki-lg bg-zaki-raised">
            <Skeleton className="size-8 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-full rounded mb-2" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonSpaceCard() {
  return (
    <div className="rounded-zaki-lg border border-zaki bg-white p-4 shadow-sm">
      <Skeleton className="h-4 w-3/4 rounded mb-2" />
      <Skeleton className="h-3 w-full rounded" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-6 w-16 rounded" />
        <Skeleton className="h-6 w-16 rounded" />
      </div>
    </div>
  );
}

export function SkeletonSpaceGrid() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonSpaceCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonThreadsList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-full rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonBrainPage() {
  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-48 rounded mb-2" />
      <Skeleton className="h-4 w-72 rounded mb-8" />
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-zaki-lg bg-zaki-raised">
            <Skeleton className="size-8 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-full rounded mb-2" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
