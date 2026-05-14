import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { GlassCard } from "./GlassCard";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  numericValue?: number;
  formatter?: (n: number) => string;
  subValue?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; label: string };
  delay?: number;
}

function AnimatedNumber({
  target,
  formatter,
}: {
  target: number;
  formatter: (n: number) => string;
}) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, formatter);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      motionVal.set(target);
    }
  }, [target, motionVal]);

  return <motion.span>{display}</motion.span>;
}

export function StatCard({
  label,
  value,
  numericValue,
  formatter,
  subValue,
  icon: Icon,
  iconColor = "#6366f1",
  trend,
  delay = 0,
}: StatCardProps) {
  const canAnimate = numericValue !== undefined && formatter !== undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <GlassCard hover glow className="relative overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${iconColor}66, transparent)`,
          }}
        />

        <div className="flex items-start justify-between">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: `${iconColor}18`,
              border: `1px solid ${iconColor}30`,
            }}
          >
            <Icon size={18} style={{ color: iconColor }} />
          </div>
          {trend && (
            <span
              className={`text-xs font-medium ${trend.value >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          )}
        </div>

        <div className="mt-4">
          <div className="text-3xl font-bold tracking-tight text-white">
            {canAnimate ? (
              <AnimatedNumber target={numericValue} formatter={formatter} />
            ) : (
              value
            )}
          </div>
          <div className="mt-1 text-sm text-white/50">{label}</div>
          {subValue && (
            <div className="mt-0.5 text-xs text-white/30">{subValue}</div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
