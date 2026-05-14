import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  List,
  BarChart3,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Activity,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/sessions", label: "Sessions", icon: List },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/insights", label: "Insights", icon: Lightbulb },
];

function HealthDot() {
  const [status, setStatus] = useState<"ok" | "error" | "loading">("loading");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? setStatus("ok") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <span className="relative flex h-2 w-2">
      {status === "ok" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      )}
      <span
        className={clsx("relative inline-flex h-2 w-2 rounded-full", {
          "bg-emerald-500": status === "ok",
          "bg-red-500": status === "error",
          "bg-white/30": status === "loading",
        })}
      />
    </span>
  );
}

function Clock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return <span className="text-xs text-white/30 font-mono">{time}</span>;
}

export function Shell() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const handleCacheInvalidate = async () => {
    await fetch("/api/cache/invalidate", { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#050507]">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="relative flex shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.015]"
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-4 border-b border-white/[0.06]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/30">
            <Activity size={16} className="text-indigo-400" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="ml-3 overflow-hidden"
              >
                <div className="text-sm font-semibold text-white leading-tight">
                  Claude
                </div>
                <div className="text-xs text-white/40 leading-tight">
                  Dashboard
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
                  isActive
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                    : "text-white/50 hover:bg-white/[0.05] hover:text-white/80",
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="font-medium"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="px-2 pb-4 space-y-1 border-t border-white/[0.06] pt-3">
          <button
            onClick={handleCacheInvalidate}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/30 hover:bg-white/[0.05] hover:text-white/60 transition-all"
            title="Refresh data"
          >
            <RefreshCw size={16} className="shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  Refresh data
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-[72px] flex h-6 w-6 items-center justify-center rounded-full bg-[#0f0f18] border border-white/10 text-white/40 hover:text-white/80 transition-colors z-10"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </motion.aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
          <div className="text-sm font-medium text-white/70 capitalize">
            {location.pathname.replace("/", "") || "overview"}
          </div>
          <div className="flex items-center gap-3">
            <Clock />
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <HealthDot />
              <AnimatePresence>
                {!collapsed && <span>live</span>}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content with route transition */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
