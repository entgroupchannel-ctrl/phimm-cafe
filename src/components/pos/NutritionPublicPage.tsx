import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Search, ChevronDown, ChevronUp, Share2, Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";

interface MenuItem {
  id: string; name: string; emoji: string | null; price: number;
  calories: number | null; protein_g: number | null; carbs_g: number | null;
  fat_g: number | null; fiber_g: number | null; sodium_mg: number | null;
  sugar_g: number | null; saturated_fat_g: number | null; cholesterol_mg: number | null;
  health_score: number | null; allergens: string[] | null; diet_tags: string[] | null;
  serving_size: string | null; serving_unit: string | null;
  ingredients_detail: any[] | null;
  category_name: string; category_icon: string | null;
}
interface AllergenType { id: string; name_th: string; name_en: string; icon: string; }
interface DietTagType { id: string; name_th: string; name_en: string; short_code: string; icon: string; color: string; }

export function NutritionPublicPage() {
  const [params] = useSearchParams();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [allergenTypes, setAllergenTypes] = useState<AllergenType[]>([]);
  const [dietTagTypes, setDietTagTypes] = useState<DietTagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("ทั้งหมด");
  const [allergenFilter, setAllergenFilter] = useState<string[]>([]);
  const [dietFilter, setDietFilter] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(params.get("item"));

  useEffect(() => {
    document.title = "Phimm Cafe — เมนูและข้อมูลโภชนาการ";
    fetchData();
  }, []);

  async function fetchData() {
    const [menuRes, allergenRes, dietRes] = await Promise.all([
      supabase.from("menu_items")
        .select("*, menu_categories(name, icon)")
        .eq("is_available", true)
        .eq("nutrition_published", true)
        .order("sort_order"),
      supabase.from("allergen_types").select("*").order("sort_order"),
      supabase.from("diet_tag_types").select("*").order("sort_order"),
    ]);
    if (menuRes.data) {
      setItems(menuRes.data.map((d: any) => ({
        ...d, price: Number(d.price),
        category_name: d.menu_categories?.name || "อื่นๆ",
        category_icon: d.menu_categories?.icon || null,
      })));
    }
    if (allergenRes.data) setAllergenTypes(allergenRes.data as any);
    if (dietRes.data) setDietTagTypes(dietRes.data as any);
    setLoading(false);
  }

  const categories = useMemo(() => {
    const cats = [...new Set(items.map(i => i.category_name))];
    return ["ทั้งหมด", ...cats];
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (activeCat !== "ทั้งหมด") list = list.filter(i => i.category_name === activeCat);
    if (search) list = list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    if (allergenFilter.length > 0) list = list.filter(i => !i.allergens?.some(a => allergenFilter.includes(a)));
    if (dietFilter.length > 0) list = list.filter(i => i.diet_tags?.some(t => dietFilter.includes(t)));
    return list;
  }, [items, activeCat, search, allergenFilter, dietFilter]);

  function allergenIcon(name: string) { return allergenTypes.find(a => a.name_th === name)?.icon || "⚠️"; }
  function dietInfo(code: string) { return dietTagTypes.find(d => d.short_code === code || d.name_th === code); }

  function shareItem(id: string) {
    const url = `${window.location.origin}/menu/nutrition?item=${id}`;
    navigator.clipboard.writeText(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFFBF5" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#C8956C" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#FFFBF5", fontFamily: "'Sarabun', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md border-b" style={{ background: "rgba(255,251,245,0.95)", borderColor: "#E8DDD0" }}>
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[28px]">☕</span>
            <div>
              <h1 className="text-[18px] font-bold" style={{ color: "#3D2E1F" }}>Phimm Cafe</h1>
              <p className="text-[12px] font-medium" style={{ color: "#9B8A78" }}>เมนูและข้อมูลโภชนาการ</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9B8A78" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาเมนู..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border text-[13px]"
              style={{ background: "#FFF8F0", borderColor: "#E8DDD0", color: "#3D2E1F" }} />
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {categories.map(c => (
              <button key={c} onClick={() => setActiveCat(c)}
                className="shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
                style={activeCat === c
                  ? { background: "#C8956C", color: "#FFF", borderColor: "#C8956C" }
                  : { background: "#FFF8F0", color: "#9B8A78", borderColor: "#E8DDD0" }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-5xl mx-auto px-4 py-3 space-y-2">
        {/* Allergen filter */}
        <div className="p-3 rounded-xl border" style={{ background: "#FFF8F0", borderColor: "#E8DDD0" }}>
          <div className="text-[11px] font-semibold mb-2" style={{ color: "#9B8A78" }}>⚠️ ฉันแพ้... (ซ่อนเมนูที่มี)</div>
          <div className="flex gap-1.5 flex-wrap">
            {allergenTypes.map(a => {
              const on = allergenFilter.includes(a.name_th);
              return (
                <button key={a.id} onClick={() => setAllergenFilter(prev => on ? prev.filter(x => x !== a.name_th) : [...prev, a.name_th])}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all"
                  style={on
                    ? { background: "#FEE2E2", color: "#DC2626", borderColor: "#FECACA" }
                    : { background: "#FFF", color: "#9B8A78", borderColor: "#E8DDD0" }}>
                  {on ? "🚫 " : ""}{a.icon} {a.name_th}
                </button>
              );
            })}
          </div>
        </div>

        {/* Diet filter */}
        <div className="p-3 rounded-xl border" style={{ background: "#FFF8F0", borderColor: "#E8DDD0" }}>
          <div className="text-[11px] font-semibold mb-2" style={{ color: "#9B8A78" }}>🏷 อาหารสำหรับ...</div>
          <div className="flex gap-1.5 flex-wrap">
            {dietTagTypes.map(d => {
              const on = dietFilter.includes(d.short_code);
              return (
                <button key={d.id} onClick={() => setDietFilter(prev => on ? prev.filter(x => x !== d.short_code) : [...prev, d.short_code])}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all"
                  style={on
                    ? { background: `${d.color}15`, color: d.color, borderColor: `${d.color}40` }
                    : { background: "#FFF", color: "#9B8A78", borderColor: "#E8DDD0" }}>
                  {d.icon} {d.name_th}
                </button>
              );
            })}
          </div>
        </div>

        {allergenFilter.length > 0 && (
          <div className="text-[12px] font-semibold" style={{ color: "#C8956C" }}>
            🛡️ แสดง {filtered.length}/{items.length} เมนูที่ปลอดภัย
          </div>
        )}
      </div>

      {/* Menu Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-8">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {filtered.map(item => {
            const expanded = expandedId === item.id;
            return (
              <div key={item.id} className="rounded-2xl border overflow-hidden transition-all"
                style={{ background: "#FFF", borderColor: expanded ? "#C8956C" : "#E8DDD0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                {/* Card header */}
                <button className="w-full text-left p-4" onClick={() => setExpandedId(expanded ? null : item.id)}>
                  <div className="flex items-start gap-3">
                    <span className="text-[32px] shrink-0">{item.emoji || "🍽"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold" style={{ color: "#3D2E1F" }}>{item.name}</div>
                      <div className="text-[12px]" style={{ color: "#9B8A78" }}>{item.category_name}</div>
                      <div className="font-mono text-[16px] font-bold mt-0.5" style={{ color: "#C8956C" }}>
                        ฿{item.price.toLocaleString()}
                      </div>
                    </div>
                    {expanded ? <ChevronUp size={16} style={{ color: "#9B8A78" }} /> : <ChevronDown size={16} style={{ color: "#9B8A78" }} />}
                  </div>

                  {/* Badges */}
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {item.calories ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          background: item.calories < 300 ? "#DCFCE7" : item.calories <= 500 ? "#FEF3C7" : "#FEE2E2",
                          color: item.calories < 300 ? "#16A34A" : item.calories <= 500 ? "#D97706" : "#DC2626",
                        }}>
                        🔥 {item.calories} cal
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "#F5F0EB", color: "#9B8A78" }}>
                        ข้อมูลอยู่ระหว่างจัดทำ
                      </span>
                    )}
                    {item.health_score !== null && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
                        style={{ background: "#F0FDF4", color: "#16A34A" }}>
                        <span className={cn("w-1.5 h-1.5 rounded-full inline-block",
                          item.health_score >= 70 ? "bg-green-500" : item.health_score >= 40 ? "bg-amber-500" : "bg-red-500")} />
                        Score {item.health_score}
                      </span>
                    )}
                  </div>

                  {/* Macro bars */}
                  {(item.protein_g || item.carbs_g || item.fat_g) && (
                    <div className="space-y-1 mt-2">
                      {[
                        { l: "P", v: item.protein_g, c: "#3B82F6" },
                        { l: "C", v: item.carbs_g, c: "#F59E0B" },
                        { l: "F", v: item.fat_g, c: "#EF4444" },
                      ].map(m => m.v ? (
                        <div key={m.l} className="flex items-center gap-2 text-[10px]">
                          <span className="w-3 font-bold" style={{ color: "#9B8A78" }}>{m.l}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#F5F0EB" }}>
                            <div className="h-full rounded-full" style={{ background: m.c, width: `${Math.min(100, ((m.v || 0) / 50) * 100)}%` }} />
                          </div>
                          <span className="font-mono w-6 text-right tabular-nums" style={{ color: "#9B8A78" }}>{m.v}g</span>
                        </div>
                      ) : null)}
                    </div>
                  )}

                  {/* Allergen + diet pills */}
                  {(item.allergens?.length ?? 0) > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {item.allergens!.map(a => (
                        <span key={a} className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{ background: "#FEE2E2", color: "#DC2626" }}>
                          {allergenIcon(a)} {a}
                        </span>
                      ))}
                    </div>
                  )}
                  {(item.diet_tags?.length ?? 0) > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {item.diet_tags!.map(t => {
                        const di = dietInfo(t);
                        return (
                          <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                            style={{ background: `${di?.color || '#888'}15`, color: di?.color || '#888' }}>
                            {di?.icon} {di?.short_code || t}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t px-4 py-4 space-y-3" style={{ borderColor: "#E8DDD0", background: "#FFFDF9" }}>
                    {/* Full macro table */}
                    <div className="grid grid-cols-3 gap-2 text-center">
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
                        <div key={m.l} className="rounded-xl p-2" style={{ background: "#FFF8F0" }}>
                          <div className="text-[10px] font-medium" style={{ color: "#9B8A78" }}>{m.l}</div>
                          <div className="font-mono text-[14px] font-bold" style={{ color: "#3D2E1F" }}>
                            {m.v !== null && m.v !== undefined ? `${m.v}${m.u}` : "—"}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Serving info */}
                    {item.serving_size && (
                      <div className="text-[11px] text-center" style={{ color: "#9B8A78" }}>
                        📏 ขนาดเสิร์ฟ: {item.serving_size} {item.serving_unit || ""}
                      </div>
                    )}

                    {/* Ingredients */}
                    {item.ingredients_detail && item.ingredients_detail.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold mb-1" style={{ color: "#3D2E1F" }}>🥬 ส่วนผสม</div>
                        <div className="flex gap-1.5 flex-wrap">
                          {item.ingredients_detail.map((ing: any, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded-lg text-[10px] font-medium"
                              style={{ background: "#F5F0EB", color: "#6B5B4D" }}>
                              {ing.name}{ing.organic ? " 🌿" : ""}{ing.local ? " 📍" : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Allergen warning */}
                    {(item.allergens?.length ?? 0) > 0 && (
                      <div className="rounded-xl p-3" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                        <div className="text-[11px] font-bold" style={{ color: "#DC2626" }}>
                          ⚠️ สารก่อภูมิแพ้: {item.allergens!.join(", ")}
                        </div>
                      </div>
                    )}

                    {/* Share */}
                    <button onClick={() => shareItem(item.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold border transition-all"
                      style={{ borderColor: "#E8DDD0", color: "#9B8A78" }}>
                      <Share2 size={12} /> แชร์เมนูนี้
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: "#9B8A78" }}>
            <div className="text-[40px] mb-2 opacity-30">🔍</div>
            <div className="text-[14px] font-medium">ไม่พบเมนูที่ตรงกับเงื่อนไข</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t py-6 text-center" style={{ borderColor: "#E8DDD0" }}>
        <div className="text-[11px]" style={{ color: "#9B8A78" }}>
          ⚠️ ข้อมูลโภชนาการเป็นค่าประมาณ อาจแตกต่างตามขนาดเสิร์ฟจริง
        </div>
        <div className="text-[10px] mt-1" style={{ color: "#C4B5A5" }}>
          Powered by Phimm Cafe POS ☕
        </div>
      </footer>
    </div>
  );
}
