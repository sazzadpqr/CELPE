import { 
  useListAdminGrammar, 
  getListAdminGrammarQueryKey, 
  useCreateAdminGrammar, 
  useUpdateAdminGrammar, 
  useDeleteAdminGrammar,
  GrammarTopic,
  GrammarTopicBody
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, Edit, Trash2, X, PlusCircle } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function Grammar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: topics, isLoading } = useListAdminGrammar({
    query: { queryKey: getListAdminGrammarQueryKey() }
  });
  
  const createTopic = useCreateAdminGrammar();
  const updateTopic = useUpdateAdminGrammar();
  const deleteTopic = useDeleteAdminGrammar();

  const [search, setSearch] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [editingTopic, setEditingTopic] = useState<GrammarTopic | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<GrammarTopicBody>({
    title: "",
    category: "",
    explanation: "",
    examples: [""],
    tips: [""],
    active: true
  });

  const filteredTopics = topics?.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenEditor = (topic?: GrammarTopic) => {
    if (topic) {
      setEditingTopic(topic);
      setFormData({
        title: topic.title,
        category: topic.category,
        explanation: topic.explanation,
        examples: [...topic.examples],
        tips: [...topic.tips],
        active: topic.active
      });
    } else {
      setEditingTopic(null);
      setFormData({
        title: "",
        category: "",
        explanation: "",
        examples: [""],
        tips: [""],
        active: true
      });
    }
    setIsEditorOpen(true);
  };

  const handleArrayChange = (field: 'examples' | 'tips', index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (field: 'examples' | 'tips') => {
    setFormData({ ...formData, [field]: [...formData[field], ""] });
  };

  const removeArrayItem = (field: 'examples' | 'tips', index: number) => {
    const newArray = [...formData[field]];
    newArray.splice(index, 1);
    setFormData({ ...formData, [field]: newArray });
  };

  const handleSave = () => {
    // Filter out empty strings
    const cleanData = {
      ...formData,
      examples: formData.examples.filter(e => e.trim() !== ""),
      tips: formData.tips.filter(t => t.trim() !== "")
    };

    if (editingTopic) {
      updateTopic.mutate(
        { id: editingTopic.id, data: cleanData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAdminGrammarQueryKey() });
            setIsEditorOpen(false);
            toast({ title: "Topic updated successfully" });
          },
          onError: () => toast({ title: "Failed to update topic", variant: "destructive" })
        }
      );
    } else {
      createTopic.mutate(
        { data: cleanData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAdminGrammarQueryKey() });
            setIsEditorOpen(false);
            toast({ title: "Topic created successfully" });
          },
          onError: () => toast({ title: "Failed to create topic", variant: "destructive" })
        }
      );
    }
  };

  const confirmDelete = (id: string) => {
    setTopicToDelete(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    if (topicToDelete) {
      deleteTopic.mutate(
        { id: topicToDelete },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAdminGrammarQueryKey() });
            setIsDeleteOpen(false);
            setTopicToDelete(null);
            toast({ title: "Topic deleted successfully" });
          },
          onError: () => toast({ title: "Failed to delete topic", variant: "destructive" })
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">Grammar Library</h1>
          <p className="text-muted-foreground text-sm">Manage grammar topics and explanations.</p>
        </div>
        <Button onClick={() => handleOpenEditor()}>
          <Plus className="mr-2 h-4 w-4" /> New Topic
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search topics..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border rounded-lg p-5 space-y-3 bg-card">
              <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))
        ) : filteredTopics?.length === 0 ? (
          <div className="col-span-full border border-dashed rounded-lg p-12 text-center text-muted-foreground">
            No grammar topics found
          </div>
        ) : (
          filteredTopics?.map((topic) => (
            <div key={topic.id} className="border rounded-lg p-5 bg-card hover:border-primary/50 transition-colors flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold truncate" title={topic.title}>{topic.title}</h3>
                {topic.active ? (
                  <Badge variant="outline" className="border-green-500 text-green-600 bg-green-500/10 whitespace-nowrap ml-2">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground whitespace-nowrap ml-2">Draft</Badge>
                )}
              </div>
              <Badge variant="secondary" className="w-fit mb-3 font-mono text-xs">{topic.category}</Badge>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                {topic.explanation}
              </p>
              <div className="flex items-center justify-between border-t pt-4 mt-auto">
                <div className="text-xs text-muted-foreground">
                  {topic.examples.length} examples · {topic.tips.length} tips
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditor(topic)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => confirmDelete(topic.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{editingTopic ? "Edit Topic" : "Create Topic"}</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-6">
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input 
                    id="title" 
                    value={formData.title} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input 
                    id="category" 
                    value={formData.category} 
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="explanation">Explanation</Label>
                <Textarea 
                  id="explanation" 
                  className="min-h-[100px]" 
                  value={formData.explanation} 
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })} 
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Examples</Label>
                  <Button variant="outline" size="sm" onClick={() => addArrayItem('examples')} className="h-7 text-xs">
                    <PlusCircle className="h-3 w-3 mr-1" /> Add Example
                  </Button>
                </div>
                {formData.examples.map((ex, i) => (
                  <div key={`ex-${i}`} className="flex gap-2 items-start">
                    <Input 
                      value={ex} 
                      onChange={(e) => handleArrayChange('examples', i, e.target.value)} 
                      placeholder="e.g. Eu sou brasileiro."
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeArrayItem('examples', i)} disabled={formData.examples.length === 1}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Tips</Label>
                  <Button variant="outline" size="sm" onClick={() => addArrayItem('tips')} className="h-7 text-xs">
                    <PlusCircle className="h-3 w-3 mr-1" /> Add Tip
                  </Button>
                </div>
                {formData.tips.map((tip, i) => (
                  <div key={`tip-${i}`} className="flex gap-2 items-start">
                    <Input 
                      value={tip} 
                      onChange={(e) => handleArrayChange('tips', i, e.target.value)} 
                      placeholder="Usage tip..."
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeArrayItem('tips', i)} disabled={formData.tips.length === 1}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center space-x-2 pt-2 border-t mt-2">
                <Switch 
                  id="active-grammar" 
                  checked={formData.active} 
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })} 
                />
                <Label htmlFor="active-grammar">Active (visible to students)</Label>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createTopic.isPending || updateTopic.isPending}>
              {createTopic.isPending || updateTopic.isPending ? "Saving..." : "Save Topic"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the grammar topic. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteTopic.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
