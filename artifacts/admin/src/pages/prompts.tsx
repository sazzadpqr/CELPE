import { 
  useListAdminPrompts, 
  getListAdminPromptsQueryKey, 
  useCreateAdminPrompt, 
  useUpdateAdminPrompt, 
  useDeleteAdminPrompt,
  PracticePrompt,
  PracticePromptBody
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Plus, Search, Edit, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Prompts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: prompts, isLoading } = useListAdminPrompts({
    query: { queryKey: getListAdminPromptsQueryKey() }
  });
  
  const createPrompt = useCreateAdminPrompt();
  const updatePrompt = useUpdateAdminPrompt();
  const deletePrompt = useDeleteAdminPrompt();

  const [search, setSearch] = useState("");
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [editingPrompt, setEditingPrompt] = useState<PracticePrompt | null>(null);
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<PracticePromptBody>({
    taskType: "Audio Response",
    genre: "Everyday Conversation",
    source: "CelpePrep Internal",
    prompt: "",
    active: true
  });

  const filteredPrompts = prompts?.filter(p => 
    p.prompt.toLowerCase().includes(search.toLowerCase()) || 
    p.taskType.toLowerCase().includes(search.toLowerCase()) ||
    p.genre.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenEditor = (prompt?: PracticePrompt) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setFormData({
        taskType: prompt.taskType,
        genre: prompt.genre,
        source: prompt.source,
        prompt: prompt.prompt,
        active: prompt.active
      });
    } else {
      setEditingPrompt(null);
      setFormData({
        taskType: "Audio Response",
        genre: "Everyday Conversation",
        source: "CelpePrep Internal",
        prompt: "",
        active: true
      });
    }
    setIsEditorOpen(true);
  };

  const handleSave = () => {
    if (editingPrompt) {
      updatePrompt.mutate(
        { id: editingPrompt.id, data: formData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAdminPromptsQueryKey() });
            setIsEditorOpen(false);
            toast({ title: "Prompt updated successfully" });
          },
          onError: () => toast({ title: "Failed to update prompt", variant: "destructive" })
        }
      );
    } else {
      createPrompt.mutate(
        { data: formData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAdminPromptsQueryKey() });
            setIsEditorOpen(false);
            toast({ title: "Prompt created successfully" });
          },
          onError: () => toast({ title: "Failed to create prompt", variant: "destructive" })
        }
      );
    }
  };

  const confirmDelete = (id: string) => {
    setPromptToDelete(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    if (promptToDelete) {
      deletePrompt.mutate(
        { id: promptToDelete },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAdminPromptsQueryKey() });
            setIsDeleteOpen(false);
            setPromptToDelete(null);
            toast({ title: "Prompt deleted successfully" });
          },
          onError: () => toast({ title: "Failed to delete prompt", variant: "destructive" })
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">Practice Prompts</h1>
          <p className="text-muted-foreground text-sm">Manage scenarios and prompts for student practice.</p>
        </div>
        <Button onClick={() => handleOpenEditor()}>
          <Plus className="mr-2 h-4 w-4" /> New Prompt
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search prompts..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Genre</TableHead>
              <TableHead className="w-1/2">Prompt</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredPrompts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                  No prompts found
                </TableCell>
              </TableRow>
            ) : (
              filteredPrompts?.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell>
                    {prompt.active ? (
                      <Badge variant="outline" className="border-green-500 text-green-600 bg-green-500/10">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{prompt.taskType}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">{prompt.genre}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="truncate text-sm" title={prompt.prompt}>{prompt.prompt}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditor(prompt)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => confirmDelete(prompt.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPrompt ? "Edit Prompt" : "Create Prompt"}</DialogTitle>
            <DialogDescription>
              Configure the scenario settings and prompt text.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taskType">Task Type</Label>
                <Input 
                  id="taskType" 
                  value={formData.taskType} 
                  onChange={(e) => setFormData({ ...formData, taskType: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Input 
                  id="genre" 
                  value={formData.genre} 
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input 
                id="source" 
                value={formData.source} 
                onChange={(e) => setFormData({ ...formData, source: e.target.value })} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt Text</Label>
              <Textarea 
                id="prompt" 
                className="min-h-[150px] font-mono text-sm leading-relaxed" 
                value={formData.prompt} 
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })} 
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Switch 
                id="active" 
                checked={formData.active} 
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })} 
              />
              <Label htmlFor="active">Active (visible to students)</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createPrompt.isPending || updatePrompt.isPending}>
              {createPrompt.isPending || updatePrompt.isPending ? "Saving..." : "Save Prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the prompt. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletePrompt.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
