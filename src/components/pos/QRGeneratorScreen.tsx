import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const RESTAURANT_NAME = "Phimm Cafe";
const RESTAURANT_LOGO = "☕";

interface Table {
  id: string;
  zone: string;
  seats: number;
  label: string;
}

const ZONE_COLORS: Record<string, { hex: string; light: string; badge: string }> = {
  "main":       { hex: "#4338CA", light: "#4338CA18", badge: "bg-primary/10 text-primary border-primary/25" },
  "หน้าร้าน":   { hex: "#4338CA", light: "#4338CA18", badge: "bg-primary/10 text-primary border-primary/25" },
  "outdoor":    { hex: "#0891B2", light: "#0891B218", badge: "bg-accent/10 text-accent border-accent/25" },
  "ระเบียง":    { hex: "#0891B2", light: "#0891B218", badge: "bg-accent/10 text-accent border-accent/25" },
  "vip":        { hex: "#D97706", light: "#D9770618", badge: "bg-warning/10 text-warning border-warning/25" },
  "VIP":        { hex: "#D97706", light: "#D9770618", badge: "bg-warning/10 text-warning border-warning/25" },
  "counter":    { hex: "#059669", light: "#05966918", badge: "bg-success/10 text-success border-success/25" },
  "เคาน์เตอร์": { hex: "#059669", light: "#05966918", badge: "bg-success/10 text-success border-success/25" },
};

function getZoneColor(zone: string) {
  return ZONE_COLORS[zone] || { hex: "#4338CA", light: "#4338CA18", badge: "bg-primary/10 text-primary border-primary/25" };
}

function qrUrl(tableId: string) {
  return `${window.location.origin}/order/${tableId}`;
}

function QRCard({ table, size = 180 }: { table: Table; size?: number }) {
  const zone = getZoneColor(table.zone);
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 p-4 bg-white select-none"
      style={{ borderColor: zone.hex + "50", width: size + 64, minWidth: size + 64 }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[18px]">{RESTAURANT_LOGO}</span>
        <span className="text-[11px] font-bold text-gray-500 tracking-wide">{RESTAURANT_NAME}</span>
      </div>
      <div className="rounded-xl overflow-hidden p-2 border border-gray-100 shadow-sm bg-white">
        <QRCodeSVG value={qrUrl(table.id)} size={size} level="M" includeMargin={false} fgColor="#1a1a2e" />
      </div>
      <div className="mt-3 text-center">
        <div className="text-[22px] font-black tracking-tight text-gray-800">{table.label}</div>
        <div className="text-[11px] font-semibold mt-0.5" style={{ color: zone.hex }}>{table.zone}</div>
        <div className="text-[10px] text-gray-400 mt-1">📱 สแกน QR เพื่อสั่งอาหาร</div>
      </div>
    </div>
  );
}

function usePrintTable() {
  return useCallback((tables: Table[]) => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    const cards = tables.map(t => {
      const zone = getZoneColor(t.zone);
      const url = qrUrl(t.id);
      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
      return `<div class="card" style="border-color:${zone.hex}50">
        <div class="restaurant">${RESTAURANT_LOGO} ${RESTAURANT_NAME}</div>
        <img src="${qrSrc}" width="180" height="180" style="border-radius:8px;border:1px solid #eee;" />
        <div class="label">${t.label}</div>
        <div class="zone" style="color:${zone.hex}">${t.zone}</div>
        <div class="hint">📱 สแกน QR เพื่อสั่งอาหาร</div>
        <div class="url" style="font-size:8px;color:#aaa;margin-top:4px;word-break:break-all">${url}</div>
      </div>`;
    }).join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>QR Codes — ${RESTAURANT_NAME}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#f5f5f5;padding:24px}
      .grid{display:flex;flex-wrap:wrap;gap:20px;justify-content:flex-start}
      .card{display:flex;flex-direction:column;align-items:center;background:white;border:2px solid #ddd;border-radius:16px;padding:16px;width:248px}
      .restaurant{font-size:11px;font-weight:700;color:#777;margin-bottom:10px;letter-spacing:.05em}
      .label{font-size:22px;font-weight:900;color:#1a1a2e;margin-top:10px}.zone{font-size:11px;font-weight:700;margin-top:2px}
      .hint{font-size:10px;color:#aaa;margin-top:6px}
      @media print{body{background:white;padding:8px}@page{margin:12mm;size:A4}}</style>
      </head><body><div class="grid">${cards}</div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),800)}<\/script></body></html>`);
    printWindow.document.close();
  }, []);
}

export function QRGeneratorScreen() {
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("ทั้งหมด");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Table | null>(null);
  const [qrSize, setQrSize] = useState(160);
  const printTables = usePrintTable();

  useEffect(() => {
    supabase.from('tables').select('id, label, zone, seats').eq('is_active', true).order('sort_order')
      .then(({ data }) => {
        if (data) {
          setTables(data.map(t => ({ id: t.id, label: t.label, zone: t.zone || 'main', seats: t.seats || 4 })));
          const uniqueZones = [...new Set(data.map(t => t.zone || 'main'))];
          setZones(uniqueZones);
        }
      });
  }, []);

  const filtered = selectedZone === "ทั้งหมด" ? tables : tables.filter(t => t.zone === selectedZone);
  const toggleSelect = (id: string) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const selectAll = () => setSelected(new Set(filtered.map(t => t.id)));
  const clearAll = () => setSelected(new Set());
  const selectedTables = tables.filter(t => selected.has(t.id));
  const printSelected = () => { if (selectedTables.length > 0) printTables(selectedTables); };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-5 py-3 bg-card border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white font-extrabold text-[16px] shadow-primary">QR</div>
            <div>
              <div className="text-[15px] font-extrabold text-gradient-primary leading-tight">Table QR Generator</div>
              <div className="text-[10px] text-muted-foreground">สร้าง QR สำหรับโต๊ะ — ลูกค้าสแกนเพื่อสั่งอาหาร</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <span className="text-[12px] font-bold text-primary bg-primary/10 border border-primary/25 px-3 py-1.5 rounded-xl">เลือกแล้ว {selected.size} โต๊ะ</span>
            )}
            <button onClick={printSelected} disabled={selected.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white gradient-primary shadow-primary transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed">
              🖨️ พิมพ์ที่เลือก
            </button>
            <button onClick={() => printTables(filtered)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold border-2 border-border text-muted-foreground hover:border-border transition-colors">
              🖨️ พิมพ์ทั้งหมด
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 shrink-0 border-r border-border bg-card flex flex-col overflow-y-auto scrollbar-hide p-4 gap-4">
          <div>
            <div className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-wide">📍 โซน</div>
            <div className="space-y-1">
              <button onClick={() => setSelectedZone("ทั้งหมด")}
                className={cn("w-full text-left px-3 py-2 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-between",
                  selectedZone === "ทั้งหมด" ? "bg-primary/10 text-primary border border-primary/25" : "text-muted-foreground hover:bg-border/50")}>
                <span>🏠 ทั้งหมด</span><span className="font-mono text-[11px] font-bold">{tables.length}</span>
              </button>
              {zones.map(z => {
                const col = getZoneColor(z);
                const count = tables.filter(t => t.zone === z).length;
                return (
                  <button key={z} onClick={() => setSelectedZone(z)}
                    className={cn("w-full text-left px-3 py-2 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-between",
                      selectedZone === z ? "border" : "text-muted-foreground hover:bg-border/50")}
                    style={selectedZone === z ? { background: col.light, color: col.hex, borderColor: col.hex + "40" } : {}}>
                    <span>{z}</span><span className="font-mono text-[11px] font-bold">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-wide">🔲 ขนาด QR</div>
            <div className="space-y-2">
              {[
                { label: "เล็ก (S)", size: 120, hint: "นามบัตร / สติ๊กเกอร์" },
                { label: "กลาง (M)", size: 160, hint: "โต๊ะทั่วไป" },
                { label: "ใหญ่ (L)", size: 200, hint: "โต๊ะ VIP / ระเบียง" },
              ].map(opt => (
                <button key={opt.size} onClick={() => setQrSize(opt.size)}
                  className={cn("w-full text-left px-3 py-2 rounded-xl text-[12px] transition-all border",
                    qrSize === opt.size ? "border-primary/40 bg-primary/8 text-primary" : "border-transparent text-muted-foreground hover:bg-border/50")}>
                  <div className="font-bold">{opt.label}</div>
                  <div className="text-[10px] opacity-70">{opt.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border space-y-1.5">
            <button onClick={selectAll} className="w-full py-2 rounded-xl text-[12px] font-bold border border-border text-muted-foreground hover:bg-border/50 transition-colors">☑️ เลือกทั้งหมดในโซน</button>
            <button onClick={clearAll} className="w-full py-2 rounded-xl text-[12px] font-bold border border-border text-muted-foreground hover:bg-border/50 transition-colors">✖️ ยกเลิกการเลือก</button>
          </div>

          <div className="bg-primary/6 border border-primary/20 rounded-xl p-3">
            <div className="text-[11px] font-bold text-primary mb-1.5">💡 วิธีใช้</div>
            <div className="space-y-1 text-[10px] text-muted-foreground leading-relaxed">
              <div>1. เลือกโต๊ะที่ต้องการพิมพ์</div>
              <div>2. กด 🖨️ พิมพ์ที่เลือก</div>
              <div>3. วาง QR ไว้บนโต๊ะ</div>
              <div>4. ลูกค้าสแกนเพื่อสั่งได้ทันที</div>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[14px] font-extrabold text-foreground">
              {selectedZone === "ทั้งหมด" ? "🏠 ทุกโซน" : selectedZone}
              <span className="ml-2 text-[12px] font-normal text-muted-foreground">({filtered.length} โต๊ะ)</span>
            </div>
            <div className="text-[11px] text-muted-foreground">คลิกโต๊ะเพื่อเลือก · คลิก 👁 เพื่อดู QR</div>
          </div>

          {(selectedZone === "ทั้งหมด" ? zones : [selectedZone]).map(zone => {
            const zoneTables = filtered.filter(t => t.zone === zone);
            if (zoneTables.length === 0) return null;
            const col = getZoneColor(zone);
            return (
              <div key={zone} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-[2px] w-4 rounded-full" style={{ background: col.hex }} />
                  <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md border", col.badge)}>{zone} · {zoneTables.length} โต๊ะ</span>
                  <div className="h-[2px] flex-1 rounded-full bg-border" />
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                  {zoneTables.map(table => {
                    const isSelected = selected.has(table.id);
                    return (
                      <div key={table.id} onClick={() => toggleSelect(table.id)}
                        className={cn("relative bg-card border-2 rounded-2xl p-4 cursor-pointer transition-all group hover:shadow-md",
                          isSelected ? "shadow-[0_0_0_2px_hsl(var(--primary)/0.4)]" : "border-border hover:border-border")}
                        style={isSelected ? { borderColor: col.hex + "80", background: col.light } : {}}>
                        <div className={cn("absolute top-2.5 right-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all text-[11px]",
                          isSelected ? "border-transparent text-white" : "border-border/60")} style={isSelected ? { background: col.hex } : {}}>
                          {isSelected && "✓"}
                        </div>
                        <div className="flex justify-center mb-3">
                          <div className="p-1.5 bg-white rounded-xl border border-border/60 shadow-sm">
                            <QRCodeSVG value={qrUrl(table.id)} size={72} level="M" includeMargin={false} fgColor={col.hex} />
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[15px] font-extrabold text-foreground">{table.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{table.seats === 1 ? "1 ที่นั่ง" : `${table.seats} ที่นั่ง`}</div>
                        </div>
                        <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setPreview(table); }}
                            className="w-7 h-7 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground flex items-center justify-center text-[13px]">👁</button>
                          <button onClick={(e) => { e.stopPropagation(); printTables([table]); }}
                            className="w-7 h-7 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground flex items-center justify-center text-[13px]">🖨</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Preview panel */}
        {preview && (
          <div className="w-80 shrink-0 border-l border-border bg-card p-5 flex flex-col items-center gap-4 overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between w-full">
              <span className="text-[14px] font-extrabold text-foreground">Preview</span>
              <button onClick={() => setPreview(null)} className="w-7 h-7 rounded-lg border border-border text-muted-foreground hover:text-foreground flex items-center justify-center text-[15px]">✕</button>
            </div>
            <QRCard table={preview} size={qrSize} />
            <div className="w-full space-y-2">
              <div className="text-[11px] text-muted-foreground break-all bg-background rounded-xl p-3 border border-border font-mono">{qrUrl(preview.id)}</div>
              <button onClick={() => { navigator.clipboard.writeText(qrUrl(preview.id)); }}
                className="w-full py-2 rounded-xl text-[12px] font-bold border border-border text-muted-foreground hover:bg-border/50 transition-colors">📋 Copy URL</button>
              <button onClick={() => printTables([preview])}
                className="w-full py-2 rounded-xl text-[12px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 transition-opacity">🖨️ พิมพ์ QR นี้</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
