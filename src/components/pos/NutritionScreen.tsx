import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MenuItem {
  id: string;
  name: string;
  emoji: string | null;
  price: number;
  calories: number | null;
  allergens: string[] | null;
  diet_tags: string[] | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  health_score: number | null;
  category_id: string | null;
  category_name?: string;
}

const ALLERGEN_LIST = ["กุ้ง", "ปู", "ปลา", "หอย", "ไข่", "นม", "ถั่วเหลือง", "ถั่วลิสง", "ข้าวสาลี", "งา", "ผักชี"];
const DIET_TAG_LIST = ["GF", "VG", "VN", "HL", "KT", "LF"];
const DIET_LABELS: Record<string, string> = { GF: "Gluten Free", VG: "Vegetarian", VN: "Vegan", HL: "Halal", KT: "Keto", LF: "Low Fat" };

type Tab = "overview" | "edit" | "preview";

export function NutritionScreen() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allergenFilter, setAllergenFilter] = useState<string[]>([]);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, emoji, price, calories, allergens, diet_tags, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, health_score, category_id, menu_categories(name)")
        .eq("is_available", true)
        .order("sort_order");
      if (error) throw error;
      setItems((data || []).map((d: any) => ({ ...d, category_name: d.menu_categories?.name || "—" })));
    } catch (err: any) {
      toast.error("โหลดเมนูไม่สำเร็จ: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const withCal = items.filter(i => (i.calories ?? 0) > 0);
  const noCal = items.filter(i => !i.calories || i.calories === 0);
  const avgCal = withCal.length > 0 ? Math.round(withCal.reduce((s, i) => s + (i.calories || 0), 0) / withCal.length) : 0;
  const withAllergens = items.filter(i => (i.allergens?.length ?? 0) > 0);

  const filteredPreview = allergenFilter.length === 0
    ? items
    : items.filter(i => !i.allergens?.some(a => allergenFilter.some(af => a.includes(af))));

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "📊 ภาพรวมโภชนาการ" },
    { key: "edit", label: "✏️ แก้ไขข้อมูล" },
    { key: "preview", label: "🌐 ตัวอย่างสาธารณะ" },
  ];

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide bg-background">
      <div className="max-w-[1000px] mx-auto space-y-4">
        <div className="text-[18px] font-bold text-foreground">🥗 โภชนาการเมนู</div>

        {/* Tabs */}
        <div className="flex gap-1.5">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("px-4 py-2 rounded-xl text-[13px] font-bold border transition-all",
                tab === t.key ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard icon="📊" label="มีข้อมูลแคลอรี" value={`${withCal.length}`} sub={`จาก ${items.length} เมนู`} />
              <StatCard icon="⚠️" label="ยังไม่มีข้อมูล" value={`${noCal.length}`} sub="เมนู" warn={noCal.length > 0} />
              <StatCard icon="🔥" label="เฉลี่ยแคลอรี" value={`${avgCal}`} sub="kcal/จาน" />
              <StatCard icon="🚨" label="มีสารก่อภูมิแพ้" value={`${withAllergens.length}`} sub="เมนู" />
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">เมนู</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground">หมวด</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground">ราคา</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground">Cal</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground">สารก่อภูมิแพ้</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Diet Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {items.map(item => (
                    <>
                      <tr key={item.id} className="hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                        <td className="px-4 py-3 font-medium">
                          <span className="mr-2">{item.emoji || "🍽"}</span>{item.name}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{item.category_name}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-accent">฿{item.price}</td>
                        <td className="px-3 py-3 text-right font-mono">
                          {item.calories ? (
                            <span className="font-bold">{item.calories}</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-warning/10 text-warning text-[10px] font-bold">ไม่มีข้อมูล</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {(item.allergens || []).map(a => (
                              <span key={a} className="px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive text-[10px] font-bold">{a}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {(item.diet_tags || []).map(t => (
                              <span key={t} className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">{t}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                      {expandedId === item.id && (
                        <tr key={`${item.id}-detail`}>
                          <td colSpan={6} className="px-6 py-4 bg-muted/10">
                            <div className="grid grid-cols-6 gap-4 text-center">
                              <MacroBox label="โปรตีน" value={item.protein_g} unit="g" />
                              <MacroBox label="คาร์บ" value={item.carbs_g} unit="g" />
                              <MacroBox label="ไขมัน" value={item.fat_g} unit="g" />
                              <MacroBox label="ไฟเบอร์" value={item.fiber_g} unit="g" />
                              <MacroBox label="โซเดียม" value={item.sodium_mg} unit="mg" />
                              <MacroBox label="Health Score" value={item.health_score} unit="" />
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "edit" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => toast.info("🧮 Auto-estimate calories จะพร้อมใช้เร็วๆ นี้")}>
                🧮 Auto-estimate calories
              </Button>
            </div>
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">เมนู</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground">Cal</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground">สารก่อภูมิแพ้</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Diet</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{item.emoji || "🍽"} {item.name}</td>
                      <td className="px-3 py-3 text-right font-mono">{item.calories || "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(item.allergens || []).map(a => (
                            <span key={a} className="px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive text-[10px] font-bold">{a}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(item.diet_tags || []).map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Button size="sm" variant="outline" onClick={() => setEditItem(item)}>แก้ไข</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Edit Modal */}
            <EditNutritionDialog item={editItem} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); fetchItems(); }} />
          </div>
        )}

        {tab === "preview" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="text-[12px] font-semibold text-muted-foreground mb-2">⚠️ กรองสารก่อภูมิแพ้ (คลิกเพื่อซ่อนเมนูที่มี)</div>
              <div className="flex gap-1.5 flex-wrap">
                {ALLERGEN_LIST.map(a => {
                  const on = allergenFilter.includes(a);
                  return (
                    <button key={a} onClick={() => setAllergenFilter(prev => on ? prev.filter(x => x !== a) : [...prev, a])}
                      className={cn("px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors",
                        on ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border bg-card text-muted-foreground hover:border-muted-foreground")}>
                      {on ? "🚫 " : ""}{a}
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

            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {filteredPreview.map(item => (
                <div key={item.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <div className="text-center mb-2">
                    <span className="text-[36px]">{item.emoji || "🍽"}</span>
                    <div className="text-[14px] font-bold text-foreground mt-1">{item.name}</div>
                    <div className="font-mono text-[16px] font-bold text-accent">฿{item.price}</div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-center mt-2">
                    {item.calories ? (
                      <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-bold">{item.calories} cal</span>
                    ) : null}
                    {(item.diet_tags || []).map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{t}</span>
                    ))}
                  </div>
                  {(item.allergens?.length ?? 0) > 0 && (
                    <div className="flex gap-1 flex-wrap justify-center mt-1.5">
                      {item.allergens!.map(a => (
                        <span key={a} className="px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive text-[9px] font-bold">⚠️ {a}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, warn }: { icon: string; label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={cn("bg-card border rounded-2xl p-4 shadow-sm", warn ? "border-warning/30" : "border-border")}>
      <div className="text-[22px] mb-1">{icon}</div>
      <div className="font-mono text-[22px] font-extrabold text-foreground">{value}</div>
      <div className="text-[12px] font-semibold text-foreground mt-0.5">{label}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function MacroBox({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <div className="font-mono text-[16px] font-bold text-foreground">
        {value !== null && value !== undefined ? `${value}${unit}` : "—"}
      </div>
    </div>
  );
}

function EditNutritionDialog({ item, onClose, onSaved }: { item: MenuItem | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<MenuItem>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) setForm({
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      fiber_g: item.fiber_g,
      sodium_mg: item.sodium_mg,
      health_score: item.health_score,
      allergens: item.allergens || [],
      diet_tags: item.diet_tags || [],
    });
  }, [item]);

  if (!item) return null;

  const toggleAllergen = (a: string) => {
    const cur = form.allergens || [];
    setForm({ ...form, allergens: cur.includes(a) ? cur.filter(x => x !== a) : [...cur, a] });
  };

  const toggleDiet = (d: string) => {
    const cur = form.diet_tags || [];
    setForm({ ...form, diet_tags: cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d] });
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("menu_items").update({
        calories: form.calories || null,
        protein_g: form.protein_g || null,
        carbs_g: form.carbs_g || null,
        fat_g: form.fat_g || null,
        fiber_g: form.fiber_g || null,
        sodium_mg: form.sodium_mg || null,
        health_score: form.health_score || null,
        allergens: form.allergens || [],
        diet_tags: form.diet_tags || [],
      }).eq("id", item.id);
      if (error) throw error;
      toast.success("บันทึกโภชนาการแล้ว");
      onSaved();
    } catch (err: any) {
      toast.error("บันทึกไม่สำเร็จ: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{item.emoji} {item.name} — แก้ไขโภชนาการ</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-3 gap-3">
            <NumField label="แคลอรี (kcal)" value={form.calories} onChange={v => setForm({ ...form, calories: v })} />
            <NumField label="โปรตีน (g)" value={form.protein_g} onChange={v => setForm({ ...form, protein_g: v })} />
            <NumField label="คาร์บ (g)" value={form.carbs_g} onChange={v => setForm({ ...form, carbs_g: v })} />
            <NumField label="ไขมัน (g)" value={form.fat_g} onChange={v => setForm({ ...form, fat_g: v })} />
            <NumField label="ไฟเบอร์ (g)" value={form.fiber_g} onChange={v => setForm({ ...form, fiber_g: v })} />
            <NumField label="โซเดียม (mg)" value={form.sodium_mg} onChange={v => setForm({ ...form, sodium_mg: v })} />
          </div>
          <NumField label="Health Score (0-100)" value={form.health_score} onChange={v => setForm({ ...form, health_score: v })} />

          <div>
            <label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">สารก่อภูมิแพ้</label>
            <div className="flex gap-1.5 flex-wrap">
              {ALLERGEN_LIST.map(a => (
                <button key={a} onClick={() => toggleAllergen(a)}
                  className={cn("px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors",
                    (form.allergens || []).includes(a) ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border text-muted-foreground")}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Diet Tags</label>
            <div className="flex gap-1.5 flex-wrap">
              {DIET_TAG_LIST.map(d => (
                <button key={d} onClick={() => toggleDiet(d)}
                  className={cn("px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors",
                    (form.diet_tags || []).includes(d) ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                  {d} ({DIET_LABELS[d]})
                </button>
              ))}
            </div>
          </div>

          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            บันทึก
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">{label}</label>
      <Input type="number" value={value ?? ""} onChange={e => onChange(e.target.value ? parseFloat(e.target.value) : null)} />
    </div>
  );
}
