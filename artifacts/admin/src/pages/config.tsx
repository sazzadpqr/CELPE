import { 
  useGetAdminConfig, 
  getGetAdminConfigQueryKey, 
  useUpdateAdminConfig,
  useRotateAdminPassword,
  AdminConfig
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Save, History, KeyRound, Eye, EyeOff, Bot, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (best quality)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (fast & cheap)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (fastest)" },
];

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
    promptGenerationSystemPrompt: "",
    modelFeedback: "gpt-4o",
    modelGeneration: "gpt-4o-mini",
    maxTokensFeedback: 1024,
    maxTokensGeneration: 512,
  });

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        feedbackSystemPrompt: config.feedbackSystemPrompt,
        promptGenerationSystemPrompt: config.promptGenerationSystemPrompt,
        modelFeedback: config.modelFeedback,
        modelGeneration: config.modelGeneration,
        maxTokensFeedback: config.maxTokensFeedback,
        maxTokensGeneration: config.maxTokensGeneration,
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
        promptGenerationSystemPrompt: config.promptGenerationSystemPrompt,
        modelFeedback: config.modelFeedback,
        modelGeneration: config.modelGeneration,
        maxTokensFeedback: config.maxTokensFeedback,
        maxTokensGeneration: config.maxTokensGeneration,
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
    formData.promptGenerationSystemPrompt !== config.promptGenerationSystemPrompt ||
    formData.modelFeedback !== config.modelFeedback ||
    formData.modelGeneration !== config.modelGeneration ||
    formData.maxTokensFeedback !== config.maxTokensFeedback ||
    formData.maxTokensGeneration !== config.maxTokensGeneration
  );

  const pwValid = pwForm.current && pwForm.next && pwForm.confirm && pwForm.next === pwForm.confirm && pwForm.next.length >= 8;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">System Configuration</h1>
          <p className="text-muted-foreground text-sm">Tune the core prompts and AI models driving CelpePrep.</p>
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
        {/* ── Password ── */}
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

        {/* ── AI Model Settings ── */}
        <Card className="border-blue-900/40">
          <CardHeader>
            <CardTitle className="font-mono flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-400" />
              AI Model Settings
            </CardTitle>
            <CardDescription>
              Choose which OpenAI models power feedback evaluation and prompt generation. These settings are stored in the database and take effect within 5 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Feedback Model */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-mono font-medium flex items-center gap-1">
                      <Zap className="h-3 w-3 text-orange-400" /> Feedback Model
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Used to evaluate student writing against the Celpe-Bras rubric.</p>
                  </div>
                  <Select
                    value={formData.modelFeedback}
                    onValueChange={(v) => setFormData({ ...formData, modelFeedback: v })}
                  >
                    <SelectTrigger className="font-mono bg-muted/50 border-muted-foreground/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPENAI_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value} className="font-mono text-sm">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="space-y-1">
                    <Label className="text-xs font-mono text-muted-foreground">Max Tokens (feedback)</Label>
                    <Input
                      type="number"
                      min={256}
                      max={4096}
                      step={128}
                      value={formData.maxTokensFeedback}
                      onChange={(e) => setFormData({ ...formData, maxTokensFeedback: Number(e.target.value) })}
                      className="font-mono bg-muted/50 border-muted-foreground/20"
                    />
                    <p className="text-xs text-muted-foreground">256–4096. Higher = more detailed feedback, more cost.</p>
                  </div>
                </div>

                {/* Generation Model */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-mono font-medium flex items-center gap-1">
                      <Zap className="h-3 w-3 text-green-400" /> Generation Model
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Used to generate new practice prompts and scenarios.</p>
                  </div>
                  <Select
                    value={formData.modelGeneration}
                    onValueChange={(v) => setFormData({ ...formData, modelGeneration: v })}
                  >
                    <SelectTrigger className="font-mono bg-muted/50 border-muted-foreground/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPENAI_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value} className="font-mono text-sm">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="space-y-1">
                    <Label className="text-xs font-mono text-muted-foreground">Max Tokens (generation)</Label>
                    <Input
                      type="number"
                      min={128}
                      max={2048}
                      step={128}
                      value={formData.maxTokensGeneration}
                      onChange={(e) => setFormData({ ...formData, maxTokensGeneration: Number(e.target.value) })}
                      className="font-mono bg-muted/50 border-muted-foreground/20"
                    />
                    <p className="text-xs text-muted-foreground">128–2048. Controls length of generated scenarios.</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Feedback System Prompt ── */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Feedback System Prompt</CardTitle>
            <CardDescription>
              Instructs the AI on how to evaluate student responses against the Celpe-Bras rubric. Leave blank to use the built-in default prompt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="space-y-2">
                <Textarea 
                  className="min-h-[300px] font-mono text-xs leading-relaxed bg-muted/50 border-muted-foreground/20" 
                  placeholder="Leave blank to use the built-in default prompt…"
                  value={formData.feedbackSystemPrompt} 
                  onChange={(e) => setFormData({ ...formData, feedbackSystemPrompt: e.target.value })} 
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Prompt Generation System Prompt ── */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Prompt Generation System Prompt</CardTitle>
            <CardDescription>
              Instructs the AI on how to dynamically generate new scenarios and roleplay situations for students. Leave blank to use the built-in default prompt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="space-y-2">
                <Textarea 
                  className="min-h-[300px] font-mono text-xs leading-relaxed bg-muted/50 border-muted-foreground/20" 
                  placeholder="Leave blank to use the built-in default prompt…"
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
