import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { ShoppingBag, Plus, Trash, X, Sparkles, Calendar, Clock, DollarSign, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getShoppingList, addShoppingItem, updateShoppingItem, deleteShoppingItem, ShoppingItem } from "@/lib/db";
import { generateMealPlanAI } from "@/lib/gemini";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGateModal } from "@/components/premium-gate-modal";
import { toast } from "sonner";
import { ActionDispatchBar } from "@/components/action-dispatch-bar";
import { UniversalAddModal } from "@/components/universal-add-modal";

export const Route = createFileRoute("/app/shopping")({ component: ShoppingPage });

function ShoppingPage() {
  const { user: authUser } = useAuth();
  const { isPremium, refreshProfile } = usePremium();
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  // AI Meal & Grocery State
  const [aiMealPlan, setAiMealPlan] = useState<string | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Modal form states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("");

  // Fix Time Calendar Scheduler modal state
  const [isFixTimeModalOpen, setIsFixTimeModalOpen] = useState(false);
  const [selectedItemForCalendar, setSelectedItemForCalendar] = useState<ShoppingItem | null>(null);

  const fetchItems = async () => {
    if (!authUser) return;
    try {
      const list = await getShoppingList(authUser.uid);
      setShoppingItems(list);
    } catch (err) {
      console.error("Failed to load shopping list", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [authUser]);

  const handleToggleItem = async (item: ShoppingItem) => {
    if (!authUser) return;
    const updatedDone = !item.done;

    // Optimistic update
    setShoppingItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, done: updatedDone } : i))
    );
    try {
      await updateShoppingItem(authUser.uid, item.id, { done: updatedDone });
    } catch (err) {
      console.error("Failed to update item state", err);
      fetchItems();
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !itemName.trim()) return;

    try {
      await addShoppingItem(authUser.uid, {
        item: itemName,
        qty: itemQty || "1",
        done: false,
      });
      setItemName("");
      setItemQty("");
      setIsAddOpen(false);
      fetchItems();
      toast.success(`Added "${itemName}" to Shopping List`);
    } catch (err) {
      console.error("Failed to add shopping item", err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!authUser) return;
    try {
      await deleteShoppingItem(authUser.uid, id);
      fetchItems();
    } catch (err) {
      console.error("Failed to delete shopping item", err);
    }
  };

  const handleScheduleItemTrip = (item: ShoppingItem) => {
    setSelectedItemForCalendar(item);
    setIsFixTimeModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing shopping list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl relative pb-12">
      <PageHeader
        title="Shopping List"
        description="Smart lists, AI meal & grocery planner, and instant calendar scheduling."
        icon={<ShoppingBag className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedItemForCalendar(null);
                setIsFixTimeModalOpen(true);
              }}
              className="rounded-full cursor-pointer text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30"
              title="Fix time in Calendar for grocery shopping"
            >
              <Calendar className="mr-1.5 h-3.5 w-3.5" /> Fix Shopping Time
            </Button>
            <Button
              disabled={isAiGenerating}
              onClick={async () => {
                if (!isPremium) {
                  setPremiumModalOpen(true);
                  return;
                }
                const diet = prompt("Enter dietary preference or meal request (e.g. High Protein, Mediterranean, Vegan, Keto, Balanced):", "High Protein Balanced");
                if (!diet) return;
                setIsAiGenerating(true);
                try {
                  const res = await generateMealPlanAI(diet);
                  setAiMealPlan(res);
                  toast.success(`AI Meal & Grocery Plan generated for "${diet}"!`);
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to generate meal plan.");
                } finally {
                  setIsAiGenerating(false);
                }
              }}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md text-xs"
            >
              <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${isAiGenerating ? "animate-spin" : ""}`} />
              {isAiGenerating ? "Generating..." : "AI Meal & Grocery Planner"}
            </Button>
            <Button className="rounded-full bg-gradient-primary cursor-pointer text-xs" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add item
            </Button>
          </div>
        }
      />

      {/* AI Meal Plan Result Box with Rich Concern Dispatch */}
      {aiMealPlan && (
        <div className="mb-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-xl relative animate-in fade-in-0 duration-300">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">AI Meal Prep & Categorized Grocery Plan</h3>
                <p className="text-[11px] text-muted-foreground">Select and sync items directly into your Shopping List or lock in Calendar shopping time.</p>
              </div>
            </div>
            <button
              onClick={() => setAiMealPlan(null)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground bg-background/60 p-4 rounded-2xl border border-white/10 max-h-96 overflow-y-auto scrollbar-thin">
            {aiMealPlan}
          </div>

          {/* Action Dispatch Toolbar */}
          <div className="mt-3">
            <ActionDispatchBar
              text={aiMealPlan}
              sourceTitle="AI Meal Prep & Grocery Plan"
              contextType="shopping"
              onUpdated={fetchItems}
              showHabit={true}
              showShopping={true}
              showCalendar={true}
              showTasks={true}
              showExpense={true}
              showNote={true}
            />
          </div>
        </div>
      )}

      {/* Shopping List Card */}
      <div className="glass rounded-3xl p-6 shadow-md border border-white/5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>My Shopping List</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
                {shoppingItems.filter((i) => !i.done).length} pending
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">Check off items or click the calendar icon to schedule a shopping run.</p>
          </div>
          {shoppingItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedItemForCalendar(null);
                setIsFixTimeModalOpen(true);
              }}
              className="rounded-full text-xs h-7 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30 cursor-pointer"
            >
              <Calendar className="mr-1 h-3 w-3" /> Schedule Shopping Run
            </Button>
          )}
        </div>

        {shoppingItems.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-muted/40 mx-auto grid place-items-center text-muted-foreground">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <p className="font-medium text-foreground">Your shopping list is empty.</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add individual items manually or use the AI Meal & Grocery Generator above to create and import a complete meal plan checklist!
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button size="sm" onClick={() => setIsAddOpen(true)} className="rounded-full cursor-pointer text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add item
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {shoppingItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 py-3 group hover:bg-muted/30 px-3 rounded-2xl transition-all"
              >
                <Checkbox
                  checked={item.done}
                  onCheckedChange={() => handleToggleItem(item)}
                  className="cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={
                      "text-sm truncate " +
                      (item.done ? "line-through text-muted-foreground" : "font-semibold text-foreground")
                    }
                  >
                    {item.item}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.qty}</p>
                </div>

                {/* Quick Action Buttons for each item */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleScheduleItemTrip(item)}
                    title={`Schedule shopping for ${item.item} in Calendar`}
                    className="text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 p-1.5 rounded-full transition-colors cursor-pointer"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    title="Delete item"
                    className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-full transition-colors cursor-pointer"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* New Shopping Item modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl relative border border-white/10 animate-in fade-in-0 zoom-in-95 duration-200">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <ShoppingBag className="h-5 w-5 text-emerald-400" /> Add Shopping Item
            </h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Item Name</label>
                <Input
                  required
                  placeholder="e.g. Sourdough bread, Chicken breast, Avocados"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Quantity / Notes</label>
                <Input
                  placeholder="e.g. 500g, 2 packs, 1 bottle"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-full cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                  Add to List
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fix Time Calendar Scheduler Modal */}
      <UniversalAddModal
        isOpen={isFixTimeModalOpen}
        onClose={() => setIsFixTimeModalOpen(false)}
        defaultTab="calendar"
        contextType="shopping"
        defaultTitle={
          selectedItemForCalendar
            ? `Buy ${selectedItemForCalendar.item} (${selectedItemForCalendar.qty})`
            : "Weekly Grocery Shopping & Meal Prep"
        }
        textContext={
          selectedItemForCalendar
            ? `Buy ${selectedItemForCalendar.item} (${selectedItemForCalendar.qty})`
            : shoppingItems.map((i) => `- ${i.item} (${i.qty})`).join("\n")
        }
      />

      {/* Premium Gate Modal */}
      <PremiumGateModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        featureName="AI Meal & Grocery Planner"
        onUpgraded={() => {
          refreshProfile();
          fetchItems();
        }}
      />
    </div>
  );
}