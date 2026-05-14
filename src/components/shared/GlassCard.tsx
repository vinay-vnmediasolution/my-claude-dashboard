import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export function GlassCard({
  children,
  className,
  hover = false,
  glow = false,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      className={clsx(
        "rounded-2xl border p-6",
        "bg-white/[0.03] border-white/[0.08]",
        "backdrop-blur-xl",
        glow && "shadow-[0_0_40px_rgba(99,102,241,0.08)]",
        className,
      )}
      whileHover={
        hover
          ? {
              scale: 1.005,
              borderColor: "rgba(99,102,241,0.35)",
              transition: { duration: 0.15 },
            }
          : undefined
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}
