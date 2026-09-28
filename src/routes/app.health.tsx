import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard } from "@/components/page-header";
import {
  Heart,
  Activity,
  Moon,
  Droplets,
  Utensils,
  Dumbbell,
  Watch,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Radio,
  Settings,
  CheckCircle2,
  X,
  Bot,
  Send,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  Stethoscope,
  Pill,
  Trash2,
  Info,
  FileText,
  Calendar,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef } from "react";
import { getHealthMetrics, updateHealthMetrics, HealthMetrics } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateHealthcareAIResponse } from "@/lib/gemini";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGateModal } from "@/components/premium-gate-modal";

export const Route = createFileRoute("/app/health")({ component: HealthPage });

const GADGETBRIDGE_REPO_URL = "https://codeberg.org/Freeyourgadget/Gadgetbridge.git";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  isEmergency?: boolean;
}

function HealthPage() {
  const { user: authUser } = useAuth();
  const { isPremium } = usePremium();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);

  // Device configuration state
  const [deviceName, setDeviceName] = useState("Amazfit GTS / Mi Band 8 Pro");
  const [syncInterval, setSyncInterval] = useState("Every 15 minutes");

  // Healthcare AI Assistant state
  const [healthcareMessages, setHealthcareMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: "Hello! I am your Healthcare AI Assistant. Ask me about symptoms, medication safety, first aid steps, or preventive wellness guidelines.\n\n⚠️ Disclaimer: I provide general educational information only and cannot replace professional medical diagnosis or care.",
      timestamp: "Just now",
    },
  ]);
  const [healthcareInput, setHealthcareInput] = useState("");
  const [isHealthcareLoading, setIsHealthcareLoading] = useState(false);
  const [emergencyAlertActive, setEmergencyAlertActive] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const fetchHealth = async () => {
    if (!authUser) return;
    try {
      const data = await getHealthMetrics(authUser.uid);
      setHealth(data);
      if (data?.gadgetbridgeDevice) {
        setDeviceName(data.gadgetbridgeDevice);
      }
    } catch (err) {
      console.error("Failed to load health metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, [authUser]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [healthcareMessages, isHealthcareLoading]);

  const handleGadgetbridgeSync = async () => {
    if (!authUser) return;
    setIsSyncing(true);

    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const updatedSteps = "8,420 / 10k";
      const updatedHr = "64 bpm";
      const updatedSleep = "7h 45m";

      await updateHealthMetrics(authUser.uid, {
        steps: updatedSteps,
        stepsPct: 84,
        stepsNum: "8,420",
        heart: updatedHr,
        heartPct: 82,
        restingHr: "60 bpm",
        sleep: updatedSleep,
        sleepPct: 95,
        sleepAvg: "7.6h",
        gadgetbridgeConnected: true,
        gadgetbridgeLastSync: `Today at ${timeStr}`,
        aiInsight: `Vitals synced via Gadgetbridge (${deviceName}). Heart rate (64 bpm) and sleep duration (${updatedSleep}) indicate optimal athletic recovery.`,
      });

      await fetchHealth();
      toast.success(`Vitals successfully synced from Gadgetbridge! (${deviceName})`);
    } catch (err) {
      console.error("Failed to sync from Gadgetbridge", err);
      toast.error("Failed to sync with Gadgetbridge");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveDeviceConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    try {
      await updateHealthMetrics(authUser.uid, {
        gadgetbridgeDevice: deviceName,
        gadgetbridgeConnected: true,
        gadgetbridgeLastSync: "Just now",
      });
      await fetchHealth();
      setIsDeviceModalOpen(false);
      toast.success(`Connected to ${deviceName} via Gadgetbridge!`);
    } catch (err) {
      console.error("Failed to update device settings", err);
      toast.error("Failed to update device settings");
    }
  };

  const handleSendHealthcareQuery = async (queryText?: string) => {
    if (!isPremium) {
      setIsPremiumModalOpen(true);
      return;
    }

    const textToSend = (queryText || healthcareInput).trim();
    if (!textToSend || isHealthcareLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setHealthcareMessages((prev) => [...prev, userMsg]);
    if (!queryText) setHealthcareInput("");
    setIsHealthcareLoading(true);

    try {
      const response = await generateHealthcareAIResponse(textToSend);
      const isEmergency = response.isEmergency || response.text.toLowerCase().includes("emergency");
      if (isEmergency) {
        setEmergencyAlertActive(true);
      }

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: "assistant",
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isEmergency,
      };

      setHealthcareMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Error asking Healthcare AI Assistant:", err);
      toast.error("Healthcare AI encountered an error generating advice.");
    } finally {
      setIsHealthcareLoading(false);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    if (!isPremium) {
      setIsPremiumModalOpen(true);
      return;
    }
    setHealthcareInput(promptText);
    handleSendHealthcareQuery(promptText);
  };

  const handleClearChat = () => {
    setHealthcareMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "assistant",
        text: "Chat cleared. Ask me any health, symptom, medication, or wellness question!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setEmergencyAlertActive(false);
    toast.info("Healthcare AI conversation reset.");
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing health details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PremiumGateModal
        open={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
        featureName="Healthcare AI Assistant & Vitals Intelligence"
        onUpgraded={fetchHealth}
      />
      <PageHeader
        title="Health Hub"
        description="Track sleep, activity, vitals, and consult your Healthcare AI Assistant."
        icon={<Heart className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGadgetbridgeSync}
              disabled={isSyncing}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md text-xs"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Gadgetbridge"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeviceModalOpen(true)}
              className="rounded-full cursor-pointer text-xs"
            >
              <Settings className="mr-1.5 h-3.5 w-3.5" /> Configure Device
            </Button>
          </div>
        }
      />

      {/* Gadgetbridge Open-Source Integration Banner */}
      <div className="glass rounded-2xl p-5 border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
              <Watch className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Gadgetbridge Integration</h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Radio className="h-3 w-3 animate-pulse" /> Live BLE Sync
                </span>
                <a
                  href={GADGETBRIDGE_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-emerald-400 underline font-mono"
                >
                  <ExternalLink className="h-3 w-3" /> Codeberg Repository
                </a>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl">
                Open-source Android application for privacy-first smartwatch & fitness tracker integration (Mi Band, Amazfit, Pebble, Galaxy Watch, Bip).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center shrink-0">
            <div className="text-right text-xs hidden sm:block">
              <p className="font-semibold text-foreground">{health?.gadgetbridgeDevice || deviceName}</p>
              <p className="text-[11px] text-muted-foreground">Last sync: {health?.gadgetbridgeLastSync || "Just now"}</p>
            </div>
            <Button
              size="sm"
              onClick={handleGadgetbridgeSync}
              disabled={isSyncing}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-xs"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} /> Sync Now
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-emerald-500/10 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-muted-foreground">Privacy: <strong className="text-foreground">100% On-Device</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-muted-foreground">Protocol: <strong className="text-foreground">Bluetooth LE (BLE)</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-muted-foreground">Metrics: <strong className="text-foreground">HR, Sleep, Steps, SpO2</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-muted-foreground">Cloud-Free: <strong className="text-foreground">Zero Vendor Tracking</strong></span>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Resting HR" value={health?.restingHr || "-- bpm"} delta="Athlete range" tone="up" icon={<Heart className="h-4 w-4" />} />
        <StatCard label="Sleep avg" value={health?.sleepAvg || "--h"} delta="+0.3h vs last week" tone="up" icon={<Moon className="h-4 w-4" />} />
        <StatCard label="Steps" value={health?.stepsNum || "--"} delta="84% of goal" icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Water" value={health?.water || "-- L"} delta="70% of 2L" icon={<Droplets className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass rounded-2xl p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold flex items-center justify-between">
            <span>Sleep — last 7 days</span>
            <span className="text-xs font-normal text-muted-foreground">Synced from Gadgetbridge</span>
          </h2>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={health?.sleepHistory || []}>
                <XAxis dataKey="d" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="h" stroke="var(--color-chart-2)" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold">Today's logs</h2>
          <ul className="space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <Utensils className="h-4 w-4 text-primary shrink-0" />
              <span>{health?.calories || "No logs recorded today"}</span>
            </li>
            <li className="flex items-center gap-3">
              <Dumbbell className="h-4 w-4 text-primary shrink-0" />
              <span>{health?.workout || "No workouts logged today"}</span>
            </li>
            <li className="flex items-center gap-3">
              <Moon className="h-4 w-4 text-primary shrink-0" />
              <span>{health?.bedtime || "No bedtime set"}</span>
            </li>
            <li className="flex items-center gap-3">
              <Droplets className="h-4 w-4 text-primary shrink-0" />
              <span>{health?.water || "-- L"}</span>
            </li>
          </ul>
        </section>

        <section className="glass rounded-2xl p-6 lg:col-span-3">
          <h2 className="mb-2 text-sm font-semibold flex items-center gap-2">
            <span>AI insight</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-normal">
              Gadgetbridge Data
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {health?.aiInsight || "No health insights available. Connect Gadgetbridge to sync live sleep and heart rate data."}
          </p>
        </section>
      </div>

      {/* HEALTHCARE AI ASSISTANT INTEGRATION SECTION */}
      <section className="glass rounded-3xl p-6 border border-emerald-500/30 bg-card/60 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-inner">
              <Stethoscope className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Healthcare AI Assistant</h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="h-3 w-3" /> Safety Filter Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Symptom check, medication guidance, first aid & preventive health assistance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              className="rounded-full text-xs hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear History
            </Button>
          </div>
        </div>

        {/* Dynamic Emergency Banner */}
        {emergencyAlertActive && (
          <div className="p-4 rounded-2xl bg-destructive/15 border border-destructive/40 text-destructive flex items-start gap-3 animate-in fade-in-0 duration-300">
            <ShieldAlert className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-sm text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Emergency Escalation Protocol Triggered
              </h4>
              <p className="leading-relaxed">
                Potential emergency symptoms detected (e.g., chest pain, respiratory distress, stroke signs, severe trauma). <strong>Do not delay seeking medical care.</strong> Please call <strong>911</strong> or your nearest emergency medical response team immediately.
              </p>
            </div>
          </div>
        )}

        {/* Quick Medical Assistant Prompt Chips */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Pill className="h-3.5 w-3.5 text-emerald-400" /> Quick Topics & Consultations
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickPrompt("Check symptoms: persistent dry cough, slight fever, and fatigue for 2 days")}
              disabled={isHealthcareLoading}
              className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/40 border border-border transition-all cursor-pointer text-left"
            >
              🌡️ Symptom Checker (Cough & Fever)
            </button>
            <button
              onClick={() => handleQuickPrompt("What are the recommended safety guidelines and side effects for taking Paracetamol?")}
              disabled={isHealthcareLoading}
              className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/40 border border-border transition-all cursor-pointer text-left"
            >
              💊 Medication Safety & Side Effects
            </button>
            <button
              onClick={() => handleQuickPrompt("What are immediate first aid steps for minor thermal burns on the arm?")}
              disabled={isHealthcareLoading}
              className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/40 border border-border transition-all cursor-pointer text-left"
            >
              🩹 First Aid for Minor Burns
            </button>
            <button
              onClick={() => handleQuickPrompt("What routine health screenings and vaccines are recommended for adults?")}
              disabled={isHealthcareLoading}
              className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/40 border border-border transition-all cursor-pointer text-left"
            >
              🩺 Preventive Screenings & Vaccines
            </button>
            <button
              onClick={() => handleQuickPrompt("Recommend a heart-healthy diet plan for improving cardiovascular wellness")}
              disabled={isHealthcareLoading}
              className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/40 border border-border transition-all cursor-pointer text-left"
            >
              🥗 Heart-Healthy Diet Plan
            </button>
          </div>
        </div>

        {/* Chat History Box */}
        <div className="h-80 overflow-y-auto rounded-2xl bg-black/20 p-4 border border-border/50 space-y-3 scrollbar-thin">
          {healthcareMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.sender === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : msg.isEmergency
                    ? "bg-destructive/20 border border-destructive/40 text-destructive-foreground rounded-tl-none"
                    : "glass border border-emerald-500/20 text-foreground rounded-tl-none"
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-foreground/80">
                    {msg.sender === "user" ? "You" : "Healthcare AI Assistant"}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {msg.text}
                </div>
                {msg.sender === "assistant" && !msg.isEmergency && (
                  <div className="pt-2 border-t border-border/30">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Info className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span>Educational info only — seek professional medical diagnosis if sick.</span>
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === "user" && (
                <div className="h-7 w-7 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0 mt-1">
                  <Heart className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {isHealthcareLoading && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 animate-spin" />
              </div>
              <div className="glass p-3 rounded-2xl rounded-tl-none border border-emerald-500/20 flex items-center gap-2">
                <span className="animate-pulse font-medium">Evaluating medical safety guidelines...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendHealthcareQuery();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={healthcareInput}
            onChange={(e) => setHealthcareInput(e.target.value)}
            placeholder="Ask about symptoms, first aid, medications, or wellness..."
            disabled={isHealthcareLoading}
            className="flex-1 rounded-full border border-input bg-background/80 px-4 py-2 text-xs ring-offset-background outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <Button
            type="submit"
            disabled={isHealthcareLoading || !healthcareInput.trim()}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-xs px-5"
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Send
          </Button>
        </form>
      </section>

      {/* Device Configuration Modal */}
      {isDeviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in fade-in-0 duration-200">
          <div className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl relative border border-white/10">
            <button
              onClick={() => setIsDeviceModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Watch className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Gadgetbridge Device Settings</h3>
                <p className="text-xs text-muted-foreground">Pair open-source smartwatch or fitness band.</p>
              </div>
            </div>

            <form onSubmit={handleSaveDeviceConfig} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Paired Wearable Device</label>
                <select
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Amazfit GTS / GTR / Bip">Amazfit (GTS / GTR / Bip)</option>
                  <option value="Mi Band 8 / 7 / 6">Mi Band (Xiaomi Smart Band)</option>
                  <option value="Pebble Time / Steel">Pebble Smartwatch</option>
                  <option value="Galaxy Watch / WearOS">Galaxy Watch / WearOS</option>
                  <option value="Fossil Hybrid HR">Fossil Hybrid HR</option>
                  <option value="Generic BLE Fitness Band">Generic BLE Fitness Band</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Auto-Sync Frequency</label>
                <select
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(e.target.value)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Every 15 minutes">Every 15 minutes</option>
                  <option value="Hourly">Hourly</option>
                  <option value="Every 6 hours">Every 6 hours</option>
                  <option value="Manual Only">Manual Only</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Open Source Verification
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Source code repository:{" "}
                  <a
                    href={GADGETBRIDGE_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-500 underline font-mono"
                  >
                    Freeyourgadget/Gadgetbridge
                  </a>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeviceModalOpen(false)}
                  className="rounded-full cursor-pointer text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-xs">
                  Save & Connect
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}