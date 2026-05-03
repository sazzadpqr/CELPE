import { useState, useEffect } from "react";
import { MessageCircle, Pin, EyeOff, Eye, Trash2, RefreshCw, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type Post = {
  id: string; deviceToken: string; authorName: string; authorEmoji: string;
  content: string; topic: string; likesCount: number;
  isPinned: boolean; isHidden: boolean; createdAt: string;
};

const TOPIC_LABELS: Record<string, string> = {
  geral: "Geral", gramatica: "Gramática", vocabulario: "Vocabulário",
  escrita: "Escrita", pronuncia: "Pronúncia", exame: "Exame",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export default function CommunityAdminPage() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await adminFetch<Post[]>("/api/admin/community-posts");
      setPosts(rows);
    } catch { toast({ title: "Erro ao carregar posts", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handlePin = async (post: Post) => {
    setActing(post.id);
    try {
      await adminSave(`/api/admin/community-posts/${post.id}/pin`, { isPinned: !post.isPinned }, "PUT");
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, isPinned: !p.isPinned } : p));
      toast({ title: post.isPinned ? "Post desafixado" : "Post fixado" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
    setActing(null);
  };

  const handleHide = async (post: Post) => {
    setActing(post.id);
    try {
      await adminSave(`/api/admin/community-posts/${post.id}/hide`, { isHidden: !post.isHidden }, "PUT");
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, isHidden: !p.isHidden } : p));
      toast({ title: post.isHidden ? "Post visível" : "Post ocultado" });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
    setActing(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminSave(`/api/admin/community-posts/${deleteId}`, {}, "DELETE");
      setPosts((prev) => prev.filter((p) => p.id !== deleteId));
      toast({ title: "Post excluído" });
      setDeleteId(null);
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  const visible = posts.filter((p) => !p.isHidden);
  const hidden = posts.filter((p) => p.isHidden);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Comunidade</h1>
          <p className="text-muted-foreground text-sm">Modere as publicações da comunidade.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3 w-3 mr-1" /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{posts.length}</p>
          <p className="text-muted-foreground">Total de posts</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{visible.length}</p>
          <p className="text-muted-foreground">Visíveis</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">{hidden.length}</p>
          <p className="text-muted-foreground">Ocultados</p>
        </CardContent></Card>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : posts.length === 0 ? (
        <div className="border border-dashed rounded-xl p-16 text-center text-muted-foreground">
          <MessageCircle className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p>Nenhuma publicação ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Card key={post.id} className={post.isHidden ? "opacity-50 border-yellow-500/30" : post.isPinned ? "border-primary/40" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{post.authorEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{post.authorName}</span>
                      <Badge variant="outline" className="text-[10px]">{TOPIC_LABELS[post.topic] ?? post.topic}</Badge>
                      {post.isPinned && <Badge className="text-[10px] bg-primary">Fixado</Badge>}
                      {post.isHidden && <Badge variant="secondary" className="text-[10px] text-yellow-400">Oculto</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">{timeAgo(post.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{post.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Heart className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{post.likesCount}</span>
                      <span className="text-xs text-muted-foreground font-mono">{post.deviceToken.slice(0, 8)}...</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className={`h-8 w-8 ${post.isPinned ? "text-primary" : ""}`}
                      onClick={() => handlePin(post)} disabled={acting === post.id}
                      title={post.isPinned ? "Desafixar" : "Fixar"}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => handleHide(post)} disabled={acting === post.id}
                      title={post.isHidden ? "Mostrar" : "Ocultar"}
                    >
                      {post.isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(post.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir publicação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
