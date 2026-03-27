import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical, LayoutGrid, Map } from "lucide-react";

interface Zone {
  id: string;
  name: string;
  color: string;
  floor: number;
  sort_order: number;
  is_active: boolean;
}

interface TableRow {
  id: string;
  label: string;
  zone_id: string | null;
  zone: string | null;
  seats: number;
  shape: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  is_active: boolean;
  status: string;
  sort_order: number;
}

export function TableLayoutAdmin() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "floor">("grid");
  const [editTable, setEditTable] = useState<TableRow | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editZone, setEditZone] = useState<Zone | null>(null);
  const { toast } = useToast();

  // Form state
  const [form, setForm] = useState({
    label: "", zone_id: "", seats: 4, shape: "square", pos_x: 0, pos_y: 0, is_active: true
  });
  const [zoneForm, setZoneForm] = useState({ name: "", color: "#4338CA" });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [z, t] = await Promise.all([
      supabase.from("table_zones").select("*").order("sort_order"),
      supabase.from("tables").select("*").order("sort_order"),
    ]);
    if (z.data) setZones(z.data as any);
    if (t.data) setTables(t.data as any);
    setLoading(false);
  }

  // Zone CRUD
  async function saveZone() {
    if (!zoneForm.name.trim()) return;
    if (editZone) {
      await supabase.from("table_zones").update({ name: zoneForm.name, color: zoneForm.color }).eq("id", editZone.id);
    } else {
      await supabase.from("table_zones").insert({ name: zoneForm.name, color: zoneForm.color, sort_order: zones.length });
    }
    setShowZoneModal(false);
    setEditZone(null);
    setZoneForm({ name: "", color: "#4338CA" });
    fetchAll();
    toast({ title: editZone ? "อัปเดตโซนแล้ว" : "เพิ่มโซนแล้ว" });
  }

  async function deleteZone(zoneId: string) {
    const count = tables.filter(t => t.zone_id === zoneId).length;
    if (count > 0) { toast({ title: "ไม่สามารถลบได้", description: `มีโต๊ะ ${count} ตัวในโซนนี้`, variant: "destructive" }); return; }
    await supabase.from("table_zones").delete().eq("id", zoneId);
    fetchAll();
    toast({ title: "ลบโซนแล้ว" });
  }

  // Table CRUD
  function openAddTable() {
    setEditTable(null);
    setForm({ label: "", zone_id: zones[0]?.id || "", seats: 4, shape: "square", pos_x: 0, pos_y: 0, is_active: true });
    setShowTableModal(true);
  }
  function openEditTable(t: TableRow) {
    setEditTable(t);
    setForm({ label: t.label, zone_id: t.zone_id || "", seats: t.seats, shape: t.shape || "square", pos_x: t.pos_x, pos_y: t.pos_y, is_active: t.is_active });
    setShowTableModal(true);
  }

  async function saveTable() {
    if (!form.label.trim()) return;
    const payload = {
      label: form.label, zone_id: form.zone_id || null, seats: form.seats,
      shape: form.shape, pos_x: form.pos_x, pos_y: form.pos_y, is_active: form.is_active,
    };
    if (editTable) {
      await supabase.from("tables").update(payload).eq("id", editTable.id);
    } else {
      await supabase.from("tables").insert({ ...payload, sort_order: tables.length });
    }
    setShowTableModal(false);
    fetchAll();
    toast({ title: editTable ? "อัปเดตโต๊ะแล้ว" : "เพิ่มโต๊ะแล้ว" });
  }

  async function deleteTable(id: string) {
    await supabase.from("tables").update({ is_active: false }).eq("id", id);
    fetchAll();
    toast({ title: "ปิดการใช้งานโต๊ะแล้ว" });
  }

  async function toggleTableActive(id: string, active: boolean) {
    await supabase.from("tables").update({ is_active: !active }).eq("id", id);
    fetchAll();
  }

  const filteredTables = selectedZone ? tables.filter(t => t.zone_id === selectedZone) : tables;
  const activeTables = filteredTables.filter(t => t.is_active);

  // Floor plan drag
  const floorRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  function handleFloorMouseDown(tableId: string) { setDragging(tableId); }
  function handleFloorMouseMove(e: React.MouseEvent) {
    if (!dragging || !floorRef.current) return;
    const rect = floorRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / 20) * 20;
    const y = Math.round((e.clientY - rect.top) / 20) * 20;
    setTables(prev => prev.map(t => t.id === dragging ? { ...t, pos_x: x, pos_y: y } : t));
  }
  async function handleFloorMouseUp() {
    if (!dragging) return;
    const t = tables.find(t => t.id === dragging);
    if (t) await supabase.from("tables").update({ pos_x: t.pos_x, pos_y: t.pos_y }).eq("id", t.id);
    setDragging(null);
  }

  const getZoneColor = (zoneId: string | null) => zones.find(z => z.id === zoneId)?.color || "#888";
  const getZoneName = (zoneId: string | null) => zones.find(z => z.id === zoneId)?.name || "-";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[15px] font-bold text-foreground">🪑 จัดการโต๊ะ</h1>
          <p className="text-[11px] text-muted-foreground">Table Layout Manager</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode(viewMode === "grid" ? "floor" : "grid")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border border-border text-muted-foreground hover:text-foreground transition-colors">
            {viewMode === "grid" ? <><Map size={14} /> Floor Plan</> : <><LayoutGrid size={14} /> Grid</>}
          </button>
          <button onClick={openAddTable}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold bg-primary text-white hover:opacity-90 transition-opacity">
            <Plus size={14} /> เพิ่มโต๊ะ
          </button>
        </div>
      </div>

      {/* Zones */}
      <div className="px-5 py-3 border-b border-border bg-card flex items-center gap-2 overflow-x-auto scrollbar-hide shrink-0">
        <button onClick={() => setSelectedZone(null)}
          className={cn("px-3 py-1.5 rounded-xl text-[12px] font-semibold border-2 whitespace-nowrap transition-all",
            !selectedZone ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
          ทั้งหมด ({tables.filter(t => t.is_active).length})
        </button>
        {zones.map(z => {
          const count = tables.filter(t => t.zone_id === z.id && t.is_active).length;
          return (
            <button key={z.id} onClick={() => setSelectedZone(z.id)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border-2 whitespace-nowrap transition-all",
                selectedZone === z.id ? "bg-primary/10 text-primary" : "border-border text-muted-foreground"
              )}
              style={selectedZone === z.id ? { borderColor: z.color } : undefined}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
              {z.name} ({count})
            </button>
          );
        })}
        <button onClick={() => { setEditZone(null); setZoneForm({ name: "", color: "#4338CA" }); setShowZoneModal(true); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold border-2 border-dashed border-border text-muted-foreground hover:text-foreground whitespace-nowrap">
          <Plus size={12} /> โซน
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-muted/60 animate-pulse border border-border" />)}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {activeTables.map(t => (
              <div key={t.id} className="relative p-4 rounded-2xl border-2 border-border bg-card hover:shadow-md transition-all">
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => openEditTable(t)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"><Pencil size={11} /></button>
                  <button onClick={() => deleteTable(t.id)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
                </div>
                <div className="text-[20px] font-black text-foreground mb-1">{t.label}</div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getZoneColor(t.zone_id) }} />
                  <span className="text-[11px] text-muted-foreground">{getZoneName(t.zone_id)}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>🪑 {t.seats} ที่นั่ง</span>
                  <span className="capitalize">{t.shape === "round" ? "⭕" : t.shape === "long" ? "▬" : "⬜"} {t.shape}</span>
                </div>
                <button onClick={() => toggleTableActive(t.id, t.is_active)}
                  className={cn("mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold border",
                    t.is_active ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground border-border")}>
                  {t.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Floor plan */
          <div ref={floorRef} onMouseMove={handleFloorMouseMove} onMouseUp={handleFloorMouseUp} onMouseLeave={handleFloorMouseUp}
            className="relative w-full bg-muted/30 border-2 border-dashed border-border rounded-2xl overflow-hidden select-none"
            style={{ height: 600, backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
            {activeTables.map(t => (
              <div key={t.id} onMouseDown={() => handleFloorMouseDown(t.id)}
                className={cn("absolute flex flex-col items-center justify-center cursor-grab active:cursor-grabbing border-2 transition-shadow",
                  t.shape === "round" ? "rounded-full" : "rounded-xl",
                  dragging === t.id ? "shadow-lg z-10 border-primary" : "border-border"
                )}
                style={{
                  left: t.pos_x, top: t.pos_y, width: t.width, height: t.height,
                  backgroundColor: getZoneColor(t.zone_id) + "22",
                  borderColor: dragging === t.id ? undefined : getZoneColor(t.zone_id),
                }}>
                <span className="text-[13px] font-black text-foreground">{t.label}</span>
                <span className="text-[9px] text-muted-foreground">{t.seats}p</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zone Modal */}
      <Dialog open={showZoneModal} onOpenChange={o => { if (!o) { setShowZoneModal(false); setEditZone(null); } }}>
        <DialogContent className="max-w-xs p-5 rounded-2xl bg-card border-border">
          <h2 className="text-[15px] font-bold text-foreground mb-3">{editZone ? "แก้ไขโซน" : "เพิ่มโซน"}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">ชื่อโซน</label>
              <input value={zoneForm.name} onChange={e => setZoneForm(p => ({ ...p, name: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground" placeholder="เช่น ระเบียง" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">สี</label>
              <input type="color" value={zoneForm.color} onChange={e => setZoneForm(p => ({ ...p, color: e.target.value }))}
                className="w-full h-10 mt-1 rounded-xl border border-border cursor-pointer" />
            </div>
            {editZone && (
              <button onClick={() => { deleteZone(editZone.id); setShowZoneModal(false); setEditZone(null); }}
                className="w-full py-2 rounded-xl text-[12px] font-semibold text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors">
                🗑️ ลบโซนนี้
              </button>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowZoneModal(false)} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border border-border text-muted-foreground">ยกเลิก</button>
            <button onClick={saveZone} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold bg-primary text-white">บันทึก</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Modal */}
      <Dialog open={showTableModal} onOpenChange={o => { if (!o) setShowTableModal(false); }}>
        <DialogContent className="max-w-sm p-5 rounded-2xl bg-card border-border">
          <h2 className="text-[15px] font-bold text-foreground mb-3">{editTable ? "แก้ไขโต๊ะ" : "เพิ่มโต๊ะ"}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">ชื่อโต๊ะ</label>
              <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground" placeholder="T1, A1..." />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">โซน</label>
              <select value={form.zone_id} onChange={e => setForm(p => ({ ...p, zone_id: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground">
                <option value="">ไม่ระบุ</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-muted-foreground">ที่นั่ง</label>
                <input type="number" value={form.seats} min={1} onChange={e => setForm(p => ({ ...p, seats: +e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground" />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-muted-foreground">รูปทรง</label>
                <select value={form.shape} onChange={e => setForm(p => ({ ...p, shape: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground">
                  <option value="square">⬜ สี่เหลี่ยม</option>
                  <option value="round">⭕ กลม</option>
                  <option value="long">▬ ยาว</option>
                </select>
              </div>
            </div>
            {viewMode === "floor" && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">X</label>
                  <input type="number" value={form.pos_x} onChange={e => setForm(p => ({ ...p, pos_x: +e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Y</label>
                  <input type="number" value={form.pos_y} onChange={e => setForm(p => ({ ...p, pos_y: +e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground" />
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="rounded border-border" />
              <span className="text-[12px] text-foreground">เปิดใช้งาน</span>
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowTableModal(false)} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border border-border text-muted-foreground">ยกเลิก</button>
            <button onClick={saveTable} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold bg-primary text-white">บันทึก</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
