import { create } from "zustand";
import { subDays } from "date-fns";

interface DateRange {
  from: Date;
  to: Date;
}

interface UIStore {
  sidebarCollapsed: boolean;
  dateRange: DateRange;
  selectedModel: string | null;
  selectedProject: string | null;
  toggleSidebar: () => void;
  setDateRange: (range: DateRange) => void;
  setSelectedModel: (model: string | null) => void;
  setSelectedProject: (project: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  dateRange: { from: subDays(new Date(), 30), to: new Date() },
  selectedModel: null,
  selectedProject: null,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setDateRange: (range) => set({ dateRange: range }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setSelectedProject: (project) => set({ selectedProject: project }),
}));
