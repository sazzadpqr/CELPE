import {
  useListAdminWotd,
  getListAdminWotdQueryKey,
  useCreateAdminWotd,
  useUpdateAdminWotd,
  useDeleteAdminWotd,
  type WotdEntry,
  type WotdEntryBody,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EMPTY: WotdEntryBody = { word: "", pos: "", definition: "", example: "", active: true };

const POS_COLORS: Record<string, string> = {
  verbo: "border-blue-500 text-blue-600 bg-blue-500/10",
  substantivo: "border-green-500 text-green-600 bg-green-500/10",
  adjetivo: "border-purple-500 text-purple-600 bg-purple-500/10",
  advérbio: "border-yellow-500 text-yellow-600 bg-yellow-500/10",
};

export default function WotdPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: entries, isLoading } = useListAdminWotd({ query: { queryKey: getListAdminWotdQueryKey() } });

  const createEntry = useCreateAdminWotd();
  const updateEntry = useUpdateAdminWotd();
  const deleteEntry = useDeleteAdminWotd();

  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<WotdEntry | null>(null);
  const [form, setForm] = useState<WotdEntryBody>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openEditor = (entry?: WotdEntry) => {
    setEditing(entry ?? null);
    setForm(entry ? { word: entry.word, pos: entry.pos, definition: entry.definition, example: entry.example, active: entry.active } : EMPTY);
    setDialog(true);
  };

  const handleSave = () => {
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListAdminWotdQueryKey() });
      setDialog(false);
      toast({ title: editing ? "Word updated" : "Word added to bank" });
    };
    const onError = () => toast({ title: "Save failed", variant: "destructive" });
    if (editing) {
      updateEntry.mutate({ id: editing.id, data: form }, { onSuccess, onError });
    } else {
      createEntry.mutate({ data: form }, { onSuccess, onError });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteEntry.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminWotdQueryKey() });
        setDeleteId(null);
        toast({ title: "Word removed" });
      },
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    });
  };

  const filtered = entries?.filter((e) =>
    e.word.toLowerCase().includes(search.toLowerCase()) ||
    e.pos.toLowerCase().includes(search.toLowerCase()) ||
    e.definition.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const activeCount = entries?.filter((e) => e.active).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">Word Bank</h1>
          <p className="text-muted-foreground text-sm">
            Manage the Word of the Day pool.{" "}
            <span className="text-primary font-medium">{activeCount} active</span>
            {entries && <span className="text-muted-foreground"> / {entries.length} total</span>}
          </p>
        </div>
        <Button onClick={() => openEditor()}>
          <Plus className="mr-2 h-4 w-4" /> Add Word
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search words..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Word</TableHead>
              <TableHead>Part of Speech</TableHead>
              <TableHead className="hidden md:table-cell">Definition</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1,2,3,4,5,6].map(i => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  {search ? "No words match your search." : "No words in the bank yet."}
                </TableCell>
              </TableRow>
            ) : filtered.map((entry) => (
              <TableRow key={entry.id} className="group">
                <TableCell className="font-semibold">{entry.word}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${POS_COLORS[entry.pos] ?? "text-muted-foreground"}`}>
                    {entry.pos}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-xs">
                  <span className="line-clamp-2">{entry.definition}</span>
                </TableCell>
                <TableCell>
                  {entry.active
                    ? <Badge variant="outline" className="border-green-500 text-green-600 bg-green-500/10 text-xs">Active</Badge>
                    : <Badge variant="outline" className="text-muted-foreground text-xs">Draft</Badge>
                  }
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditor(entry)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(entry.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Editor Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Word" : "Add Word"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Word</Label>
                <Input value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} placeholder="e.g. reivindicar" />
              </div>
              <div className="space-y-2">
                <Label>Part of Speech</Label>
                <Input value={form.pos} onChange={(e) => setForm({ ...form, pos: e.target.value })} placeholder="e.g. verbo" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Definition</Label>
              <Textarea
                className="min-h-[80px]"
                value={form.definition}
                onChange={(e) => setForm({ ...form, definition: e.target.value })}
                placeholder="Clear, concise definition in Portuguese..."
              />
            </div>
            <div className="space-y-2">
              <Label>Example Sentence</Label>
              <Textarea
                className="min-h-[70px]"
                value={form.example}
                onChange={(e) => setForm({ ...form, example: e.target.value })}
                placeholder="Example usage in context..."
              />
            </div>
            <div className="flex items-center gap-3 pt-2 border-t">
              <Switch id="wotd-active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label htmlFor="wotd-active">Active (include in daily rotation)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createEntry.isPending || updateEntry.isPending}>
              {createEntry.isPending || updateEntry.isPending ? "Saving..." : "Save Word"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove word from bank?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this word from the Word of the Day pool.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteEntry.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
