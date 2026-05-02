import { 
  useGetAdminConfig, 
  getGetAdminConfigQueryKey, 
  useUpdateAdminConfig,
  AdminConfig
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Save, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  const [formData, setFormData] = useState<AdminConfig>({
    feedbackSystemPrompt: "",
    promptGenerationSystemPrompt: ""
  });

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

  const isDirty = config && (
    formData.feedbackSystemPrompt !== config.feedbackSystemPrompt ||
    formData.promptGenerationSystemPrompt !== config.promptGenerationSystemPrompt
  );

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
