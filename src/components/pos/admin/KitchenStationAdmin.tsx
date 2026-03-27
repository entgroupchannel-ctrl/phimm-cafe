import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Copy, Check } from "lucide-react";

interface Station {
  id: string;
  name: string;
  short_name: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  printer_name: string | null;
  printer_ip: string | null;
  auto_accept: boolean;
  avg_prep_minutes: number;
}

interface Device {
  id: string;
  device_name: string;
  device_token: string;
  station_id: string | null;
  device_type: string;
  screen_mode: string;
  last_seen_at: string | null;
  is_active: boolean;
}

const EMOJI_OPTIONS = ["🔥", "🥩", "☕", "🍰", "🧊", "🍜", "🍕", "🥗", "🍳", "🍲", "🍟", "🧋"];

export function KitchenStationAdmin() {
  const [stations, setStations] = useState<Station[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editStation, setEditStation] = useState<Station | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [stationStats, setStationStats] = useState<Record<string, { pending: number; cooking: number; done: number }>>({});
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", short_name: "", icon: "🔥", color: "#D85A30",
    avg_prep_minutes: 10, auto_accept: true, printer_name: "", printer_ip: "",
  });
  const [deviceForm, setDeviceForm] = useState({
    device_name: "", station_id: "", device_type: "tablet", screen_mode: "station",
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [s, d] = await Promise.all([
      supabase.from("kitchen_stations").select("*").order("sort_order"),
      supabase.from("kds_devices").select("*").order("created_at"),
    ]);
    if (s.data) setStations(s.data as any);
    if (d.data) setDevices(d.data as any);

    // Fetch today's stats per station
    const today = new Date().toISOString().split("T")[0];
    const { data: items } = await supabase
      .from("order_items")
      .select("station_id, status, station_done_at")
      .not("station_id", "is", null)
      .gte("created_at", today + "T00:00:00");

    if (items) {
      const stats: Record<string, { pending: number; cooking: number; done: number }> = {};
      (items as any[]).forEach(i => {
        if (!i.station_id) return;
        if (!stats[i.station_id]) stats[i.station_id] = { pending: 0, cooking: 0, done: 0 };
        if (i.status === "sent") stats[i.station_id].pending++;
        else if (i.status === "cooking") stats[i.station_id].cooking++;
        else if (i.station_done_at) stats[i.station_id].done++;
      });
      setStationStats(stats);
    }
    setLoading(false);
  }

  function openAddStation() {
    setEditStation(null);
    setForm({ name: "", short_name: "", icon: "🔥", color: "#D85A30", avg_prep_minutes: 10, auto_accept: true, printer_name: "", printer_ip: "" });
    setShowModal(true);
  }
  function openEditStation(s: Station) {
    setEditStation(s);
    setForm({
      name: s.name, short_name: s.short_name, icon: s.icon, color: s.color,
      avg_prep_minutes: s.avg_prep_minutes, auto_accept: s.auto_accept,
      printer_name: s.printer_name || "", printer_ip: s.printer_ip || "",
    });
    setShowModal(true);
  }

  async function saveStation() {
    if (!form.name.trim() || !form.short_name.trim()) return;
    const payload = {
      name: form.name, short_name: form.short_name.toUpperCase().slice(0, 6),
      icon: form.icon, color: form.color, avg_prep_minutes: form.avg_prep_minutes,
      auto_accept: form.auto_accept, printer_name: form.printer_name || null, printer_ip: form.printer_ip || null,
    };
    if (editStation) {
      await supabase.from("kitchen_stations").update(payload).eq("id", editStation.id);
    } else {
      await supabase.from("kitchen_stations").insert({ ...payload, sort_order: stations.length });
    }
    setShowModal(false);
    fetchAll();
    toast({ title: editStation ? "อัปเดต Station แล้ว" : "เพิ่ม Station แล้ว" });
  }

  async function deleteStation(id: string) {
    await supabase.from("kitchen_stations").update({ is_active: false }).eq("id", id);
    fetchAll();
    toast({ title: "ปิดใช้งาน Station แล้ว" });
  }

  async function toggleStation(id: string, active: boolean) {
    await supabase.from("kitchen_stations").update({ is_active: !active }).eq("id", id);
    fetchAll();
  }

  // Device CRUD
  function openAddDevice() {
    setEditDevice(null);
    setDeviceForm({ device_name: "", station_id: stations[0]?.id || "", device_type: "tablet", screen_mode: "station" });
    setShowDeviceModal(true);
  }

  async function saveDevice() {
    if (!deviceForm.device_name.trim()) return;
    const payload = {
      device_name: deviceForm.device_name,
      station_id: deviceForm.station_id || null,
      device_type: deviceForm.device_type,
      screen_mode: deviceForm.screen_mode,
    };
    if (editDevice) {
      await supabase.from("kds_devices").update(payload).eq("id", editDevice.id);
    } else {
      await supabase.from("kds_devices").insert(payload);
    }
    setShowDeviceModal(false);
    fetchAll();
    toast({ title: editDevice ? "อัปเดตอุปกรณ์แล้ว" : "ลงทะเบียนอุปกรณ์แล้ว" });
  }

  async function deleteDevice(id: string) {
    await supabase.from("kds_devices").delete().eq("id", id);
    fetchAll();
    toast({ title: "ลบอุปกรณ์แล้ว" });
  }

  function copyToken(token: string) {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({ title: "คัดลอก Token แล้ว" });
  }

  const getStationName = (stationId: string | null) => stations.find(s => s.id === stationId)?.name || "-";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[15px] font-bold text-foreground">🔥 สถานีครัว</h1>
          <p className="text-[11px] text-muted-foreground">Kitchen Station Config</p>
        </div>
        <button onClick={openAddStation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold bg-primary text-white hover:opacity-90">
          <Plus size={14} /> เพิ่ม Station
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Stations grid */}
        {loading ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-muted/60 animate-pulse border border-border" />)}
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
            {stations.map(s => {
              const stat = stationStats[s.id] || { pending: 0, cooking: 0, done: 0 };
              const assignedDevice = devices.find(d => d.station_id === s.id);
              return (
                <div key={s.id} className={cn("relative rounded-2xl border-2 bg-card overflow-hidden transition-all",
                  s.is_active ? "border-border" : "border-border opacity-50")}>
                  {/* Color stripe */}
                  <div className="h-1.5" style={{ backgroundColor: s.color }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[28px]">{s.icon}</span>
                        <div>
                          <div className="text-[14px] font-bold text-foreground">{s.name}</div>
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold border" style={{ color: s.color, borderColor: s.color + "44", backgroundColor: s.color + "15" }}>
                            {s.short_name}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditStation(s)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"><Pencil size={11} /></button>
                        <button onClick={() => deleteStation(s.id)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-2 mb-3">
                      {[
                        { label: "รอ", val: stat.pending, c: "text-danger" },
                        { label: "ทำ", val: stat.cooking, c: "text-warning" },
                        { label: "เสร็จ", val: stat.done, c: "text-success" },
                      ].map(x => (
                        <div key={x.label} className="flex-1 text-center py-1.5 rounded-lg bg-muted/50 border border-border">
                          <div className={cn("text-[14px] font-mono font-bold tabular-nums", x.c)}>{x.val}</div>
                          <div className="text-[9px] text-muted-foreground">{x.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <div>⏱ เวลาเฉลี่ย: <strong className="text-foreground">{s.avg_prep_minutes} นาที</strong></div>
                      <div>📱 อุปกรณ์: <strong className="text-foreground">{assignedDevice?.device_name || "ยังไม่ได้กำหนด"}</strong></div>
                      <div>🖨️ Printer: <strong className="text-foreground">{s.printer_name || "-"}</strong></div>
                    </div>

                    <button onClick={() => toggleStation(s.id, s.is_active)}
                      className={cn("mt-3 w-full py-1.5 rounded-xl text-[11px] font-bold border transition-colors",
                        s.is_active ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground border-border")}>
                      {s.is_active ? "✅ Active" : "⏸ Inactive"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* KDS Devices */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-foreground">📱 KDS Devices</h2>
            <button onClick={openAddDevice}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-primary text-white hover:opacity-90">
              <Plus size={12} /> ลงทะเบียนอุปกรณ์
            </button>
          </div>
          {devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-[13px]">ยังไม่มีอุปกรณ์ KDS</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-3 font-semibold">อุปกรณ์</th>
                    <th className="text-left py-2 px-3 font-semibold">Token</th>
                    <th className="text-left py-2 px-3 font-semibold">Station</th>
                    <th className="text-left py-2 px-3 font-semibold">Type</th>
                    <th className="text-left py-2 px-3 font-semibold">Mode</th>
                    <th className="text-left py-2 px-3 font-semibold">Last seen</th>
                    <th className="text-right py-2 px-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(d => (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3 font-semibold text-foreground">{d.device_name}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <code className="text-[10px] text-muted-foreground font-mono">{d.device_token.slice(0, 8)}...</code>
                          <button onClick={() => copyToken(d.device_token)} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground">
                            {copiedToken === d.device_token ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{getStationName(d.station_id)}</td>
                      <td className="py-2 px-3 text-muted-foreground">{d.device_type}</td>
                      <td className="py-2 px-3">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold",
                          d.screen_mode === "all" ? "bg-primary/10 text-primary" :
                          d.screen_mode === "expeditor" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                        )}>{d.screen_mode}</span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-[10px]">
                        {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString("th-TH") : "-"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button onClick={() => deleteDevice(d.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Station Modal */}
      <Dialog open={showModal} onOpenChange={o => { if (!o) setShowModal(false); }}>
        <DialogContent className="max-w-sm p-5 rounded-2xl bg-card border-border">
          <h2 className="text-[15px] font-bold text-foreground mb-3">{editStation ? "แก้ไข Station" : "เพิ่ม Station"}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">ชื่อ</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground" placeholder="เตาผัด / Wok" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Short name (max 6)</label>
                <input value={form.short_name} maxLength={6} onChange={e => setForm(p => ({ ...p, short_name: e.target.value.toUpperCase() }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground font-mono" placeholder="WOK" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">สี</label>
                <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                  className="w-full h-[38px] mt-1 rounded-xl border border-border cursor-pointer" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Icon</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {EMOJI_OPTIONS.map(e => (
                  <button key={e} onClick={() => setForm(p => ({ ...p, icon: e }))}
                    className={cn("w-9 h-9 rounded-lg text-[18px] flex items-center justify-center border-2 transition-all",
                      form.icon === e ? "border-primary bg-primary/10" : "border-border hover:border-primary/50")}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">เวลาเฉลี่ย (นาที)</label>
              <input type="number" value={form.avg_prep_minutes} min={1} onChange={e => setForm(p => ({ ...p, avg_prep_minutes: +e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.auto_accept} onChange={e => setForm(p => ({ ...p, auto_accept: e.target.checked }))} className="rounded" />
              <span className="text-[12px] text-foreground">Auto-accept orders</span>
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Printer name</label>
                <input value={form.printer_name} onChange={e => setForm(p => ({ ...p, printer_name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground" />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Printer IP</label>
                <input value={form.printer_ip} onChange={e => setForm(p => ({ ...p, printer_ip: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border border-border text-muted-foreground">ยกเลิก</button>
            <button onClick={saveStation} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold bg-primary text-white">บันทึก</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Device Modal */}
      <Dialog open={showDeviceModal} onOpenChange={o => { if (!o) setShowDeviceModal(false); }}>
        <DialogContent className="max-w-sm p-5 rounded-2xl bg-card border-border">
          <h2 className="text-[15px] font-bold text-foreground mb-3">ลงทะเบียนอุปกรณ์ KDS</h2>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">ชื่ออุปกรณ์</label>
              <input value={deviceForm.device_name} onChange={e => setDeviceForm(p => ({ ...p, device_name: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground" placeholder="Tablet ครัวผัด" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Station</label>
              <select value={deviceForm.station_id} onChange={e => setDeviceForm(p => ({ ...p, station_id: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground">
                <option value="">ไม่ระบุ</option>
                {stations.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Type</label>
                <select value={deviceForm.device_type} onChange={e => setDeviceForm(p => ({ ...p, device_type: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground">
                  <option value="tablet">Tablet</option>
                  <option value="panel_pc">Panel PC</option>
                  <option value="phone">Phone</option>
                  <option value="desktop">Desktop</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Mode</label>
                <select value={deviceForm.screen_mode} onChange={e => setDeviceForm(p => ({ ...p, screen_mode: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-[13px] text-foreground">
                  <option value="station">Station only</option>
                  <option value="all">All items</option>
                  <option value="expeditor">Expeditor</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowDeviceModal(false)} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border border-border text-muted-foreground">ยกเลิก</button>
            <button onClick={saveDevice} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold bg-primary text-white">บันทึก</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
