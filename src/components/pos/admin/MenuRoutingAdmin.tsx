import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Trash2, Search, FlaskConical } from "lucide-react";

interface Station {
  id: string;
  name: string;
  short_name: string;
  icon: string;
  color: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface Routing {
  id: string;
  category_id: string;
  station_id: string;
  priority: number;
  is_active: boolean;
}

interface Override {
  id: string;
  menu_item_id: string;
  station_id: string;
  menu_item_name?: string;
  category_name?: string;
  default_station_name?: string;
}

interface MenuItem {
  id: string;
  name: string;
  category_id: string | null;
  category_name?: string;
}

export function MenuRoutingAdmin() {
  const [stations, setStations] = useState<Station[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [routings, setRoutings] = useState<Routing[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResults, setTestResults] = useState<Array<{ name: string; station: string | null; via: string }>>([]);
  const [overrideForm, setOverrideForm] = useState({ menu_item_id: "", station_id: "" });
  const [searchItem, setSearchItem] = useState("");
  const { toast } = useToast();

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [s, c, r, o, m] = await Promise.all([
      supabase.from("kitchen_stations").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("menu_categories").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("menu_station_routing").select("*"),
      supabase.from("menu_item_station_override").select("*, menu_items(name, category_id, menu_categories(name))"),
      supabase.from("menu_items").select("id, name, category_id, menu_categories(name)").eq("is_available", true).order("sort_order"),
    ]);
    if (s.data) setStations(s.data as any);
    if (c.data) setCategories(c.data as any);
    if (r.data) setRoutings(r.data as any);
    if (o.data) setOverrides((o.data as any[]).map((x: any) => ({
      id: x.id, menu_item_id: x.menu_item_id, station_id: x.station_id,
      menu_item_name: x.menu_items?.name, category_name: x.menu_items?.menu_categories?.name,
    })));
    if (m.data) setMenuItems((m.data as any[]).map((x: any) => ({
      id: x.id, name: x.name, category_id: x.category_id, category_name: x.menu_categories?.name,
    })));
    setLoading(false);
  }

  function isRouted(categoryId: string, stationId: string) {
    return routings.some(r => r.category_id === categoryId && r.station_id === stationId && r.is_active);
  }

  async function toggleRouting(categoryId: string, stationId: string) {
    const existing = routings.find(r => r.category_id === categoryId && r.station_id === stationId);
    if (existing) {
      await supabase.from("menu_station_routing").delete().eq("id", existing.id);
    } else {
      await supabase.from("menu_station_routing").insert({ category_id: categoryId, station_id: stationId });
    }
    fetchAll();
  }

  async function saveOverride() {
    if (!overrideForm.menu_item_id || !overrideForm.station_id) return;
    await supabase.from("menu_item_station_override").upsert({
      menu_item_id: overrideForm.menu_item_id, station_id: overrideForm.station_id,
    }, { onConflict: "menu_item_id" });
    setShowOverrideModal(false);
    fetchAll();
    toast({ title: "เพิ่ม Override แล้ว" });
  }

  async function deleteOverride(id: string) {
    await supabase.from("menu_item_station_override").delete().eq("id", id);
    fetchAll();
    toast({ title: "ลบ Override แล้ว" });
  }

  function runBulkTest() {
    const results = menuItems.map(item => {
      // Check override first
      const override = overrides.find(o => o.menu_item_id === item.id);
      if (override) {
        const st = stations.find(s => s.id === override.station_id);
        return { name: item.name, station: st ? `${st.icon} ${st.name}` : null, via: "override" };
      }
      // Check category routing
      if (item.category_id) {
        const routing = routings.find(r => r.category_id === item.category_id && r.is_active);
        if (routing) {
          const st = stations.find(s => s.id === routing.station_id);
          return { name: item.name, station: st ? `${st.icon} ${st.name}` : null, via: "category" };
        }
      }
      return { name: item.name, station: null, via: "none" };
    });
    setTestResults(results);
    setShowTestModal(true);
  }

  const getStationName = (id: string) => { const s = stations.find(s => s.id === id); return s ? `${s.icon} ${s.name}` : "-"; };
  const getDefaultStation = (categoryId: string | null) => {
    if (!categoryId) return "-";
    const r = routings.find(r => r.category_id === categoryId && r.is_active);
    return r ? getStationName(r.station_id) : "-";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[15px] font-bold text-foreground">🔀 Routing เมนู</h1>
          <p className="text-[11px] text-muted-foreground">Menu → Station Routing Rules</p>
        </div>
        <button onClick={runBulkTest}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold border border-border text-muted-foreground hover:text-foreground transition-colors">
          <FlaskConical size={14} /> ทดสอบทั้งหมด
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {loading ? (
          <div className="h-40 rounded-2xl bg-muted/60 animate-pulse border border-border" />
        ) : (
          <>
            {/* Routing Matrix */}
            <div>
              <h2 className="text-[13px] font-bold text-foreground mb-3">📊 Routing Matrix</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border border-border rounded-xl overflow-hidden">
                  <thead>
                    <tr>
                      <th className="text-left py-2.5 px-3 bg-muted/50 border-b border-border font-semibold text-muted-foreground">หมวดหมู่</th>
                      {stations.map(s => (
                        <th key={s.id} className="py-2.5 px-3 border-b border-border text-center min-w-[80px]"
                          style={{ backgroundColor: s.color + "15" }}>
                          <div className="text-[14px] mb-0.5">{s.icon}</div>
                          <div className="text-[10px] font-bold" style={{ color: s.color }}>{s.short_name}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {cat.icon && <span className="mr-1">{cat.icon}</span>}{cat.name}
                        </td>
                        {stations.map(s => (
                          <td key={s.id} className="py-2.5 px-3 text-center">
                            <button onClick={() => toggleRouting(cat.id, s.id)}
                              className={cn("w-8 h-8 rounded-lg border-2 flex items-center justify-center text-[14px] transition-all",
                                isRouted(cat.id, s.id)
                                  ? "border-success bg-success/15 text-success shadow-[0_0_8px_hsl(var(--success)/0.2)]"
                                  : "border-border bg-background text-muted-foreground/30 hover:border-primary/50")}>
                              {isRouted(cat.id, s.id) ? "✅" : ""}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Per-item overrides */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-foreground">⚡ Override เฉพาะเมนู</h2>
                <button onClick={() => { setOverrideForm({ menu_item_id: "", station_id: "" }); setShowOverrideModal(true); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-primary text-white hover:opacity-90">
                  <Plus size={12} /> เพิ่ม Override
                </button>
              </div>
              {overrides.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-[12px] border border-dashed border-border rounded-xl">ยังไม่มี override</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 px-3 font-semibold">เมนู</th>
                        <th className="text-left py-2 px-3 font-semibold">หมวด (default)</th>
                        <th className="text-left py-2 px-3 font-semibold">Override → Station</th>
                        <th className="text-right py-2 px-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overrides.map(o => (
                        <tr key={o.id} className="border-b border-border/50">
                          <td className="py-2 px-3 font-semibold text-foreground">{o.menu_item_name}</td>
                          <td className="py-2 px-3 text-muted-foreground">{o.category_name} → {getDefaultStation(menuItems.find(m => m.id === o.menu_item_id)?.category_id || null)}</td>
                          <td className="py-2 px-3 font-bold" style={{ color: stations.find(s => s.id === o.station_id)?.color }}>{getStationName(o.station_id)}</td>
                          <td className="py-2 px-3 text-right">
                            <button onClick={() => deleteOverride(o.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Override Modal */}
      <Dialog open={showOverrideModal} onOpenChange={o => { if (!o) setShowOverrideModal(false); }}>
        <DialogContent className="max-w-sm p-5 rounded-2xl bg-card border-border">
          <h2 className="text-[15px] font-bold text-foreground mb-3">เพิ่ม Override</h2>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">เมนู</label>
              <div className="relative mt-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={searchItem} onChange={e => setSearchItem(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground" placeholder="ค้นหาเมนู..." />
              </div>
              <div className="mt-1 max-h-32 overflow-y-auto border border-border rounded-xl">
                {menuItems.filter(m => !searchItem || m.name.toLowerCase().includes(searchItem.toLowerCase())).slice(0, 20).map(m => (
                  <button key={m.id} onClick={() => { setOverrideForm(p => ({ ...p, menu_item_id: m.id })); setSearchItem(m.name); }}
                    className={cn("w-full text-left px-3 py-1.5 text-[12px] hover:bg-muted/50 transition-colors",
                      overrideForm.menu_item_id === m.id ? "bg-primary/10 text-primary font-bold" : "text-foreground")}>
                    {m.name} <span className="text-muted-foreground text-[10px]">({m.category_name})</span>
                  </button>
                ))}
              </div>
              {overrideForm.menu_item_id && (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  ปกติจะไปที่: {getDefaultStation(menuItems.find(m => m.id === overrideForm.menu_item_id)?.category_id || null)}
                </div>
              )}
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Override → Station</label>
              <select value={overrideForm.station_id} onChange={e => setOverrideForm(p => ({ ...p, station_id: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground">
                <option value="">เลือก Station</option>
                {stations.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowOverrideModal(false)} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border border-border text-muted-foreground">ยกเลิก</button>
            <button onClick={saveOverride} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold bg-primary text-white">บันทึก</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Results Modal */}
      <Dialog open={showTestModal} onOpenChange={o => { if (!o) setShowTestModal(false); }}>
        <DialogContent className="max-w-lg p-5 rounded-2xl bg-card border-border max-h-[80vh] overflow-hidden flex flex-col">
          <h2 className="text-[15px] font-bold text-foreground mb-3">🧪 ทดสอบ Routing ทั้งหมด</h2>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 px-3 font-semibold">เมนู</th>
                  <th className="text-left py-2 px-3 font-semibold">Station</th>
                  <th className="text-left py-2 px-3 font-semibold">Via</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((r, i) => (
                  <tr key={i} className={cn("border-b border-border/50", !r.station && "bg-destructive/5")}>
                    <td className="py-1.5 px-3 text-foreground font-semibold">{r.name}</td>
                    <td className="py-1.5 px-3">{r.station || <span className="text-destructive font-bold">❌ ไม่มี station</span>}</td>
                    <td className="py-1.5 px-3">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold",
                        r.via === "override" ? "bg-warning/10 text-warning" :
                        r.via === "category" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                      )}>{r.via === "override" ? "Override" : r.via === "category" ? "Category" : "None"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            {testResults.filter(r => !r.station).length > 0 && (
              <span className="text-destructive font-bold">⚠️ {testResults.filter(r => !r.station).length} เมนูไม่มี station — จะแสดงบนทุก KDS</span>
            )}
          </div>
          <button onClick={() => setShowTestModal(false)} className="mt-3 w-full py-2.5 rounded-xl text-[13px] font-semibold border border-border text-muted-foreground">ปิด</button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
