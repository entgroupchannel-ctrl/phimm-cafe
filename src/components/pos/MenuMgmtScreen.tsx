import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { POSBadge } from "./POSBadge";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  emoji: string | null;
  description: string | null;
  category_id: string | null;
  is_available: boolean;
  is_popular: boolean;
  calories: number | null;
  allergens: string[] | null;
  diet_tags: string[] | null;
  station: string | null;
  image_url: string | null;
  sort_order: number | null;
  category_name?: string;
  category_icon?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

interface Recipe {
  menu_item_id: string;
  stock_name: string;
  stock_unit: string;
  qty_used: number;
  stock_qty: number;
}

const STATIONS = [
  { id: "wok", label: "เตาผัด" }, { id: "soup", label: "ต้ม/แกง" },
  { id: "grill", label: "ย่าง/นึ่ง" }, { id: "fry", label: "ทอด" },
  { id: "salad", label: "สลัด/ยำ" }, { id: "dessert", label: "ของหวาน" },
  { id: "drinks", label: "เครื่องดื่ม" }, { id: "rice", label: "ข้าว" },
];

const EMOJI_OPTIONS = [
  "🍛","🍜","🍲","🥗","🍗","🍖","🍝","🥘","🫕","🍱",
  "🧋","☕","🍵","🥤","🍹","🍺","🧃","🍶","🥛","🍷",
  "🍰","🧁","🍩","🍨","🍡","🥭","🍮","🍧","🎂","🍫",
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange}
      className={cn("w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 shrink-0",
        on ? "bg-success/20" : "bg-border")}>
      <div className={cn(
        "w-5 h-5 rounded-full absolute top-[2px] transition-all duration-200 shadow-sm",
        on ? "right-[2px] bg-success shadow-[0_0_8px_hsl(var(--success)/0.5)]"
           : "left-[2px] bg-muted-foreground/40"
      )} />
    </div>
  );
}

export function MenuMgmtScreen() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipes, setRecipes] = useState<Record<string, Recipe[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ทั้งหมด");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: "add" | "edit"; item: Partial<MenuItem> } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => { fetchMenu(); fetchCategories(); fetchRecipes(); }, []);

  async function fetchMenu() {
    const { data } = await supabase.from("menu_items").select("*, menu_categories(name, icon)").order("sort_order");
    if (data) {
      setItems(data.map((m: any) => ({
        ...m,
        price: Number(m.price),
        cost: Number(m.cost || 0),
        is_available: m.is_available ?? true,
        is_popular: m.is_popular ?? false,
        category_name: m.menu_categories?.name,
        category_icon: m.menu_categories?.icon,
      })));
    }
    setLoading(false);
  }

  async function fetchCategories() {
    const { data } = await supabase.from("menu_categories").select("*").order("sort_order");
    if (data) setCategories(data as Category[]);
  }

  async function fetchRecipes() {
    const { data } = await supabase.from("stock_recipes").select("*, stock_items(name, unit, qty)");
    if (data) {
      const grouped: Record<string, Recipe[]> = {};
      (data as any[]).forEach(r => {
        if (!grouped[r.menu_item_id]) grouped[r.menu_item_id] = [];
        grouped[r.menu_item_id].push({
          menu_item_id: r.menu_item_id,
          stock_name: r.stock_items?.name || "",
          stock_unit: r.stock_items?.unit || "",
          qty_used: Number(r.qty_used),
          stock_qty: Number(r.stock_items?.qty || 0),
        });
      });
      setRecipes(grouped);
    }
  }

  async function toggleAvailable(itemId: string, current: boolean) {
    await supabase.from("menu_items").update({ is_available: !current }).eq("id", itemId);
    fetchMenu();
  }

  async function togglePopular(itemId: string, current: boolean) {
    await supabase.from("menu_items").update({ is_popular: !current }).eq("id", itemId);
    fetchMenu();
  }

  async function handleSave(data: Partial<MenuItem>) {
    if (data.id) {
      const { id, category_name, category_icon, ...rest } = data as any;
      await supabase.from("menu_items").update(rest).eq("id", id);
      showToast(`บันทึก "${data.name}" เรียบร้อย ✅`);
    } else {
      const { id, category_name, category_icon, ...rest } = data as any;
      await supabase.from("menu_items").insert({ ...rest, price: rest.price || 0 });
      showToast(`เพิ่ม "${data.name}" เรียบร้อย ✅`);
    }
    setModal(null);
    fetchMenu();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from("menu_items").delete().eq("id", deleteTarget.id);
    showToast(`ลบ "${deleteTarget.name}" เรียบร้อย`);
    setDeleteTarget(null);
    fetchMenu();
  }

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.includes(search);
    const matchFilter = activeFilter === "ทั้งหมด" ? true : activeFilter === "เปิดขาย" ? item.is_available : !item.is_available;
    const matchCat = !activeCat || item.category_id === activeCat;
    return matchSearch && matchFilter && matchCat;
  });

  const FILTERS = ["ทั้งหมด", "เปิดขาย", "ปิดขาย"];

  const catCounts = categories.map(c => ({
    ...c,
    count: items.filter(m => m.category_id === c.id).length,
  }));

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide space-y-4 bg-background relative">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up pointer-events-none">
          <div className="bg-card border border-success/30 rounded-xl shadow-card px-4 py-2.5 text-[13px] font-semibold text-foreground">{toast}</div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[18px] font-bold text-foreground">📋 จัดการเมนู</div>
        <button onClick={() => setModal({ mode: "add", item: { name: "", price: 0, cost: 0, emoji: "🍛", is_available: true, is_popular: false, station: "wok" } })}
          className="px-4 py-2.5 rounded-xl gradient-primary text-white text-[13px] font-bold shadow-primary hover:shadow-primary-lg transition-shadow">
          + เพิ่มเมนูใหม่
        </button>
      </div>

      {/* Category cards */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveCat(null)}
          className={cn("shrink-0 flex items-center gap-3 bg-card border rounded-2xl p-4 cursor-pointer transition-all",
            !activeCat ? "border-primary/40 bg-primary/5 shadow-card" : "border-border hover:border-border")}>
          <span className="text-2xl">📋</span>
          <div>
            <div className="text-[13px] font-bold text-foreground">ทั้งหมด</div>
            <div className="text-[11px] text-muted-foreground">{items.length} เมนู</div>
          </div>
        </button>
        {catCounts.map(cat => (
          <button key={cat.id} onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
            className={cn("shrink-0 flex items-center gap-3 bg-card border rounded-2xl p-4 cursor-pointer transition-all",
              activeCat === cat.id ? "border-primary/40 bg-primary/5 shadow-card" : "border-border hover:border-border")}>
            <span className="text-2xl">{cat.icon || "🍽"}</span>
            <div>
              <div className="text-[13px] font-bold text-foreground">{cat.name}</div>
              <div className="text-[11px] text-muted-foreground">{cat.count} เมนู</div>
            </div>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-background rounded-xl border border-border focus-within:border-primary/40">
            <span className="text-muted-foreground">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาเมนู..."
              className="bg-transparent text-[13px] outline-none flex-1 text-foreground placeholder:text-muted-foreground" />
            {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground text-xs">✕</button>}
          </div>
          <div className="flex gap-1.5">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={cn("px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors",
                  activeFilter === f ? "border-primary/40 bg-primary/8 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                {f}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-muted-foreground shrink-0">{filtered.length} รายการ</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-[13px]">
            <div className="text-3xl mb-2 opacity-30">🍽</div>ไม่พบเมนูที่ค้นหา
          </div>
        ) : (
          <div className="divide-y divide-border/40 px-5">
            {filtered.map(item => {
              const margin = item.price > 0 && item.cost > 0 ? Math.round((item.price - item.cost) / item.price * 100) : null;
              const itemRecipes = recipes[item.id];
              return (
                <div key={item.id}
                  className={cn("flex items-center gap-4 py-3.5 hover:bg-muted/20 -mx-5 px-5 transition-colors", !item.is_available && "opacity-55")}>
                  <span className="text-[30px]">{item.emoji || "🍽"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-bold text-foreground">{item.name}</span>
                      {item.is_popular && <POSBadge color="warning">🔥 ยอดนิยม</POSBadge>}
                      {!item.is_available && <POSBadge color="muted">ปิดขาย</POSBadge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.category_name || "ไม่มีหมวด"}
                      {item.station && <span className="ml-2">· สเตชั่น: {STATIONS.find(s => s.id === item.station)?.label || item.station}</span>}
                    </div>
                    {itemRecipes && itemRecipes.length > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        ใช้: {itemRecipes.map(r => (
                          <span key={r.stock_name} className={cn("mr-2", r.stock_qty < r.qty_used ? "text-danger font-bold" : "")}>
                            {r.stock_name} {r.qty_used}{r.stock_unit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right mr-3 shrink-0">
                    <div className="font-mono text-[15px] font-extrabold text-accent tabular-nums">฿{item.price}</div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[11px] text-muted-foreground">ต้นทุน ฿{item.cost}</span>
                      {margin !== null && (
                        <span className={cn("text-[10px] font-bold font-mono",
                          margin >= 60 ? "text-success" : margin >= 40 ? "text-warning" : "text-danger"
                        )}>
                          {margin}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mr-2 shrink-0">
                    <Toggle on={item.is_available} onChange={() => toggleAvailable(item.id, item.is_available)} />
                    <span className={cn("text-[11px] font-semibold w-9", item.is_available ? "text-success" : "text-muted-foreground/60")}>
                      {item.is_available ? "เปิด" : "ปิด"}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => setModal({ mode: "edit", item: { ...item } })}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground text-[12px] hover:text-foreground hover:border-border transition-colors">
                      ✏️ แก้ไข
                    </button>
                    <button onClick={() => setDeleteTarget(item)}
                      className="px-3 py-1.5 rounded-lg border border-danger/25 bg-danger/6 text-danger text-[12px] hover:bg-danger/12 transition-colors">
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit/Add Modal */}
      {modal && (
        <MenuItemModal
          mode={modal.mode}
          initial={modal.item}
          categories={categories}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-card w-[340px] p-6 text-center">
            <div className="text-[30px] mb-3">🗑</div>
            <div className="text-[15px] font-bold text-foreground mb-1">ลบเมนูนี้?</div>
            <div className="text-[13px] text-muted-foreground mb-5">
              <span className="font-semibold text-foreground">"{deleteTarget.name}"</span> จะถูกลบออกจากระบบถาวร
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-border bg-muted text-muted-foreground text-[13px] font-medium hover:text-foreground">
                ยกเลิก
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl border border-danger/30 bg-danger/10 text-danger text-[13px] font-bold hover:bg-danger/20">
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Menu Item Modal ───────────────────────────────────────
function MenuItemModal({ mode, initial, categories, onSave, onClose }: {
  mode: "add" | "edit";
  initial: Partial<MenuItem>;
  categories: Category[];
  onSave: (item: Partial<MenuItem>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showEmoji, setShowEmoji] = useState(false);

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = "กรุณาใส่ชื่อเมนู";
    if (!form.price || form.price <= 0) e.price = "กรุณาใส่ราคาที่ถูกต้อง";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl shadow-card w-[520px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <div className="h-1 gradient-primary" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <div className="text-[15px] font-bold text-foreground">
              {mode === "add" ? "✨ เพิ่มเมนูใหม่" : "✏️ แก้ไขเมนู"}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-sm">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Emoji + Name */}
          <div className="flex gap-3">
            <div className="relative shrink-0">
              <button onClick={() => setShowEmoji(!showEmoji)}
                className="w-14 h-14 rounded-xl border border-border bg-background text-[32px] flex items-center justify-center hover:border-primary/40">
                {form.emoji || "🍛"}
              </button>
              {showEmoji && (
                <div className="absolute left-0 top-[60px] z-20 bg-card border border-border rounded-xl shadow-card p-2 grid grid-cols-5 gap-1 w-[200px]">
                  {EMOJI_OPTIONS.map(e => (
                    <button key={e} onClick={() => { set("emoji", e); setShowEmoji(false); }}
                      className={cn("text-[22px] p-1.5 rounded-lg hover:bg-muted", form.emoji === e && "bg-primary/10 ring-1 ring-primary/40")}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">ชื่อเมนู *</label>
              <input value={form.name || ""} onChange={e => set("name", e.target.value)}
                className={cn("w-full px-3.5 py-2.5 rounded-xl border bg-background text-[13px] text-foreground outline-none",
                  errors.name ? "border-danger/50" : "border-border focus:border-primary/50")} />
              {errors.name && <p className="text-[11px] text-danger mt-1">{errors.name}</p>}
            </div>
          </div>

          {/* Price + Cost + Category */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">ราคาขาย (฿) *</label>
              <input type="number" value={form.price || ""} onChange={e => set("price", Number(e.target.value))}
                className={cn("w-full px-3.5 py-2.5 rounded-xl border bg-background text-[13px] font-mono outline-none",
                  errors.price ? "border-danger/50" : "border-border focus:border-primary/50")} />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">ต้นทุน (฿)</label>
              <input type="number" value={form.cost || ""} onChange={e => set("cost", Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13px] font-mono outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">หมวดหมู่</label>
              <select value={form.category_id || ""} onChange={e => set("category_id", e.target.value || null)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13px] outline-none focus:border-primary/50 cursor-pointer">
                <option value="">ไม่มีหมวด</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon || ""} {c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Station + Calories */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">สเตชั่น</label>
              <select value={form.station || "wok"} onChange={e => set("station", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13px] outline-none focus:border-primary/50 cursor-pointer">
                {STATIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">แคลอรี่</label>
              <input type="number" value={form.calories || ""} onChange={e => set("calories", e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13px] font-mono outline-none focus:border-primary/50"
                placeholder="kcal" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">รายละเอียด</label>
            <textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13px] outline-none focus:border-primary/50 resize-none"
              placeholder="รายละเอียดเมนู (ถ้ามี)" />
          </div>

          {/* Margin hint */}
          {(form.price || 0) > 0 && (form.cost || 0) > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-background border border-border text-[12px] text-muted-foreground">
              <span>💡</span>
              <span>
                กำไร: <span className="font-mono font-bold text-success">฿{(form.price || 0) - (form.cost || 0)}</span>
                {" · "}Margin: <span className={cn("font-mono font-bold",
                  ((form.price! - form.cost!) / form.price! * 100) >= 60 ? "text-success" :
                  ((form.price! - form.cost!) / form.price! * 100) >= 40 ? "text-warning" : "text-danger"
                )}>
                  {Math.round((form.price! - form.cost!) / form.price! * 100)}%
                </span>
              </span>
            </div>
          )}

          {/* Toggles */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-[13px] font-semibold text-foreground">เปิดขาย</div>
                <div className="text-[11px] text-muted-foreground">แสดงในหน้าออเดอร์</div>
              </div>
              <Toggle on={form.is_available ?? true} onChange={() => set("is_available", !(form.is_available ?? true))} />
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-[13px] font-semibold text-foreground">เมนูยอดนิยม 🔥</div>
                <div className="text-[11px] text-muted-foreground">แสดง badge HOT</div>
              </div>
              <Toggle on={form.is_popular ?? false} onChange={() => set("is_popular", !(form.is_popular ?? false))} />
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border bg-muted text-muted-foreground text-[13px] font-medium hover:text-foreground">
            ยกเลิก
          </button>
          <button onClick={() => { if (validate()) onSave(form); }}
            className="flex-1 py-3 rounded-xl gradient-primary text-white text-[13px] font-bold shadow-primary hover:shadow-primary-lg">
            {mode === "add" ? "✨ เพิ่มเมนู" : "💾 บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
