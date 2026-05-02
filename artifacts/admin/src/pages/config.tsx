import { 
  useGetAdminConfig, 
  getGetAdminConfigQueryKey, 
  useUpdateAdminConfig,
  useRotateAdminPassword,
  AdminConfig
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Save, History, KeyRound, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export default function Config() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: config, isLoading } = useGetAdminConfig({
    query: { queryKey: getGetAdminConfigQueryKey() }
  });
  
  const updateConfig = useUpdateAdminConfig();
  const rotatePassword = useRotateAdminPassword();

  const [formData, setFormData] = useState<AdminConfig>({
    feedbackSystemPrompt: "",
    promptGenerationSystemPrompt: ""
  });

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        feedbackSystemPrompt: config.feedbackSystemPrompt,
        promptGenerationSystemPrompt: config.promptGenerationSystemPrompt
      });
    }
  }, [config]);

  const handleSave = () => {
    updateConfig.mutate(
      { data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdminConfigQueryKey() });
          toast({ title: "Configuration saved successfully" });
        },
        onError: () => toast({ title: "Failed to save configuration", variant: "destructive" })
      }
    );
  };

  const handleReset = () => {
    if (config) {
      setFormData({
        feedbackSystemPrompt: config.feedbackSystemPrompt,
        promptGenerationSystemPrompt: config.promptGenerationSystemPrompt
      });
      toast({ title: "Restored to last saved configuration" });
    }
  };

  const handleRotate = () => {
    if (pwForm.next !== pwForm.confirm) {
      toast({ title: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (pwForm.next.length < 8) {
      toast({ title: "New password must be at least 8 characters", variant: "destructive" });
      return;
    }
    rotatePassword.mutate(
      { data: { currentPassword: pwForm.current, newPassword: pwForm.next } },
      {
        onSuccess: (data) => {
          if (data.token) {
            localStorage.setItem("admin_token", data.token);
          }
          setPwForm({ current: "", next: "", confirm: "" });
          toast({ title: "Password changed successfully. You have been re-authenticated." });
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error ?? "Failed to change password";
          toast({ title: msg, variant: "destructive" });
        }
      }
    );
  };

  const isDirty = config && (
    formData.feedbackSystemPrompt !== config.feedbackSystemPrompt ||
    formData.promptGenerationSystemPrompt !== config.promptGenerationSystemPrompt
  );

  const pwValid = pwForm.current && pwForm.next && pwForm.confirm && pwForm.next === pwForm.confirm && pwForm.next.length >= 8;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">System Configuration</h1>
          <p className="text-muted-foreground text-sm">Tune the core prompts driving the CelpePrep AI.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!isDirty || updateConfig.isPending}>
            <History className="mr-2 h-4 w-4" /> Discard Changes
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || updateConfig.isPending}>
            <Save className="mr-2 h-4 w-4" /> 
            {updateConfig.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-yellow-900/40">
          <CardHeader>
            <CardTitle className="font-mono flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-yellow-500" />
              Change Admin Password
            </CardTitle>
            <CardDescription>
              Rotate the admin login password. The new password is stored securely as a hash and will override the <code className="text-xs bg-muted px-1 rounded">SESSION_SECRET</code> environment variable. Minimum 8 characters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current password"
                  value={pwForm.current}
                  onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                  className="pr-10 font-mono bg-muted/50 border-muted-foreground/20"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={pwForm.next}
                  onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                  className="pr-10 font-mono bg-muted/50 border-muted-foreground/20"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">Confirm New Password</Label>
              <Input
                type="password"
                placeholder="Repeat new password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                className={`font-mono bg-muted/50 border-muted-foreground/20 ${
                  pwForm.confirm && pwForm.next !== pwForm.confirm ? "border-destructive" : ""
                }`}
              />
              {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                <p className="text-xs text-destructive font-mono">Passwords do not match</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleRotate}
              disabled={!pwValid || rotatePassword.isPending}
              variant="outline"
              className="border-yellow-700/50 text-yellow-500 hover:bg-yellow-950/30"
            >
              <KeyRound className="mr-2 h-4 w-4" />
              {rotatePassword.isPending ? "Changing..." : "Change Password"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Feedback System Prompt</CardTitle>
            <CardDescription>
              This prompt instructs the AI on how to evaluate student audio responses against the Celpe-Bras rubric.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="space-y-2">
                <Textarea 
                  className="min-h-[300px] font-mono text-xs leading-relaxed bg-muted/50 border-muted-foreground/20" 
                  value={formData.feedbackSystemPrompt} 
                  onChange={(e) => setFormData({ ...formData, feedbackSystemPrompt: e.target.value })} 
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Prompt Generation System Prompt</CardTitle>
            <CardDescription>
              This prompt instructs the AI on how to dynamically generate new scenarios and roleplay situations for students.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="space-y-2">
                <Textarea 
                  className="min-h-[300px] font-mono text-xs leading-relaxed bg-muted/50 border-muted-foreground/20" 
                  value={formData.promptGenerationSystemPrompt} 
                  onChange={(e) => setFormData({ ...formData, promptGenerationSystemPrompt: e.target.value })} 
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
