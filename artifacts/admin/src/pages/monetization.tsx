import { useState, useEffect } from "react";
import { DollarSign, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminSave } from "@/lib/adminClient";

type Plan = { id: string; planKey: string; title: string; subtitle: string; priceLabel: string; billingPeriod: string; paddleProductId: string; paddlePriceId: string; isPopular: boolean; isActive: boolean; trialDays: number; order: number; features: string[] };
type Variant = { id: string; variantKey: string; title: string; subtitle: string; featureList: string[]; ctaLabel: string; secondaryCtaLabel: string; badgeText: string; isActive: boolean; audience: string };
type Promo = { id: string; code: string; title: string; description: string; discountLabel: string; paddleDiscountId: string; startsAt: string | null; endsAt: string | null; maxRedemptions: number | null; redemptionsCount: number; isActive: boolean };

type Tab = "plans" | "variants" | "promos";

export default function MonetizationPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("plans");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState<(Partial<Plan> & { id?: string }) | null>(null);
  const [editVariant, setEditVariant] = useState<(Partial<Variant> & { id?: string }) | null>(null);
  const [editPromo, setEditPromo] = useState<(Partial<Promo> & { id?: string }) | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, v, pr] = await Promise.all([
        adminFetch<Plan[]>("/api/admin/monetization-plans"),
        adminFetch<Variant[]>("/api/admin/paywall-variants"),
        adminFetch<Promo[]>("/api/admin/promo-campaigns"),
      ]);
      setPlans(p); setVariants(v); setPromos(pr);
    } catch { toast({ title: "Erro ao carregar", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const savePlan = async () => {
    if (!editPlan?.title) return;
    try {
      if (editPlan.id) await adminSave(`/api/admin/monetization-plans/${editPlan.id}`, editPlan, "PUT");
      else await adminSave("/api/admin/monetization-plans", editPlan, "POST");
      toast({ title: "Plano salvo" });
      setEditPlan(null); load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Excluir plano?")) return;
    try {
      await adminSave(`/api/admin/monetization-plans/${id}`, {}, "DELETE");
      toast({ title: "Plano excluído" }); load();
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const saveVariant = async () => {
    if (!editVariant?.title) return;
    try {
      if (editVariant.id) await adminSave(`/api/admin/paywall-variants/${editVariant.id}`, editVariant, "PUT");
      else await adminSave("/api/admin/paywall-variants", editVariant, "POST");
      toast({ title: "Variante salva" });
      setEditVariant(null); load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  const savePromo = async () => {
    if (!editPromo?.title || !editPromo?.code) return;
    try {
      if (editPromo.id) await adminSave(`/api/admin/promo-campaigns/${editPromo.id}`, editPromo, "PUT");
      else await adminSave("/api/admin/promo-campaigns", editPromo, "POST");
      toast({ title: "Promoção salva" });
      setEditPromo(null); load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Monetização</h1>
          <p className="text-sm text-muted-foreground">Gerencie planos, paywall e promoções</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["plans","variants","promos"] as const).map(t => (
          <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}>
            {t === "plans" ? "Planos" : t === "variants" ? "Paywall" : "Promoções"}
          </Button>
        ))}
      </div>

      {loading ? <Skeleton className="h-40 w-full" /> : (
        <>
          {tab === "plans" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setEditPlan({ title: "", subtitle: "", priceLabel: "", billingPeriod: "monthly", paddleProductId: "", paddlePriceId: "", isPopular: false, isActive: true, trialDays: 0, order: 0, features: [] })}>
                  <Plus className="h-4 w-4 mr-1" /> Novo Plano
                </Button>
              </div>
              {editPlan && (
                <Card className="border-primary">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Título *</Label><Input value={editPlan.title ?? ""} onChange={e => setEditPlan(p => ({ ...p!, title: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Subtítulo</Label><Input value={editPlan.subtitle ?? ""} onChange={e => setEditPlan(p => ({ ...p!, subtitle: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Preço (ex: R$ 44,99)</Label><Input value={editPlan.priceLabel ?? ""} onChange={e => setEditPlan(p => ({ ...p!, priceLabel: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Período</Label>
                        <Select value={editPlan.billingPeriod ?? "monthly"} onValueChange={v => setEditPlan(p => ({ ...p!, billingPeriod: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["free","monthly","annual","one_time_30_days"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Dias de trial</Label><Input type="number" value={editPlan.trialDays ?? 0} onChange={e => setEditPlan(p => ({ ...p!, trialDays: parseInt(e.target.value) }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Paddle Product ID</Label><Input value={editPlan.paddleProductId ?? ""} onChange={e => setEditPlan(p => ({ ...p!, paddleProductId: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Paddle Price ID</Label><Input value={editPlan.paddlePriceId ?? ""} onChange={e => setEditPlan(p => ({ ...p!, paddlePriceId: e.target.value }))} /></div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Benefícios (um por linha)</Label>
                      <Textarea rows={4} value={(editPlan.features ?? []).join("\n")} onChange={e => setEditPlan(p => ({ ...p!, features: e.target.value.split("\n").filter(Boolean) }))} />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2"><Switch checked={editPlan.isActive ?? true} onCheckedChange={v => setEditPlan(p => ({ ...p!, isActive: v }))} /><Label className="text-xs">Ativo</Label></div>
                      <div className="flex items-center gap-2"><Switch checked={editPlan.isPopular ?? false} onCheckedChange={v => setEditPlan(p => ({ ...p!, isPopular: v }))} /><Label className="text-xs">Destaque</Label></div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={savePlan}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditPlan(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plans.map(plan => (
                  <Card key={plan.id} className={plan.isActive ? "border-primary/30" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm">{plan.title}</p>
                            {plan.isPopular && <Badge className="text-[10px] bg-yellow-500 text-black">Destaque</Badge>}
                            <Badge variant={plan.isActive ? "default" : "secondary"} className="text-[10px]">{plan.isActive ? "Ativo" : "Inativo"}</Badge>
                          </div>
                          <p className="text-lg font-mono mt-1">{plan.priceLabel}</p>
                          <p className="text-xs text-muted-foreground">{plan.billingPeriod}</p>
                          <ul className="mt-2 space-y-0.5">
                            {(plan.features ?? []).slice(0, 3).map((f, i) => <li key={i} className="text-xs text-muted-foreground">• {f}</li>)}
                            {(plan.features ?? []).length > 3 && <li className="text-xs text-muted-foreground">+{(plan.features ?? []).length - 3} mais</li>}
                          </ul>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditPlan(plan)}><Edit2 className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deletePlan(plan.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tab === "variants" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Crie variantes do paywall para diferentes contextos (esgotou créditos, conteúdo premium, limite de retakes, etc.)</p>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setEditVariant({ title: "", subtitle: "", featureList: [], ctaLabel: "Assinar agora", secondaryCtaLabel: "Continuar grátis", badgeText: "", isActive: false, audience: "all" })}>
                  <Plus className="h-4 w-4 mr-1" /> Nova Variante
                </Button>
              </div>
              {editVariant && (
                <Card className="border-primary">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Título *</Label><Input value={editVariant.title ?? ""} onChange={e => setEditVariant(v => ({ ...v!, title: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Subtítulo</Label><Input value={editVariant.subtitle ?? ""} onChange={e => setEditVariant(v => ({ ...v!, subtitle: e.target.value }))} /></div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Benefícios (um por linha)</Label>
                      <Textarea rows={4} value={(editVariant.featureList ?? []).join("\n")} onChange={e => setEditVariant(v => ({ ...v!, featureList: e.target.value.split("\n").filter(Boolean) }))} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1"><Label className="text-xs">CTA Principal</Label><Input value={editVariant.ctaLabel ?? ""} onChange={e => setEditVariant(v => ({ ...v!, ctaLabel: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">CTA Secundário</Label><Input value={editVariant.secondaryCtaLabel ?? ""} onChange={e => setEditVariant(v => ({ ...v!, secondaryCtaLabel: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Badge</Label><Input value={editVariant.badgeText ?? ""} placeholder="Mais popular" onChange={e => setEditVariant(v => ({ ...v!, badgeText: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Público</Label>
                        <Select value={editVariant.audience ?? "all"} onValueChange={v2 => setEditVariant(v => ({ ...v!, audience: v2 }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["all","free","expired","credits_exhausted","retake_limit","premium_content"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-2 pb-1"><Switch checked={editVariant.isActive ?? false} onCheckedChange={v2 => setEditVariant(v => ({ ...v!, isActive: v2 }))} /><Label className="text-xs">Ativo</Label></div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveVariant}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditVariant(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                {variants.map(v => (
                  <Card key={v.id} className={v.isActive ? "border-primary/30" : ""}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{v.title}</p>
                          <Badge variant={v.isActive ? "default" : "secondary"} className="text-[10px]">{v.isActive ? "Ativo" : "Inativo"}</Badge>
                          <Badge variant="outline" className="text-[10px]">{v.audience}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{v.featureList.length} benefícios · CTA: "{v.ctaLabel}"</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditVariant(v)}><Edit2 className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={async () => { if (!confirm("Excluir?")) return; await adminSave(`/api/admin/paywall-variants/${v.id}`, {}, "DELETE"); load(); }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tab === "promos" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setEditPromo({ code: "", title: "", description: "", discountLabel: "", paddleDiscountId: "", startsAt: null, endsAt: null, maxRedemptions: null, isActive: false })}>
                  <Plus className="h-4 w-4 mr-1" /> Nova Promoção
                </Button>
              </div>
              {editPromo && (
                <Card className="border-primary">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Código *</Label><Input value={editPromo.code ?? ""} placeholder="CELPE30" className="uppercase" onChange={e => setEditPromo(p => ({ ...p!, code: e.target.value.toUpperCase() }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Título *</Label><Input value={editPromo.title ?? ""} onChange={e => setEditPromo(p => ({ ...p!, title: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Desconto (ex: 30% off)</Label><Input value={editPromo.discountLabel ?? ""} onChange={e => setEditPromo(p => ({ ...p!, discountLabel: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Paddle Discount ID</Label><Input value={editPromo.paddleDiscountId ?? ""} onChange={e => setEditPromo(p => ({ ...p!, paddleDiscountId: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Início</Label><Input type="datetime-local" value={editPromo.startsAt?.slice(0,16) ?? ""} onChange={e => setEditPromo(p => ({ ...p!, startsAt: e.target.value || null }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Fim</Label><Input type="datetime-local" value={editPromo.endsAt?.slice(0,16) ?? ""} onChange={e => setEditPromo(p => ({ ...p!, endsAt: e.target.value || null }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Máx. usos</Label><Input type="number" placeholder="ilimitado" value={editPromo.maxRedemptions ?? ""} onChange={e => setEditPromo(p => ({ ...p!, maxRedemptions: e.target.value ? parseInt(e.target.value) : null }))} /></div>
                    </div>
                    <div className="flex items-center gap-2"><Switch checked={editPromo.isActive ?? false} onCheckedChange={v => setEditPromo(p => ({ ...p!, isActive: v }))} /><Label className="text-xs">Ativo</Label></div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={savePromo}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditPromo(null)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                {promos.map(p => (
                  <Card key={p.id}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-primary">{p.code}</span>
                          <p className="font-medium text-sm">{p.title}</p>
                          <Badge variant={p.isActive ? "default" : "secondary"} className="text-[10px]">{p.isActive ? "Ativo" : "Inativo"}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{p.discountLabel} · {p.redemptionsCount}/{p.maxRedemptions ?? "∞"} usos</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditPromo(p)}><Edit2 className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={async () => { if (!confirm("Excluir?")) return; await adminSave(`/api/admin/promo-campaigns/${p.id}`, {}, "DELETE"); load(); }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {promos.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma promoção criada.</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
