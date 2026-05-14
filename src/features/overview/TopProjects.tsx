import { GlassCard } from "@/components/shared/GlassCard";
import { formatCost } from "@/lib/formatters";
import type { ProjectSummary } from "@/api/hooks/types";

interface TopProjectsProps {
  data: ProjectSummary[];
}

export function TopProjects({ data }: TopProjectsProps) {
  const max = Math.max(...data.map((p) => p.cost), 1);

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-white mb-4">Top Projects</h3>
      <div className="space-y-3">
        {data.slice(0, 6).map((project, i) => (
          <div key={project.path} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-white/25 font-mono w-4 shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-white/80 truncate font-medium">
                  {project.name}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-xs text-white/40">
                  {project.sessions}s
                </span>
                <span className="text-xs font-medium text-white/70">
                  {formatCost(project.cost)}
                </span>
              </div>
            </div>
            <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                style={{ width: `${(project.cost / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
