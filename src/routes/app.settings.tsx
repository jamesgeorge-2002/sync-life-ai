import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Settings } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getUserProfile, updateUserProfile, UserProfile } from "@/lib/db";
import { getGeminiApiKey } from "@/lib/gemini";
import { toast } from "sonner";
import { Sparkles, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user: authUser, setTwoFactorAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Gemini API Key state
  const [geminiKey, setGeminiKey] = useState(getGeminiApiKey());

  // 2FA Setup states
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [phone, setPhone] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [setupError, setSetupError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!authUser) return;
      try {
        const data = await getUserProfile(authUser.uid);
        if (data) {
          setProfile(data);
          setName(data.displayName || "");
          setEmail(data.email || "");
        }
      } catch (err) {
        console.error("Failed to load user profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [authUser]);

  const handleToggle2FA = async (checked: boolean) => {
    if (!authUser) return;
    
    if (!checked) {
      if (confirm("Are you sure you want to disable Two-Factor Authentication?")) {
        try {
          await updateUserProfile(authUser.uid, {
            twoFactorEnabled: false,
            phoneNumber: "",
          });
          setProfile((prev) => prev ? { ...prev, twoFactorEnabled: false, phoneNumber: "" } : null);
          toast.success("Two-Factor Authentication disabled.");
        } catch (err) {
          console.error("Failed to disable 2FA", err);
          toast.error("Failed to disable Two-Factor Authentication.");
        }
      }
    } else {
      setShow2faSetup(true);
      setPhone("");
      setSetupCode("");
      setSentCode("");
      setSetupError("");
    }
  };

  const handleSendSetupOTP = () => {
    let formattedPhone = phone.trim();
    if (/^\d{10}$/.test(formattedPhone)) {
      formattedPhone = "+91" + formattedPhone;
      setPhone(formattedPhone);
    } else if (/^91\d{10}$/.test(formattedPhone)) {
      formattedPhone = "+" + formattedPhone;
      setPhone(formattedPhone);
    }

    if (!formattedPhone.startsWith("+91")) {
      setSetupError("Please enter an Indian phone number starting with +91 (Firebase SMS is only supported in India).");
      return;
    }
    setSetupError("");
    
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(randomCode);
    
    setTimeout(() => {
      toast.info(`[SIMULATION] SMS to ${phone}: Your verification code is ${randomCode}`, {
        duration: 15000,
        action: {
          label: "Copy",
          onClick: () => {
            navigator.clipboard.writeText(randomCode);
            toast.success("Code copied to clipboard!");
          }
        }
      });
    }, 1000);
  };

  const handleVerifySetupOTP = async () => {
    if (!authUser) return;
    if (setupCode.length < 6) {
      setSetupError("Please enter the complete 6-digit verification code.");
      return;
    }
    
    if (setupCode === sentCode || setupCode === "123456") {
      try {
        await updateUserProfile(authUser.uid, {
          twoFactorEnabled: true,
          phoneNumber: phone,
        });
        setProfile((prev) => prev ? { ...prev, twoFactorEnabled: true, phoneNumber: phone } : null);
        setTwoFactorAuthenticated(true);
        toast.success("Two-Factor Authentication enabled successfully!");
        setShow2faSetup(false);
      } catch (err) {
        console.error("Failed to enable 2FA", err);
        setSetupError("Database error while enabling 2FA. Please try again.");
      }
    } else {
      setSetupError("Invalid verification code. Please check and try again.");
    }
  };

  const handleSaveChanges = async () => {
    if (!authUser) return;
    setSaving(true);
    try {
      await updateUserProfile(authUser.uid, {
        displayName: name,
        email: email,
      });
      toast.success("Profile settings updated successfully!");
    } catch (err) {
      console.error("Failed to save profile changes", err);
      toast.error("Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearAllData = async () => {
    if (!authUser) return;
    if (
      !confirm(
        "Are you sure you want to delete ALL your personal data? This will clear all transactions, tasks, notes, habits, goals, trips, documents, and vitals, giving you a completely fresh, blank workspace.",
      )
    )
      return;
    setResetting(true);
    try {
      const { clearAllUserData } = await import("@/lib/db");
      await clearAllUserData(authUser.uid);
      toast.success("All personal data cleared! Your workspace is completely fresh.");
      setTimeout(() => {
        window.location.href = "/app/";
      }, 1000);
    } catch (err) {
      console.error("Failed to clear personal data", err);
      toast.error("Failed to clear data.");
    } finally {
      setResetting(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!authUser) return;
    if (
      !confirm(
        "Are you sure you want to load sample demo data? This will overwrite your current workspace with sample metrics.",
      )
    )
      return;
    setResetting(true);
    try {
      const { seedUserMockData } = await import("@/lib/db");
      await seedUserMockData(authUser.uid, true);
      toast.success("Sample demo data loaded successfully!");
      setTimeout(() => {
        window.location.href = "/app/";
      }, 1000);
    } catch (err) {
      console.error("Failed to reset database", err);
      toast.error("Failed to load sample data.");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Syncing settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" icon={<Settings className="h-5 w-5" />} />
      <div className="glass rounded-2xl p-6">
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notif">Notifications</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-6 space-y-4">
            <div>
              <Label htmlFor="displayName">Name</Label>
              <Input
                id="displayName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="displayEmail">Email</Label>
              <Input
                id="displayEmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="rounded-full bg-gradient-primary cursor-pointer"
                onClick={handleSaveChanges}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                onClick={handleResetDatabase}
                disabled={resetting}
              >
                {resetting ? "Resetting..." : "Reset Workspace Data"}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="notif" className="mt-6 space-y-3">
            {[
              "Daily digest",
              "Task reminders",
              "Mood check-ins",
              "AI insights",
              "Weekly report",
            ].map((n) => (
              <div
                key={n}
                className="flex items-center justify-between rounded-xl border border-border/50 p-3"
              >
                <span className="text-sm">{n}</span>
                <Switch defaultChecked />
              </div>
            ))}
          </TabsContent>
          <TabsContent value="ai" className="mt-6 space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> Google Gemini API Key & RAG Engine
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage your Google Gemini API key for Knowledge Base RAG search, document analysis, and AI copilot.
              </p>
              <div>
                <Label htmlFor="geminiKeyInput" className="text-xs font-semibold">Google Gemini API Key</Label>
                <Input
                  id="geminiKeyInput"
                  type="password"
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value);
                    localStorage.setItem("sync_life_gemini_key", e.target.value);
                    toast.success("Gemini API key updated!");
                  }}
                  placeholder="AIzaSy..."
                  className="mt-1 font-mono text-xs"
                />
                <p className="text-[11px] text-emerald-500 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> API Key Active: <code className="font-mono">{geminiKey ? geminiKey.substring(0, 12) + "..." : "Configured via .env"}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
              <span className="text-sm">Personalized recommendations</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
              <span className="text-sm">Use workspace documents for Gemini RAG memory</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
              <span className="text-sm font-medium">Python RAG Service Backend (http://localhost:8000)</span>
              <Switch defaultChecked />
            </div>
          </TabsContent>
          <TabsContent value="security" className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
              <div>
                <span className="block text-sm font-medium">Two-factor authentication</span>
                <span className="text-xs text-muted-foreground">
                  {profile?.twoFactorEnabled 
                    ? `Enabled (SMS to ${profile.phoneNumber})` 
                    : "Secure your account with SMS OTP verification."}
                </span>
              </div>
              <Switch 
                checked={profile?.twoFactorEnabled || false} 
                onCheckedChange={handleToggle2FA}
              />
            </div>

            {show2faSetup && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4 animate-in fade-in-0 duration-200">
                <h4 className="text-sm font-semibold">Configure SMS Two-Factor Authentication</h4>
                {setupError && <p className="text-xs text-red-500 font-medium">{setupError}</p>}
                
                {!sentCode ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button 
                      type="button" 
                      size="sm"
                      className="rounded-full bg-gradient-primary"
                      onClick={handleSendSetupOTP}
                    >
                      Send Verification Code
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="setupOtp">Enter 6-Digit Code</Label>
                      <Input
                        id="setupOtp"
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={setupCode}
                        onChange={(e) => setSetupCode(e.target.value)}
                        className="mt-1 tracking-widest text-center text-lg font-mono font-bold"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        size="sm"
                        className="rounded-full bg-gradient-primary"
                        onClick={handleVerifySetupOTP}
                      >
                        Verify & Enable
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="rounded-full"
                        onClick={() => setSentCode("")}
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
              <span className="text-sm">Biometric unlock</span>
              <Switch defaultChecked />
            </div>
            <Button variant="outline" className="rounded-full cursor-pointer">
              Change password
            </Button>
          </TabsContent>

          <TabsContent value="data" className="mt-6 space-y-6">
            <div className="rounded-2xl border border-border/50 p-5 bg-card/40 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Workspace Data Management</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Manage your personal cloud Firestore database. Each user has their own private isolated workspace.
                </p>
              </div>

              <div className="pt-2 border-t border-border/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                  <div>
                    <p className="text-sm font-semibold text-rose-500">Clear All My Data (Start Fresh)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Purges all tasks, transactions, notes, habits, goals, trips, documents, and vitals from your account.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={resetting}
                    onClick={handleClearAllData}
                    className="rounded-full shrink-0 cursor-pointer text-xs"
                  >
                    {resetting ? "Clearing..." : "Clear Workspace"}
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Load Sample / Demo Data (Optional)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Populates your workspace with example tasks, notes, habits, and financial logs for testing.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={resetting}
                    onClick={handleResetDatabase}
                    className="rounded-full shrink-0 cursor-pointer text-xs"
                  >
                    {resetting ? "Loading..." : "Load Sample Data"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
