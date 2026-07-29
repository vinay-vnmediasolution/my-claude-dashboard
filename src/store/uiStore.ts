import { create } from "zustand";
import { subDays } from "date-fns";

interface DateRange {
  from: Date;
  to: Date;
}

interface UIStore {
  dateRange: DateRange;
  selectedModel: string | null;
  selectedProject: string | null;
  setDateRange: (range: DateRange) => void;
  setSelectedModel: (model: string | null) => void;
  setSelectedProject: (project: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  dateRange: { from: subDays(new Date(), 90), to: new Date() },
  selectedModel: null,
  selectedProject: null,
  setDateRange: (range) => set({ dateRange: range }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setSelectedProject: (project) => set({ selectedProject: project }),
}));
