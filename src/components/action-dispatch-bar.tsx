import { useState, useMemo } from "react";
import {
  ShoppingBag,
  Calendar as CalendarIcon,
  CheckCircle2,
  DollarSign,
  FileText,
  Flame,
  Plane,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalAddModal, ModalTab } from "./universal-add-modal";
import { extractShoppingItems } from "@/lib/item-extractor";

interface ActionDispatchBarProps {
  text: string;
  sourceTitle?: string;
  contextType?: "shopping" | "health" | "assistant" | "travel" | "study" | "tasks" | "goals" | "habits" | "expenses" | "general";
  onUpdated?: () => void;
  compact?: boolean;
  className?: string;
  showShopping?: boolean;
  showCalendar?: boolean;
  showTasks?: boolean;
  showExpense?: boolean;
  showNote?: boolean;
  showHabit?: boolean;
  showTrip?: boolean;
  showCourse?: boolean;
}

export function ActionDispatchBar({
  text,
  sourceTitle,
  contextType = "general",
  onUpdated,
  compact = false,
  className = "",
  showShopping = true,
  showCalendar = true,
  showTasks = true,
  showExpense = true,
  showNote = true,
  showHabit = false,
  showTrip,
  showCourse,
}: ActionDispatchBarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const shouldShowTrip = showTrip !== undefined ? showTrip : (contextType === "travel");
  const shouldShowCourse = showCourse !== undefined ? showCourse : (contextType === "study");

  const initialTab: ModalTab = (
    contextType === "travel" ? "travel" :
    contextType === "study" ? "study" :
    contextType === "shopping" ? "shopping" :
    contextType === "health" ? "calendar" :
    "shopping"
  );

  const [modalTab, setModalTab] = useState<ModalTab>(initialTab);

  // Calculate parsed shopping items count for badge
  const shoppingItemsCount = useMemo(() => {
    if (!text) return 0;
    return extractShoppingItems(text).length;
  }, [text]);

  const openTab = (tab: ModalTab) => {
    setModalTab(tab);
    setIsModalOpen(true);
  };

  if (!text) return null;

  return (
    <>
      <div
        className={`flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40 ${
          compact ? "text-[10px]" : "text-xs"
        } ${className}`}
      >
        <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" /> Sync to:
        </span>

        {/* 1. Travel Trip Action */}
        {shouldShowTrip && (
          <Button
            size="sm"
            variant="outline"
            className={`rounded-full px-2.5 cursor-pointer bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border-blue-500/40 transition-all font-semibold ${
              compact ? "h-6 text-[10px]" : "h-7 text-xs"
            }`}
            onClick={() => openTab("travel")}
            title="Add itinerary directly as a trip card in Travel page"
          >
            <Plane className="mr-1 h-3 w-3 text-blue-400 shrink-0" />
            <span>Add to Travel Trips</span>
          </Button>
        )}

        {/* 2. Study Course Action */}
        {shouldShowCourse && (
          <Button
            size="sm"
            variant="outline"
            className={`rounded-full px-2.5 cursor-pointer bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border-indigo-500/40 transition-all font-semibold ${
              compact ? "h-6 text-[10px]" : "h-7 text-xs"
            }`}
            onClick={() => openTab("study")}
            title="Add course directly to Study Hub"
          >
            <GraduationCap className="mr-1 h-3 w-3 text-indigo-400 shrink-0" />
            <span>Add to Study Hub</span>
          </Button>
        )}

        {/* 3. Shopping List Action */}
        {showShopping && (
          <Button
            size="sm"
            variant="outline"
            className={`rounded-full px-2.5 cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/30 transition-all font-medium ${
              compact ? "h-6 text-[10px]" : "h-7 text-xs"
            }`}
            onClick={() => openTab("shopping")}
            title="Extract and add items directly to Shopping List"
          >
            <ShoppingBag className="mr-1 h-3 w-3 text-emerald-500 shrink-0" />
            <span>Shopping List</span>
            {shoppingItemsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold text-[9px]">
                {shoppingItemsCount}
              </span>
            )}
          </Button>
        )}

        {/* 4. Calendar & Fix Time Action */}
        {showCalendar && (
          <Button
            size="sm"
            variant="outline"
            className={`rounded-full px-2.5 cursor-pointer bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30 transition-all font-medium ${
              compact ? "h-6 text-[10px]" : "h-7 text-xs"
            }`}
            onClick={() => openTab("calendar")}
            title="Schedule in Calendar and pick/fix exact time"
          >
            <CalendarIcon className="mr-1 h-3 w-3 text-blue-400 shrink-0" />
            <span>Add to Calendar & Fix Time</span>
          </Button>
        )}

        {/* 5. Tasks Action */}
        {showTasks && (
          <Button
            size="sm"
            variant="outline"
            className={`rounded-full px-2.5 cursor-pointer bg-background/70 hover:bg-background border-border/60 transition-all ${
              compact ? "h-6 text-[10px]" : "h-7 text-xs"
            }`}
            onClick={() => openTab("tasks")}
          >
            <CheckCircle2 className="mr-1 h-3 w-3 text-amber-500 shrink-0" />
            <span>Tasks</span>
          </Button>
        )}

        {/* 6. Expenses Action */}
        {showExpense && (
          <Button
            size="sm"
            variant="outline"
            className={`rounded-full px-2.5 cursor-pointer bg-background/70 hover:bg-background border-border/60 transition-all ${
              compact ? "h-6 text-[10px]" : "h-7 text-xs"
            }`}
            onClick={() => openTab("expenses")}
            title="Log planned budget or cost"
          >
            <DollarSign className="mr-1 h-3 w-3 text-emerald-400 shrink-0" />
            <span>Expense</span>
          </Button>
        )}

        {/* 7. Notes Action */}
        {showNote && (
          <Button
            size="sm"
            variant="outline"
            className={`rounded-full px-2.5 cursor-pointer bg-background/70 hover:bg-background border-border/60 transition-all ${
              compact ? "h-6 text-[10px]" : "h-7 text-xs"
            }`}
            onClick={() => openTab("notes")}
          >
            <FileText className="mr-1 h-3 w-3 text-purple-400 shrink-0" />
            <span>Note</span>
          </Button>
        )}

        {/* 8. Habits Action (optional) */}
        {showHabit && (
          <Button
            size="sm"
            variant="outline"
            className={`rounded-full px-2.5 cursor-pointer bg-background/70 hover:bg-background border-border/60 transition-all ${
              compact ? "h-6 text-[10px]" : "h-7 text-xs"
            }`}
            onClick={() => openTab("habits")}
          >
            <Flame className="mr-1 h-3 w-3 text-rose-500 shrink-0" />
            <span>Habit</span>
          </Button>
        )}
      </div>

      <UniversalAddModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultTab={modalTab}
        textContext={text}
        contextType={contextType}
        defaultTitle={sourceTitle}
        onSuccess={onUpdated}
      />
    </>
  );
}
