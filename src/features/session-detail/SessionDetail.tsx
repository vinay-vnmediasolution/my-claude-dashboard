import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Terminal,
  FileText,
  Edit3,
  Cpu,
  Globe,
  Bot,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { useSessionDetail } from "@/api/hooks/useSessionDetail";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ModelBadge } from "@/components/shared/ModelBadge";
import { GlassCard } from "@/components/shared/GlassCard";
import {
  formatCost,
  formatDate,
  formatDuration,
  formatTokens,
  truncate,
} from "@/lib/formatters";
import { TOOL_CATEGORIES, TOOL_CATEGORY_COLORS } from "@/lib/constants";
import type { ParsedMessage, SessionData } from "@/api/hooks/types";

const TOOL_ICONS: Record<string, typeof Terminal> = {
  Bash: Terminal,
  Read: FileText,
  Write: FileText,
  Edit: Edit3,
  Agent: Bot,
  WebFetch: Globe,
  WebSearch: Globe,
  Skill: Cpu,
};

function ToolChip({ name }: { name: string }) {
  const cat = TOOL_CATEGORIES[name] ?? "default";
  const color = TOOL_CATEGORY_COLORS[cat] ?? TOOL_CATEGORY_COLORS.default;
  const Icon = TOOL_ICONS[name] ?? Cpu;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      <Icon size={9} />
      {name}
    </span>
  );
}

function UserMessage({ msg }: { msg: ParsedMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-tr-md bg-indigo-500/15 border border-indigo-500/20 px-4 py-3">
        <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap break-words">
          {msg.userText ?? "(empty)"}
        </p>
        <div className="mt-1.5 flex items-center gap-2 justify-end">
          <span className="text-[10px] text-white/30">
            {new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({
  msg,
  maxCost,
}: {
  msg: ParsedMessage;
  maxCost: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = msg.textContent ?? "";
  const isLong = text.length > 300;
  const costPct = maxCost > 0 ? ((msg.cost ?? 0) / maxCost) * 100 : 0;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] w-full">
        <GlassCard className="p-4 !rounded-2xl !rounded-tl-md">
          {/* Model badge */}
          <div className="flex items-center gap-2 mb-3">
            {msg.model && <ModelBadge model={msg.model} />}
            {msg.hasThinking && (
              <span className="text-[10px] text-violet-400/70 border border-violet-400/20 rounded-full px-2 py-0.5">
                thinking
              </span>
            )}
            <span className="text-[10px] text-white/25 ml-auto">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Text */}
          {text && (
            <div>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap break-words">
                {isLong && !expanded ? `${text.slice(0, 300)}…` : text}
              </p>
              {isLong && (
                <button
                  onClick={() => setExpanded((e) => !e)}
                  className="mt-2 flex items-center gap-1 text-[11px] text-indigo-400/70 hover:text-indigo-400 transition-colors"
                >
                  {expanded ? (
                    <>
                      <ChevronUp size={11} /> Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown size={11} /> Show more
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Tool calls */}
          {msg.tools && msg.tools.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {msg.tools.map((t, i) => (
                <ToolChip key={i} name={t.name} />
              ))}
            </div>
          )}

          {/* Token spend bar */}
          {msg.usage && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-white/25">
                <span>
                  {formatTokens(
                    msg.usage.input_tokens +
                      msg.usage.cache_creation_input_tokens,
                  )}{" "}
                  in · {formatTokens(msg.usage.output_tokens)} out
                  {msg.usage.cache_read_input_tokens > 0 &&
                    ` · ${formatTokens(msg.usage.cache_read_input_tokens)} cached`}
                </span>
                <span className="text-white/40 font-medium">
                  {formatCost(msg.cost ?? 0)}
                </span>
              </div>
              {maxCost > 0 && (
                <div className="h-0.5 rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    style={{ width: `${Math.max(costPct, 1)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function MetaPanel({ session }: { session: SessionData }) {
  const topTools = Object.entries(session.toolUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className="space-y-4 sticky top-6">
      <GlassCard className="p-4">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
          Session Info
        </h3>
        <div className="space-y-2 text-xs">
          <Row label="Project" value={session.projectName} />
          <Row
            label="Duration"
            value={formatDuration(session.durationMinutes)}
          />
          <Row
            label="Started"
            value={formatDate(session.startTime, "MMM d, h:mm a")}
          />
          {session.gitBranches[0] && (
            <Row
              label="Branch"
              value={truncate(session.gitBranches[0], 25)}
              mono
            />
          )}
          {session.entrypoints[0] && (
            <Row label="Via" value={session.entrypoints[0]} />
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
          Token Usage
        </h3>
        <div className="space-y-2 text-xs">
          <Row label="Input" value={formatTokens(session.totalInputTokens)} />
          <Row label="Output" value={formatTokens(session.totalOutputTokens)} />
          <Row
            label="Cache write"
            value={formatTokens(session.totalCacheCreateTokens)}
          />
          <Row
            label="Cache read"
            value={formatTokens(session.totalCacheReadTokens)}
          />
          <div className="border-t border-white/[0.06] pt-2 mt-2">
            <Row
              label="Total cost"
              value={formatCost(session.estimatedCost)}
              highlight
            />
          </div>
        </div>
      </GlassCard>

      {topTools.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
            Tools Used
          </h3>
          <div className="space-y-2">
            {topTools.map(([tool, count]) => (
              <div key={tool} className="flex items-center justify-between">
                <ToolChip name={tool} />
                <span className="text-xs text-white/35">{count}×</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {session.skills.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
            Skills / Features
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {session.skills.map((s) => (
              <span
                key={s}
                className="text-[10px] rounded-full px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20"
              >
                {s}
              </span>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-white/35">{label}</span>
      <span
        className={`${mono ? "font-mono text-[10px]" : ""} ${highlight ? "text-white/80 font-semibold" : "text-white/60"} truncate max-w-[140px] text-right`}
      >
        {value}
      </span>
    </div>
  );
}

export function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useSessionDetail(sessionId);

  if (isLoading) return <PageLoader />;
  if (!data) return <div className="p-8 text-white/40">Session not found</div>;

  const { session, messages } = data;
  const title =
    session.aiTitle ??
    (session.firstUserMessage
      ? truncate(session.firstUserMessage, 80)
      : "Session detail");
  const maxCost = Math.max(
    ...messages.filter((m) => m.type === "assistant").map((m) => m.cost ?? 0),
    0.001,
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <button
        onClick={() => navigate("/sessions")}
        className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back to sessions
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
        <div className="flex items-center gap-3 mt-2">
          {session.models[0] && <ModelBadge model={session.models[0]} />}
          <span className="text-xs text-white/35">
            {session.userMessageCount} messages ·{" "}
            {formatCost(session.estimatedCost)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Conversation */}
        <div className="space-y-4 min-w-0">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.uuid}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.4) }}
            >
              {msg.type === "user" ? (
                <UserMessage msg={msg} />
              ) : (
                <AssistantMessage msg={msg} maxCost={maxCost} />
              )}
            </motion.div>
          ))}
        </div>

        {/* Meta panel */}
        <MetaPanel session={session} />
      </div>
    </div>
  );
}
