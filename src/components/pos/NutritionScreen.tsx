import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { POSStatCard } from "./POSStatCard";

// ─── Types ───────────────────────────────────────
interface NutritionItem {
  id: string; name: string; emoji: string | null; price: number;
  calories: number | null; protein_g: number | null; carbs_g: number | null;
  fat_g: number | null; fiber_g: number | null; sodium_mg: number | null;
  sugar_g: number | null; saturated_fat_g: number | null; cholesterol_mg: number | null;
  health_score: number | null; allergens: string[] | null; diet_tags: string[] | null;
  serving_size: string | null; serving_unit: string | null;
  ingredients_detail: any[] | null; nutrition_published: boolean | null;
  category_name: string;
}
interface AllergenType { id: string; name_th: string; name_en: string; icon: string; sort_order: number; }
interface DietTagType { id: string; name_th: string; name_en: string; short_code: string; icon: string; color: string; sort_order: number; }

type Tab = "overview" | "edit" | "preview";

// ─── Health Score helpers ────────────────────────
function calcHealthScore(f: Partial<NutritionItem>): number {
  const score = 100
    - ((f.fat_g ?? 0) * 1.5)
    - ((f.sugar_g ?? 0) * 2)
    - ((f.sodium_mg ?? 0) * 0.02)
    + ((f.protein_g ?? 0) * 1)
    + ((f.fiber_g ?? 0) * 2);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreColor(s: number | null): string {
  if (s === null) return "bg-muted";
  if (s >= 70) return "bg-success";
  if (s >= 40) return "bg-warning";
  return "bg-destructive";
}

function calColor(c: number | null): string {
  if (!c) return "";
  if (c < 300) return "text-success";
  if (c <= 500) return "text-warning";
  return "text-destructive";
}

// ─── Main Component ──────────────────────────────
export function NutritionScreen() {
  const { toast } = useToast();
  const [items, setItems] = useState<NutritionItem[]>([]);
  const [allergenTypes, setAllergenTypes] = useState<AllergenType[]>([]);
  const [dietTagTypes, setDietTagTypes] = useState<DietTagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");

  // Edit state
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [copyFromId, setCopyFromId] = useState("");

  // Preview filter
  const [allergenFilter, setAllergenFilter] = useState<string[]>([]);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [menuRes, allergenRes, dietRes] = await Promise.all([
      supabase.from("menu_items")
        .select("*, menu_categories(name, icon)")
        .eq("is_available", true)
        .order("sort_order"),
      supabase.from("allergen_types").select("*").order("sort_order"),
      supabase.from("diet_tag_types").select("*").order("sort_order"),
    ]);
    if (menuRes.data) {
      setItems(menuRes.data.map((d: any) => ({
        ...d, price: Number(d.price),
        category_name: d.menu_categories?.name || "—",
      })));
    }
    if (allergenRes.data) setAllergenTypes(allergenRes.data as any);
    if (dietRes.data) setDietTagTypes(dietRes.data as any);
    setLoading(false);
  }

  // Stats
  const withCal = items.filter(i => (i.calories ?? 0) > 0);
  const noCal = items.filter(i => !i.calories);
  const avgCal = withCal.length > 0 ? Math.round(withCal.reduce((s, i) => s + (i.calories || 0), 0) / withCal.length) : 0;
  const published = items.filter(i => i.nutrition_published !== false);

  // Filter
  const filtered = useMemo(() => {
    let list = items;
    if (searchQ) list = list.filter(i => i.name.toLowerCase().includes(searchQ.toLowerCase()));
    return list;
  }, [items, searchQ]);

  const filteredPreview = useMemo(() => {
    if (allergenFilter.length === 0) return items;
    return items.filter(i => !i.allergens?.some(a => allergenFilter.includes(a)));
  }, [items, allergenFilter]);

  // Edit helpers
  function openEdit(item: NutritionItem) {
    setEditItemId(item.id);
    setEditForm({
      calories: item.calories, protein_g: item.protein_g, carbs_g: item.carbs_g,
      fat_g: item.fat_g, fiber_g: item.fiber_g, sodium_mg: item.sodium_mg,
      sugar_g: item.sugar_g, saturated_fat_g: item.saturated_fat_g,
      cholesterol_mg: item.cholesterol_mg, health_score: item.health_score,
      allergens: item.allergens || [], diet_tags: item.diet_tags || [],
      serving_size: item.serving_size || "", serving_unit: item.serving_unit || "จาน",
      ingredients_detail: item.ingredients_detail || [],
      nutrition_published: item.nutrition_published !== false,
    });
  }

  function copyFrom(sourceId: string) {
    const src = items.find(i => i.id === sourceId);
    if (!src) return;
    setEditForm(prev => ({
      ...prev,
      calories: src.calories, protein_g: src.protein_g, carbs_g: src.carbs_g,
      fat_g: src.fat_g, fiber_g: src.fiber_g, sodium_mg: src.sodium_mg,
      sugar_g: src.sugar_g, saturated_fat_g: src.saturated_fat_g,
      cholesterol_mg: src.cholesterol_mg, allergens: src.allergens || [],
      diet_tags: src.diet_tags || [],
    }));
    toast({ title: `คัดลอกจาก ${src.name}` });
  }

  async function saveEdit() {
    if (!editItemId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("menu_items").update({
        calories: editForm.calories || null,
        protein_g: editForm.protein_g || null,
        carbs_g: editForm.carbs_g || null,
        fat_g: editForm.fat_g || null,
        fiber_g: editForm.fiber_g || null,
        sodium_mg: editForm.sodium_mg || null,
        sugar_g: editForm.sugar_g || null,
        saturated_fat_g: editForm.saturated_fat_g || null,
        cholesterol_mg: editForm.cholesterol_mg || null,
        health_score: editForm.health_score || null,
        allergens: editForm.allergens || [],
        diet_tags: editForm.diet_tags || [],
        serving_size: editForm.serving_size || null,
        serving_unit: editForm.serving_unit || null,
        ingredients_detail: editForm.ingredients_detail?.length > 0 ? editForm.ingredients_detail : [],
        nutrition_published: editForm.nutrition_published ?? true,
      }).eq("id", editItemId);
      if (error) throw error;
      toast({ title: "บันทึกสำเร็จ" });
      setEditItemId(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(itemId: string, val: boolean) {
    await supabase.from("menu_items").update({ nutrition_published: val }).eq("id", itemId);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, nutrition_published: val } : i));
  }

  function toggleAllergen(a: string) {
    const cur = editForm.allergens || [];
    setEditForm({ ...editForm, allergens: cur.includes(a) ? cur.filter((x: string) => x !== a) : [...cur, a] });
  }

  function toggleDiet(d: string) {
    const cur = editForm.diet_tags || [];
    setEditForm({ ...editForm, diet_tags: cur.includes(d) ? cur.filter((x: string) => x !== d) : [...cur, d] });
  }

  function allergenIcon(name: string): string {
    return allergenTypes.find(a => a.name_th === name)?.icon || "⚠️";
  }

  function dietInfo(code: string): DietTagType | undefined {
    return dietTagTypes.find(d => d.short_code === code || d.name_en === code || d.name_th === code);
  }

  const editItem = items.find(i => i.id === editItemId);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "📊 Overview" },
    { key: "edit", label: "✏️ Edit Nutrition" },
    { key: "preview", label: "🌐 Public Preview" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-3 flex items-center gap-4">
        <div className="text-[18px] font-bold text-foreground">🥗 โภชนาการเมนู</div>
        <div className="flex gap-1.5 ml-4">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("px-4 py-2.5 rounded-xl text-[13px] font-bold border transition-all",
                tab === t.key ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-6 space-y-5">

        {/* ═══ TAB: Overview ═══ */}
        {tab === "overview" && (
          <>
            <div className="flex gap-4 flex-wrap">
              <POSStatCard icon="📊" label="มีข้อมูลแคลอรี" value={String(withCal.length)} sub={`จาก ${items.length} เมนู`} color="primary" />
              <POSStatCard icon="⚠️" label="ยังไม่มีข้อมูล" value={String(noCal.length)} sub="เมนู" color="warning" />
              <POSStatCard icon="🔥" label="เฉลี่ยแคลอรี" value={String(avgCal)} sub="kcal/จาน" color="accent" />
              <POSStatCard icon="🌐" label="Published" value={String(published.length)} sub="เมนู" color="success" />
            </div>

            <div className="relative max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="ค้นหาเมนู..." className="pl-9 h-9 rounded-xl text-[13px]" />
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-left">
                      <th className="py-3 px-4 font-semibold text-muted-foreground">เมนู</th>
                      <th className="py-3 px-3 font-semibold text-muted-foreground">หมวด</th>
                      <th className="py-3 px-3 font-semibold text-muted-foreground text-right">Cal</th>
                      <th className="py-3 px-3 font-semibold text-muted-foreground text-right">P</th>
                      <th className="py-3 px-3 font-semibold text-muted-foreground text-right">C</th>
                      <th className="py-3 px-3 font-semibold text-muted-foreground text-right">F</th>
                      <th className="py-3 px-3 font-semibold text-muted-foreground">Allergens</th>
                      <th className="py-3 px-3 font-semibold text-muted-foreground">Diet</th>
                      <th className="py-3 px-3 font-semibold text-muted-foreground text-center">Score</th>
                      <th className="py-3 px-3 font-semibold text-muted-foreground text-center">Published</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filtered.map(item => (
                      <>
                        <tr key={item.id} className="hover:bg-muted/20 cursor-pointer transition-colors"
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <span className="mr-1.5">{item.emoji || "🍽"}</span>{item.name}
                            <span className="ml-2 text-[11px] text-muted-foreground">฿{item.price}</span>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground text-[12px]">{item.category_name}</td>
                          <td className={cn("py-3 px-3 text-right font-mono font-bold tabular-nums", calColor(item.calories))}>
                            {item.calories || <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-warning/10 text-warning">—</span>}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-muted-foreground">{item.protein_g ?? "—"}</td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-muted-foreground">{item.carbs_g ?? "—"}</td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-muted-foreground">{item.fat_g ?? "—"}</td>
                          <td className="py-3 px-3">
                            <div className="flex gap-0.5 flex-wrap">
                              {(item.allergens || []).slice(0, 4).map(a => (
                                <span key={a} className="text-[12px]" title={a}>{allergenIcon(a)}</span>
                              ))}
                              {(item.allergens?.length ?? 0) > 4 && <span className="text-[10px] text-muted-foreground">+{(item.allergens?.length ?? 0) - 4}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex gap-1 flex-wrap">
                              {(item.diet_tags || []).map(t => {
                                const di = dietInfo(t);
                                return (
                                  <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                                    style={{ backgroundColor: `${di?.color || '#888'}20`, color: di?.color || '#888' }}>
                                    {di?.short_code || t}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.health_score !== null ? (
                              <div className="inline-flex items-center gap-1.5">
                                <div className={cn("w-2.5 h-2.5 rounded-full", scoreColor(item.health_score))} />
                                <span className="font-mono text-[12px] font-bold tabular-nums">{item.health_score}</span>
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                            <Switch checked={item.nutrition_published !== false}
                              onCheckedChange={v => togglePublished(item.id, v)} />
                          </td>
                        </tr>
                        {expandedId === item.id && (
                          <tr key={`${item.id}-exp`}>
                            <td colSpan={10} className="px-6 py-4 bg-muted/10">
                              <div className="grid grid-cols-9 gap-3 text-center">
                                {[
                                  { l: "แคลอรี", v: item.calories, u: "kcal" },
                                  { l: "โปรตีน", v: item.protein_g, u: "g" },
                                  { l: "คาร์บ", v: item.carbs_g, u: "g" },
                                  { l: "ไขมัน", v: item.fat_g, u: "g" },
                                  { l: "ไฟเบอร์", v: item.fiber_g, u: "g" },
                                  { l: "น้ำตาล", v: item.sugar_g, u: "g" },
                                  { l: "โซเดียม", v: item.sodium_mg, u: "mg" },
                                  { l: "ไขมันอิ่มตัว", v: item.saturated_fat_g, u: "g" },
                                  { l: "คอเลสเตอรอล", v: item.cholesterol_mg, u: "mg" },
                                ].map(m => (
                                  <div key={m.l}>
                                    <div className="text-[10px] text-muted-foreground">{m.l}</div>
                                    <div className="font-mono text-[15px] font-bold text-foreground">
                                      {m.v !== null && m.v !== undefined ? `${m.v}${m.u}` : "—"}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {item.serving_size && (
                                <div className="mt-2 text-[11px] text-muted-foreground text-center">
                                  Serving: {item.serving_size} {item.serving_unit || ""}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ═══ TAB: Edit ═══ */}
        {tab === "edit" && (
          <>
            <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
              <label className="text-[12px] font-semibold text-muted-foreground mb-2 block">เลือกเมนูที่ต้องการแก้ไข</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="ค้นหาเมนู..." className="pl-9 h-9 rounded-xl text-[13px] mb-3" />
              </div>
              <div className="grid gap-1.5 max-h-[300px] overflow-y-auto scrollbar-hide">
                {filtered.map(item => (
                  <button key={item.id} onClick={() => openEdit(item)}
                    className={cn("w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center gap-3",
                      editItemId === item.id ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/30")}>
                    <span className="text-[20px]">{item.emoji || "🍽"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-foreground truncate">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground">{item.category_name} • ฿{item.price}</div>
                    </div>
                    <span className={cn("font-mono text-[12px] font-bold tabular-nums", calColor(item.calories))}>
                      {item.calories ? `${item.calories} cal` : "—"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {editItem && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-5">
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-bold text-foreground">
                    {editItem.emoji} {editItem.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={copyFromId} onChange={e => { setCopyFromId(e.target.value); copyFrom(e.target.value); }}
                      className="h-8 px-2 rounded-lg border border-border bg-background text-[12px] text-muted-foreground">
                      <option value="">📋 Copy from...</option>
                      {items.filter(i => i.id !== editItemId && i.calories).map(i => (
                        <option key={i.id} value={i.id}>{i.emoji} {i.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Macros */}
                <div>
                  <div className="text-[12px] font-semibold text-muted-foreground mb-2">สารอาหาร</div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: "calories", label: "แคลอรี (kcal)" },
                      { key: "protein_g", label: "โปรตีน (g)" },
                      { key: "carbs_g", label: "คาร์บ (g)" },
                      { key: "fat_g", label: "ไขมัน (g)" },
                      { key: "fiber_g", label: "ไฟเบอร์ (g)" },
                      { key: "sugar_g", label: "น้ำตาล (g)" },
                      { key: "sodium_mg", label: "โซเดียม (mg)" },
                      { key: "saturated_fat_g", label: "ไขมันอิ่มตัว (g)" },
                      { key: "cholesterol_mg", label: "คอเลสเตอรอล (mg)" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">{f.label}</label>
                        <Input type="number" value={editForm[f.key] ?? ""}
                          onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value ? parseFloat(e.target.value) : null })}
                          className="h-9 rounded-xl text-[13px]" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Serving */}
                <div>
                  <div className="text-[12px] font-semibold text-muted-foreground mb-2">ขนาดเสิร์ฟ</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ขนาด</label>
                      <Input value={editForm.serving_size || ""}
                        onChange={e => setEditForm({ ...editForm, serving_size: e.target.value })}
                        placeholder="เช่น 1 จาน, 250ml" className="h-9 rounded-xl text-[13px]" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">หน่วย</label>
                      <select value={editForm.serving_unit || "จาน"}
                        onChange={e => setEditForm({ ...editForm, serving_unit: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-[13px]">
                        {["จาน", "แก้ว", "ถ้วย", "ชิ้น", "ขวด", "กล่อง"].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Allergens */}
                <div>
                  <div className="text-[12px] font-semibold text-muted-foreground mb-2">สารก่อภูมิแพ้</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {allergenTypes.map(a => {
                      const on = (editForm.allergens || []).includes(a.name_th);
                      return (
                        <button key={a.id} onClick={() => toggleAllergen(a.name_th)}
                          className={cn("px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all",
                            on ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:border-muted-foreground")}>
                          {a.icon} {a.name_th}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Diet Tags */}
                <div>
                  <div className="text-[12px] font-semibold text-muted-foreground mb-2">Diet Tags</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {dietTagTypes.map(d => {
                      const on = (editForm.diet_tags || []).includes(d.short_code);
                      return (
                        <button key={d.id} onClick={() => toggleDiet(d.short_code)}
                          className={cn("px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all",
                            on ? "border-opacity-50 bg-opacity-10" : "border-border text-muted-foreground hover:border-muted-foreground")}
                          style={on ? { borderColor: `${d.color}80`, backgroundColor: `${d.color}15`, color: d.color } : {}}>
                          {d.icon} {d.short_code} — {d.name_th}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Health Score */}
                <div>
                  <div className="text-[12px] font-semibold text-muted-foreground mb-2">Health Score</div>
                  <div className="flex items-center gap-3">
                    <Input type="number" value={editForm.health_score ?? ""}
                      onChange={e => setEditForm({ ...editForm, health_score: e.target.value ? parseInt(e.target.value) : null })}
                      className="h-9 rounded-xl text-[13px] w-24" placeholder="0-100" />
                    <Button variant="outline" size="sm" onClick={() => setEditForm({ ...editForm, health_score: calcHealthScore(editForm) })}>
                      🧮 Auto
                    </Button>
                    {editForm.health_score !== null && editForm.health_score !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", scoreColor(editForm.health_score))}
                            style={{ width: `${editForm.health_score}%` }} />
                        </div>
                        <span className="font-mono text-[13px] font-bold tabular-nums">{editForm.health_score}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Published */}
                <div className="flex items-center gap-3">
                  <Switch checked={editForm.nutrition_published !== false}
                    onCheckedChange={v => setEditForm({ ...editForm, nutrition_published: v })} />
                  <span className="text-[13px] font-medium text-foreground">เผยแพร่ข้อมูลโภชนาการ</span>
                </div>

                <Button onClick={saveEdit} disabled={saving} className="w-full">
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  💾 บันทึก
                </Button>
              </div>
            )}
          </>
        )}

        {/* ═══ TAB: Preview ═══ */}
        {tab === "preview" && (
          <>
            <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
              <div className="text-[12px] font-semibold text-muted-foreground mb-2">⚠️ ฉันแพ้... (คลิกเพื่อซ่อนเมนูที่มี)</div>
              <div className="flex gap-1.5 flex-wrap">
                {allergenTypes.map(a => {
                  const on = allergenFilter.includes(a.name_th);
                  return (
                    <button key={a.id} onClick={() => setAllergenFilter(prev => on ? prev.filter(x => x !== a.name_th) : [...prev, a.name_th])}
                      className={cn("px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all",
                        on ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:border-muted-foreground")}>
                      {on ? "🚫 " : ""}{a.icon} {a.name_th}
                    </button>
                  );
                })}
              </div>
              {allergenFilter.length > 0 && (
                <div className="mt-2 text-[12px] text-primary font-semibold">
                  🛡️ แสดง {filteredPreview.length}/{items.length} เมนูที่ปลอดภัย
                </div>
              )}
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
              {filteredPreview.map(item => (
                <div key={item.id} className="bg-card border border-border rounded-2xl p-4 shadow-card">
                  <div className="text-center mb-3">
                    <span className="text-[36px]">{item.emoji || "🍽"}</span>
                    <div className="text-[14px] font-bold text-foreground mt-1">{item.name}</div>
                    <div className="font-mono text-[16px] font-bold" style={{ color: "hsl(var(--primary))" }}>฿{item.price}</div>
                  </div>

                  {/* Calories badge */}
                  {item.calories ? (
                    <div className="flex justify-center mb-2">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                        (item.calories < 300) ? "bg-success/10 text-success" :
                        (item.calories <= 500) ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>
                        🔥 {item.calories} cal
                      </span>
                    </div>
                  ) : (
                    <div className="text-center text-[10px] text-muted-foreground mb-2">ข้อมูลอยู่ระหว่างจัดทำ</div>
                  )}

                  {/* Macro bars */}
                  {(item.protein_g || item.carbs_g || item.fat_g) && (
                    <div className="space-y-1 mb-2">
                      {[
                        { l: "P", v: item.protein_g, c: "bg-blue-500" },
                        { l: "C", v: item.carbs_g, c: "bg-amber-500" },
                        { l: "F", v: item.fat_g, c: "bg-red-500" },
                      ].map(m => m.v ? (
                        <div key={m.l} className="flex items-center gap-2 text-[10px]">
                          <span className="w-3 font-bold text-muted-foreground">{m.l}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={cn("h-full rounded-full", m.c)} style={{ width: `${Math.min(100, (m.v / 50) * 100)}%` }} />
                          </div>
                          <span className="font-mono text-muted-foreground w-6 text-right tabular-nums">{m.v}g</span>
                        </div>
                      ) : null)}
                    </div>
                  )}

                  {/* Allergens + Diet */}
                  <div className="flex gap-1 flex-wrap justify-center">
                    {(item.allergens || []).map(a => (
                      <span key={a} className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[9px] font-bold">
                        {allergenIcon(a)} {a}
                      </span>
                    ))}
                  </div>
                  {(item.diet_tags?.length ?? 0) > 0 && (
                    <div className="flex gap-1 flex-wrap justify-center mt-1">
                      {item.diet_tags!.map(t => {
                        const di = dietInfo(t);
                        return (
                          <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                            style={{ backgroundColor: `${di?.color || '#888'}15`, color: di?.color || '#888' }}>
                            {di?.short_code || t}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Health score */}
                  {item.health_score !== null && (
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <div className={cn("w-2 h-2 rounded-full", scoreColor(item.health_score))} />
                      <span className="text-[10px] font-semibold text-muted-foreground">Score {item.health_score}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
