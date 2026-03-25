import { useState } from "react";
import { menuItems as INIT_ITEMS } from "@/data/pos-data";
import { POSBadge } from "./POSBadge";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  cat: string;
  img: string;
  popular: boolean;
  available: boolean;
}

const CATEGORIES = ["อาหารจานเดียว", "เครื่องดื่ม", "ของหวาน"];
const FILTERS     = ["ทั้งหมด", "เปิดขาย", "ปิดขาย"];

const EMOJI_OPTIONS = [
  "🍛","🍜","🍲","🥗","🍗","🍖","🍝","🥘","🫕","🍱",
  "🧋","☕","🍵","🥤","🍹","🍺","🧃","🍶","🥛","🍷",
  "🍰","🧁","🍩","🍨","🍡","🥭","🍮","🍧","🎂","🍫",
];

const EMPTY_ITEM: Omit<MenuItem, "id"> = {
  name: "", price: 0, cat: "อาหารจานเดียว",
  img: "🍛", popular: false, available: true,
};

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

interface ModalProps {
  mode: "add" | "edit";
  initial: Omit<MenuItem, "id"> & { id?: number };
  onSave: (item: Omit<MenuItem, "id"> & { id?: number }) => void;
  onClose: () => void;
}

function MenuItemModal({ mode, initial, onSave, onClose }: ModalProps) {
  const [form, setForm]     = useState({ ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showEmoji, setShowEmoji] = useState(false);

  const set = (key: keyof typeof form, val: unknown) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())              e.name  = "กรุณาใส่ชื่อเมนู";
    if (!form.price || form.price <= 0) e.price = "กรุณาใส่ราคาที่ถูกต้อง";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl shadow-card w-[480px] max-w-[95vw] overflow-hidden animate-slide-up">
        <div className="h-1 gradient-primary" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <div className="text-[15px] font-bold text-foreground">
              {mode === "add" ? "✨ เพิ่มเมนูใหม่" : "✏️ แก้ไขเมนู"}
            </div>
            <div className="text-[12px] text-muted-foreground mt-0.5">
              {mode === "add" ? "กรอกข้อมูลเมนูที่ต้องการเพิ่ม" : `แก้ไขข้อมูล: ${initial.name}`}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border-light transition-colors text-sm">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Emoji + Name */}
          <div className="flex gap-3">
            <div className="relative shrink-0">
              <button onClick={() => setShowEmoji(!showEmoji)}
                className="w-14 h-14 rounded-xl border border-border bg-surface-alt text-[32px] flex items-center justify-center hover:border-primary/40 transition-colors"
                title="เลือก Emoji">
                {form.img}
              </button>
              {showEmoji && (
                <div className="absolute left-0 top-[60px] z-20 bg-card border border-border rounded-xl shadow-card p-2 grid grid-cols-5 gap-1 w-[200px] animate-fade-in">
                  {EMOJI_OPTIONS.map((e) => (
                    <button key={e} onClick={() => { set("img", e); setShowEmoji(false); }}
                      className={cn("text-[22px] p-1.5 rounded-lg hover:bg-surface-alt transition-colors",
                        form.img === e && "bg-primary/10 ring-1 ring-primary/40")}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">
                ชื่อเมนู <span className="text-danger">*</span>
              </label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="เช่น ข้าวผัดกุ้ง"
                className={cn("w-full px-3.5 py-2.5 rounded-xl border bg-surface-alt text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors",
                  errors.name ? "border-danger/50" : "border-border focus:border-primary/50")} />
              {errors.name && <p className="text-[11px] text-danger mt-1">{errors.name}</p>}
            </div>
          </div>

          {/* Price + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">
                ราคาขาย (฿) <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-[13px]">฿</span>
                <input type="number" min={0} value={form.price || ""}
                  onChange={(e) => set("price", Number(e.target.value))} placeholder="0"
                  className={cn("w-full pl-7 pr-3 py-2.5 rounded-xl border bg-surface-alt text-[13px] font-mono text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors tabular-nums",
                    errors.price ? "border-danger/50" : "border-border focus:border-primary/50")} />
              </div>
              {errors.price && <p className="text-[11px] text-danger mt-1">{errors.price}</p>}
            </div>
            <div>
              <label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">หมวดหมู่</label>
              <select value={form.cat} onChange={(e) => set("cat", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-alt text-[13px] text-foreground outline-none focus:border-primary/50 transition-colors cursor-pointer">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Profit hint */}
          {form.price > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-alt border border-border text-[12px] text-muted-foreground">
              <span>💡</span>
              <span>ต้นทุนแนะนำ: <span className="font-mono font-bold text-accent">฿{Math.round(form.price * 0.35)}</span> · กำไรประมาณ: <span className="font-mono font-bold text-success">฿{Math.round(form.price * 0.65)}</span></span>
            </div>
          )}

          {/* Toggles */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-surface-alt/40">
              <div>
                <div className="text-[13px] font-semibold text-foreground">เปิดขาย</div>
                <div className="text-[11px] text-muted-foreground">แสดงในหน้าออเดอร์และรับออเดอร์ได้</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[12px] font-semibold", form.available ? "text-success" : "text-muted-foreground/60")}>
                  {form.available ? "เปิด" : "ปิด"}
                </span>
                <Toggle on={form.available} onChange={() => set("available", !form.available)} />
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between px-4 py-3 bg-surface-alt/40">
              <div>
                <div className="text-[13px] font-semibold text-foreground">เมนูยอดนิยม 🔥</div>
                <div className="text-[11px] text-muted-foreground">แสดง badge "HOT" และปรากฏในหมวดยอดนิยม</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[12px] font-semibold", form.popular ? "text-warning" : "text-muted-foreground/60")}>
                  {form.popular ? "ใช่" : "ไม่"}
                </span>
                <Toggle on={form.popular} onChange={() => set("popular", !form.popular)} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border bg-muted text-muted-foreground text-[13px] font-medium hover:text-foreground hover:border-border-light transition-colors">
            ยกเลิก
          </button>
          <button onClick={() => { if (validate()) onSave(form); }}
            className="flex-1 py-3 rounded-xl gradient-primary text-white text-[13px] font-bold shadow-primary hover:shadow-primary-lg transition-shadow">
            {mode === "add" ? "✨ เพิ่มเมนู" : "💾 บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="bg-card border border-border rounded-2xl shadow-card w-[340px] p-6 text-center animate-slide-up">
        <div className="text-[30px] mb-3">🗑</div>
        <div className="text-[15px] font-bold text-foreground mb-1">ลบเมนูนี้?</div>
        <div className="text-[13px] text-muted-foreground mb-5">
          <span className="font-semibold text-foreground">"{name}"</span> จะถูกลบออกจากระบบถาวร
        </div>
        <div className="flex gap-2.5">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border bg-muted text-muted-foreground text-[13px] font-medium hover:text-foreground transition-colors">
            ยกเลิก
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl border border-danger/30 bg-danger/10 text-danger text-[13px] font-bold hover:bg-danger/20 transition-colors">
            ลบ
          </button>
        </div>
      </div>
    </div>
  );
}

const CAT_ICONS: Record<string, string> = {
  "อาหารจานเดียว": "🍛", "เครื่องดื่ม": "🧋", "ของหวาน": "🍡",
};

export function MenuMgmtScreen() {
  const [items, setItems] = useState<MenuItem[]>(
    INIT_ITEMS.map((m) => ({ ...m, available: true }))
  );
  const [activeFilter, setActiveFilter] = useState("ทั้งหมด");
  const [search, setSearch]             = useState("");
  const [modal, setModal]               = useState<{ mode: "add" | "edit"; item: Omit<MenuItem,"id"> & { id?: number } } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [toast, setToast]               = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const filtered = items.filter((item) => {
    const matchSearch = !search || item.name.includes(search);
    const matchFilter =
      activeFilter === "ทั้งหมด" ? true :
      activeFilter === "เปิดขาย" ? item.available : !item.available;
    return matchSearch && matchFilter;
  });

  const handleSave = (data: Omit<MenuItem, "id"> & { id?: number }) => {
    if (data.id) {
      setItems((prev) => prev.map((m) => m.id === data.id ? { ...m, ...data, id: m.id } : m));
      showToast(`บันทึก "${data.name}" เรียบร้อย ✅`);
    } else {
      const newId = Math.max(...items.map((m) => m.id)) + 1;
      setItems((prev) => [...prev, { ...data, id: newId } as MenuItem]);
      showToast(`เพิ่ม "${data.name}" เรียบร้อย ✅`);
    }
    setModal(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    showToast(`ลบ "${deleteTarget.name}" เรียบร้อย`);
    setItems((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const toggleAvailable = (id: number) =>
    setItems((prev) => prev.map((m) => m.id === id ? { ...m, available: !m.available } : m));

  const catCounts = CATEGORIES.map((c) => ({
    name: c, icon: CAT_ICONS[c] ?? "🍽",
    count: items.filter((m) => m.cat === c).length,
  }));

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide space-y-4 bg-background relative">

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up pointer-events-none">
          <div className="bg-card border border-success/30 rounded-xl shadow-card px-4 py-2.5 text-[13px] font-semibold text-foreground">
            {toast}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[18px] font-bold text-foreground">📋 จัดการเมนู</div>
        <div className="flex gap-2.5">
          <button className="px-4 py-2.5 rounded-xl border border-border bg-card text-muted-foreground text-[13px] font-medium hover:border-border-light hover:text-foreground transition-colors shadow-card">
            📁 หมวดหมู่
          </button>
          <button onClick={() => setModal({ mode: "add", item: { ...EMPTY_ITEM } })}
            className="px-4 py-2.5 rounded-xl gradient-primary text-white text-[13px] font-bold shadow-primary hover:shadow-primary-lg transition-shadow">
            + เพิ่มเมนูใหม่
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        {catCounts.map((cat) => (
          <div key={cat.name} className="flex-1 flex items-center gap-3 bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-border-light hover:shadow-card-hover shadow-card transition-all">
            <span className="text-3xl">{cat.icon}</span>
            <div>
              <div className="text-[14px] font-bold text-foreground">{cat.name}</div>
              <div className="text-[12px] text-muted-foreground">{cat.count} เมนู</div>
            </div>
          </div>
        ))}
        <div onClick={() => setModal({ mode: "add", item: { ...EMPTY_ITEM } })}
          className="flex items-center justify-center bg-card border-2 border-dashed border-border rounded-2xl p-4 px-6 cursor-pointer text-muted-foreground hover:border-primary/40 hover:text-primary text-[13px] font-medium transition-colors">
          + เพิ่มหมวดหมู่
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface-alt/40">
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-card rounded-xl border border-border focus-within:border-primary/40 transition-colors">
            <span className="text-muted-foreground">🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาเมนู..."
              className="bg-transparent text-[13px] outline-none flex-1 text-foreground placeholder:text-muted-foreground" />
            {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground text-xs">✕</button>}
          </div>
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={cn("px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors",
                  activeFilter === f ? "border-primary/40 bg-primary/8 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-border-light")}>
                {f}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-muted-foreground shrink-0">{filtered.length} รายการ</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-[13px]">
            <div className="text-3xl mb-2 opacity-30">🍽</div>ไม่พบเมนูที่ค้นหา
          </div>
        ) : (
          <div className="divide-y divide-border/40 px-5">
            {filtered.map((item) => (
              <div key={item.id}
                className={cn("flex items-center gap-4 py-3.5 hover:bg-surface-alt/30 -mx-5 px-5 transition-colors", !item.available && "opacity-55")}>
                <span className="text-[30px]">{item.img}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold text-foreground">{item.name}</span>
                    {item.popular && <POSBadge color="warning">ยอดนิยม</POSBadge>}
                    {!item.available && <POSBadge color="muted">ปิดขาย</POSBadge>}
                  </div>
                  <div className="text-[12px] text-muted-foreground">{item.cat}</div>
                </div>
                <div className="text-right mr-3 shrink-0">
                  <div className="font-mono text-[15px] font-extrabold text-accent tabular-nums">฿{item.price}</div>
                  <div className="text-[11px] text-muted-foreground">ต้นทุน ฿{Math.round(item.price * 0.35)}</div>
                </div>
                <div className="flex items-center gap-2 mr-2 shrink-0">
                  <Toggle on={item.available} onChange={() => toggleAvailable(item.id)} />
                  <span className={cn("text-[11px] font-semibold w-9", item.available ? "text-success" : "text-muted-foreground/60")}>
                    {item.available ? "เปิด" : "ปิด"}
                  </span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setModal({ mode: "edit", item: { ...item } })}
                    className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground text-[12px] hover:text-foreground hover:border-border-light transition-colors">
                    ✏️ แก้ไข
                  </button>
                  <button onClick={() => setDeleteTarget(item)}
                    className="px-3 py-1.5 rounded-lg border border-danger/25 bg-danger/6 text-danger text-[12px] hover:bg-danger/12 transition-colors">
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && <MenuItemModal mode={modal.mode} initial={modal.item} onSave={handleSave} onClose={() => setModal(null)} />}
      {deleteTarget && <DeleteConfirm name={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
