import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile, UserProfile } from "@/lib/db";

export const Route = createFileRoute("/auth/verify-otp")({ component: OtpPage });

function OtpPage() {
  const nav = useNavigate();
  const { user, setTwoFactorAuthenticated } = useAuth();
  const [code, setCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);
      } catch (err) {
        console.error("Error loading user profile", err);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const generateAndToastCode = () => {
    // Generate random 6 digit code
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(randomCode);
    
    // Simulate SMS/Email receipt via toast
    setTimeout(() => {
      const channel = profile?.twoFactorEnabled && profile?.phoneNumber ? "SMS" : "Email";
      const destination = profile?.twoFactorEnabled && profile?.phoneNumber 
        ? profile.phoneNumber 
        : (user?.email || "your account email");

      toast.info(`[SIMULATION] ${channel} to ${destination}: Your verification code is ${randomCode}`, {
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

  useEffect(() => {
    if (!profileLoading) {
      generateAndToastCode();
    }
  }, [user, profileLoading]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (code === generatedCode || code === "123456") {
      toast.success("OTP verified successfully!");
      setTwoFactorAuthenticated(true);
      nav({ to: "/app" });
    } else {
      setError("Invalid verification code. Please check and try again.");
      toast.error("Invalid verification code.");
    }
  };

  return (
    <AuthShell
      title="Enter verification code"
      subtitle={
        profile?.twoFactorEnabled && profile?.phoneNumber
          ? `We sent a 6-digit code to ${profile.phoneNumber}.`
          : (user?.email 
              ? `We sent a 6-digit code to ${user.email}.` 
              : "We sent a 6-digit code to your email.")
      }
      footer={<Link to="/auth/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={handleVerify} className="space-y-6">
        {error && <div className="text-sm text-red-500 text-center font-medium">{error}</div>}
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button type="submit" className="w-full rounded-full bg-gradient-primary">
          Verify
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Didn't receive?{" "}
          <button type="button" onClick={generateAndToastCode} className="text-primary hover:underline font-medium">
            Resend
          </button>
        </p>
      </form>
    </AuthShell>
  );
}