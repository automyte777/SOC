/**
 * Skeleton loaders for each dashboard section.
 * Pulse-animated placeholder elements shown while data is loading.
 * Matches the real layout structure to avoid layout shifts.
 */
import React from 'react';

// Shared shimmer wrapper
const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
);

// ── Stats grid skeleton ──────────────────────────────────────────────────────
export function StatsGridSkeleton({ count = 5 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-8 w-20" />
          <Shimmer className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

// ── Chart card skeleton ───────────────────────────────────────────────────────
export function ChartSkeleton() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Shimmer className="h-5 w-36" />
          <Shimmer className="h-3 w-52" />
        </div>
        <Shimmer className="h-9 w-9 rounded-lg" />
      </div>
      {/* Fake bar chart */}
      <div className="h-[300px] flex items-end gap-3 px-4">
        {[60, 85, 45, 75, 90, 55, 70].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <div
              className="animate-pulse bg-slate-200 rounded-t-lg"
              style={{ height: `${h}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Maintenance stats skeleton ────────────────────────────────────────────────
export function MaintenanceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <Shimmer className="h-5 w-32" />
          <div className="flex gap-3">
            <Shimmer className="h-8 w-32 rounded-xl" />
            <Shimmer className="h-8 w-24 rounded-xl" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Shimmer className="h-5 flex-1" />
              <Shimmer className="h-5 flex-1" />
              <Shimmer className="h-5 w-20" />
              <Shimmer className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Activity table skeleton ───────────────────────────────────────────────────
export function ActivitySkeleton({ rows = 5 }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <Shimmer className="h-5 w-32" />
        <Shimmer className="h-4 w-16" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Shimmer className="h-8 w-8 flex-shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Shimmer className="h-3 w-40" />
              <Shimmer className="h-3 w-24" />
            </div>
            <Shimmer className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Full-page initial skeleton ────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-7 w-48" />
          <Shimmer className="h-4 w-72" />
        </div>
        <Shimmer className="h-10 w-36 rounded-xl" />
      </div>

      {/* Maintenance stats */}
      <MaintenanceSkeleton />

      {/* Stats grid */}
      <StatsGridSkeleton />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Activity */}
      <ActivitySkeleton />
    </div>
  );
}
