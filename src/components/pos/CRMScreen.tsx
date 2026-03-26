import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// ── Helpers ───────────────────────────────────────────────
function Stat({ icon, label, value, sub, trend, colorCls = "text-primary" }: {
  icon: string; label: string; value: string; sub: string; trend?: number; colorCls?: string;
}) {
  return (
    <div className="flex-1 min-w-[130px] bg-card border border-border rounded-2xl p-4 relative overflow-hidden shadow-card">
      <div className="absolute top-0 right-0 w-14 h-14 rounded-bl-full bg-primary/5" />
      <div className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">{icon} {label}</div>
      <div className={cn("font-mono text-[22px] font-black tabular-nums", colorCls)}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
        {trend != null && (
          <span className={trend > 0 ? "text-success font-bold" : "text-danger font-bold"}>
            {trend > 0 ? "▲" : "▼"}{Math.abs(trend)}%
          </span>
        )}
        {sub}
      </div>
    </div>
  );
}

function tierColorCls(tier: string) {
  if (tier === "platinum") return "text-accent border-accent/40 bg-accent/10";
  if (tier === "gold") return "text-warning border-warning/40 bg-warning/10";
  if (tier === "silver") return "text-muted-foreground border-muted-foreground/30 bg-muted/20";
  return "text-primary border-primary/30 bg-primary/10";
}

function tierIcon(tier: string) {
  if (tier === "platinum") return "💎";
  if (tier === "gold") return "🥇";
  if (tier === "silver") return "🥈";
  return "🌱";
}

// ── Tab 1: Customer List ──────────────────────────────────
function CustomerTab() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loyaltyTx, setLoyaltyTx] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', line_id: '', birthday: '', allergens: '' });
  const [adjustPoints, setAdjustPoints] = useState({ show: false, amount: 0, reason: '' });

  useEffect(() => { fetchCustomers(); fetchTiers(); }, []);

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('*').order('total_spent', { ascending: false });
    if (data) setCustomers(data);
  }

  async function fetchTiers() {
    const { data } = await supabase.from('loyalty_tiers').select('*').order('sort_order');
    if (data) setTiers(data);
  }

  async function selectCustomer(c: any) {
    setSelected(c);
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, total, payment_method, channel, created_at')
      .eq('customer_id', c.id)
      .eq('status', 'paid' as any)
      .order('created_at', { ascending: false })
      .limit(20);
    if (orders) setHistory(orders);

    const { data: tx } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('customer_id', c.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (tx) setLoyaltyTx(tx);
  }

  async function handleSave() {
    const payload = {
      name: formData.name,
      phone: formData.phone || null,
      email: formData.email || null,
      line_id: formData.line_id || null,
      birthday: formData.birthday || null,
      allergens: formData.allergens ? formData.allergens.split(',').map(s => s.trim()) : [],
    };

    if (editMode && selected) {
      await supabase.from('customers').update(payload).eq('id', selected.id);
    } else {
      await supabase.from('customers').insert({ ...payload, tier: 'member', points: 0 });
    }
    setShowForm(false);
    setEditMode(false);
    fetchCustomers();
  }

  async function handleAdjustPoints() {
    if (!selected || adjustPoints.amount === 0) return;
    await supabase.from('customers').update({ points: (selected.points || 0) + adjustPoints.amount }).eq('id', selected.id);
    await supabase.from('loyalty_transactions').insert({
      customer_id: selected.id,
      points_change: adjustPoints.amount,
      type: adjustPoints.amount > 0 ? 'bonus' : 'adjust',
      description: adjustPoints.reason || 'ปรับแต้มโดยพนักงาน',
    });
    await supabase.rpc('update_customer_tier', { p_customer_id: selected.id });
    setAdjustPoints({ show: false, amount: 0, reason: '' });
    fetchCustomers();
    selectCustomer({ ...selected, points: (selected.points || 0) + adjustPoints.amount });
  }

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const nextTier = selected ? tiers.find(t => t.min_points > (selected.points || 0)) : null;
  const currentTier = selected ? tiers.find(t => t.name === selected.tier) : null;

  return (
    <div className="flex gap-4 h-full">
      {/* Left: list */}
      <div className="w-[380px] shrink-0 flex flex-col gap-3">
        <div className="flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ค้นหาชื่อหรือเบอร์โทร..."
            className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button onClick={() => { setShowForm(true); setEditMode(false); setFormData({ name: '', phone: '', email: '', line_id: '', birthday: '', allergens: '' }); }}
            className="px-4 py-2 rounded-xl text-[12px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 transition-opacity">+ เพิ่ม</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-hide">
          {filtered.map(c => (
            <div key={c.id} onClick={() => selectCustomer(c)}
              className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all",
                selected?.id === c.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-border")}>
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-[18px] border", tierColorCls(c.tier || 'member'))}>
                {tierIcon(c.tier || 'member')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-foreground truncate">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">{c.phone || 'ไม่มีเบอร์'}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-[12px] font-bold text-primary tabular-nums">{(c.points || 0).toLocaleString()} pts</div>
                <div className="text-[10px] text-muted-foreground">฿{Number(c.total_spent || 0).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: detail */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-[14px]">👈 เลือกลูกค้าจากรายการด้านซ้าย</div>
        ) : (
          <div className="space-y-3">
            {/* Profile */}
            <div className="flex gap-3">
              <div className="w-64 bg-card border border-border rounded-2xl p-4 shadow-card text-center">
                <div className={cn("w-16 h-16 rounded-2xl mx-auto mb-2 flex items-center justify-center text-[32px] border-2", tierColorCls(selected.tier || 'member'))}>
                  {tierIcon(selected.tier || 'member')}
                </div>
                <div className="text-[17px] font-extrabold text-foreground">{selected.name}</div>
                <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md border inline-block mt-1", tierColorCls(selected.tier || 'member'))}>
                  {currentTier?.label || selected.tier || 'Member'}
                </span>
                <div className="text-[11px] text-muted-foreground mt-1">{selected.phone}</div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[
                    { l: "มาแล้ว", v: `${selected.visit_count || 0} ครั้ง` },
                    { l: "ใช้จ่ายรวม", v: `฿${Number(selected.total_spent || 0).toLocaleString()}` },
                    { l: "แต้ม", v: `${(selected.points || 0).toLocaleString()} pts` },
                    { l: "ล่าสุด", v: selected.last_visit_at ? new Date(selected.last_visit_at).toLocaleDateString('th-TH') : '-' },
                  ].map((s, i) => (
                    <div key={i} className="bg-background rounded-xl p-2 text-center">
                      <div className="text-[9px] text-muted-foreground">{s.l}</div>
                      <div className="text-[12px] font-bold font-mono text-foreground">{s.v}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5 mt-3">
                  <button onClick={() => { setShowForm(true); setEditMode(true); setFormData({ name: selected.name, phone: selected.phone || '', email: selected.email || '', line_id: selected.line_id || '', birthday: selected.birthday || '', allergens: (selected.allergens || []).join(', ') }); }}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-bold border border-border text-muted-foreground hover:bg-muted transition-colors">✏️ แก้ไข</button>
                  <button onClick={() => setAdjustPoints({ show: true, amount: 0, reason: '' })}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-bold border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors">🎁 ปรับแต้ม</button>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                {/* Tier progress */}
                {nextTier && (
                  <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
                    <div className="text-[13px] font-bold text-foreground mb-2">🏆 ความคืบหน้าสู่ {nextTier.label}</div>
                    <div className="h-2 rounded-full bg-border overflow-hidden mb-1">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, ((selected.points || 0) / nextTier.min_points) * 100)}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground">อีก {(nextTier.min_points - (selected.points || 0)).toLocaleString()} แต้ม</div>
                  </div>
                )}

                {/* Allergens */}
                {(selected.allergens || []).length > 0 && (
                  <div className="bg-card border border-danger/30 rounded-2xl p-4 shadow-card">
                    <div className="text-[13px] font-bold text-danger mb-2">⚠️ แพ้อาหาร</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {selected.allergens.map((a: string) => (
                        <span key={a} className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-danger/10 text-danger border border-danger/30">{a}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.birthday && (
                  <div className="bg-card border border-border rounded-2xl p-3 shadow-card flex items-center gap-2">
                    <span className="text-[20px]">🎂</span>
                    <div>
                      <div className="text-[11px] text-muted-foreground">วันเกิด</div>
                      <div className="text-[13px] font-bold text-foreground">{new Date(selected.birthday).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order history */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
              <div className="text-[13px] font-bold text-foreground mb-3">📋 ประวัติออเดอร์ล่าสุด</div>
              {history.length === 0 ? (
                <div className="text-[12px] text-muted-foreground text-center py-4">ไม่มีประวัติ</div>
              ) : history.map((h, i) => (
                <div key={h.id} className={cn("flex items-center gap-3 py-2.5 text-[12px]", i > 0 && "border-t border-border")}>
                  <span className="font-mono font-bold text-foreground w-16 shrink-0">{h.order_number}</span>
                  <span className="text-[11px] text-muted-foreground flex-1">{new Date(h.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border",
                    h.channel === 'line_man' ? "bg-success/10 text-success border-success/30" : "bg-primary/10 text-primary border-primary/30")}>
                    {h.channel || 'walk_in'}
                  </span>
                  <span className="font-mono text-[12px] font-bold text-primary w-16 text-right tabular-nums">฿{Number(h.total || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Loyalty tx */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
              <div className="text-[13px] font-bold text-foreground mb-3">🎯 ประวัติแต้มสะสม</div>
              {loyaltyTx.length === 0 ? (
                <div className="text-[12px] text-muted-foreground text-center py-4">ไม่มีประวัติ</div>
              ) : loyaltyTx.map((tx, i) => (
                <div key={tx.id} className={cn("flex items-center gap-3 py-2 text-[12px]", i > 0 && "border-t border-border")}>
                  <span className={cn("font-mono font-bold w-16 text-right tabular-nums shrink-0",
                    tx.points_change > 0 ? "text-success" : "text-danger")}>
                    {tx.points_change > 0 ? '+' : ''}{tx.points_change}
                  </span>
                  <span className="flex-1 text-muted-foreground">{tx.description || tx.type}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString('th-TH')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-lg">
            <div className="text-[16px] font-bold text-foreground mb-4">{editMode ? '✏️ แก้ไขลูกค้า' : '➕ เพิ่มลูกค้าใหม่'}</div>
            <div className="space-y-3">
              {[
                { key: 'name', label: 'ชื่อ *', type: 'text' },
                { key: 'phone', label: 'เบอร์โทร', type: 'tel' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'line_id', label: 'LINE ID', type: 'text' },
                { key: 'birthday', label: 'วันเกิด', type: 'date' },
                { key: 'allergens', label: 'แพ้อาหาร (คั่นด้วย ,)', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[11px] font-bold text-muted-foreground">{f.label}</label>
                  <input type={f.type} value={(formData as any)[f.key]}
                    onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl border border-border text-[13px] font-bold text-muted-foreground hover:bg-muted transition-colors">ยกเลิก</button>
              <button onClick={handleSave} disabled={!formData.name} className="flex-1 py-2 rounded-xl text-[13px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 disabled:opacity-40">บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust points modal */}
      {adjustPoints.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-lg">
            <div className="text-[16px] font-bold text-foreground mb-4">🎁 ปรับแต้ม — {selected?.name}</div>
            <div className="text-[13px] text-muted-foreground mb-3">แต้มปัจจุบัน: <span className="font-bold text-primary">{(selected?.points || 0).toLocaleString()} pts</span></div>
            <input type="number" value={adjustPoints.amount || ''}
              onChange={e => setAdjustPoints(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
              placeholder="จำนวนแต้ม (+ เพิ่ม / - ลด)"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[13px] text-foreground mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input type="text" value={adjustPoints.reason}
              onChange={e => setAdjustPoints(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="เหตุผล..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-[13px] text-foreground mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <div className="flex gap-2">
              <button onClick={() => setAdjustPoints({ show: false, amount: 0, reason: '' })} className="flex-1 py-2 rounded-xl border border-border text-[13px] font-bold text-muted-foreground hover:bg-muted">ยกเลิก</button>
              <button onClick={handleAdjustPoints} disabled={adjustPoints.amount === 0} className="flex-1 py-2 rounded-xl text-[13px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 disabled:opacity-40">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Loyalty Tiers ──────────────────────────────────
function LoyaltyTiersTab() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [tierCounts, setTierCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from('loyalty_tiers').select('*').order('sort_order').then(({ data }) => { if (data) setTiers(data); });
    supabase.from('customers').select('tier').then(({ data }) => {
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((c: any) => { counts[c.tier || 'member'] = (counts[c.tier || 'member'] || 0) + 1; });
        setTierCounts(counts);
      }
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="text-[14px] font-bold text-foreground mb-4">🏆 ระดับสมาชิก — Tier Journey</div>
        <div className="flex gap-3">
          {tiers.map((tier, i) => (
            <div key={tier.id} className="flex-1">
              <div className={cn("p-4 rounded-2xl border text-center", tierColorCls(tier.name))}>
                <div className="text-[28px] leading-none">{tier.icon || tierIcon(tier.name)}</div>
                <div className="text-[13px] font-extrabold mt-2">{tier.label}</div>
                <div className="text-[10px] text-muted-foreground">{tier.min_points?.toLocaleString()}+ pts</div>
                <div className="font-mono text-[18px] font-black mt-1 tabular-nums">{tierCounts[tier.name] || 0}</div>
                <div className="text-[9px] text-muted-foreground">สมาชิก</div>
                <div className="mt-2 space-y-0.5">
                  <div className="text-[10px] text-muted-foreground">แต้ม {tier.multiplier}x · ลด {Number(tier.discount_pct)}%</div>
                </div>
              </div>
              <div className="mt-2 space-y-0.5">
                {(tier.perks || []).map((p: string, j: number) => (
                  <div key={j} className="text-[10px] text-muted-foreground">✓ {p}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Stats ──────────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState({ total: 0, byTier: {} as Record<string, number>, totalPoints: 0, totalRedeemed: 0 });
  const [topCustomers, setTopCustomers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('customers').select('tier, points, total_spent').then(({ data }) => {
      if (data) {
        const byTier: Record<string, number> = {};
        let totalPts = 0;
        data.forEach((c: any) => {
          byTier[c.tier || 'member'] = (byTier[c.tier || 'member'] || 0) + 1;
          totalPts += c.points || 0;
        });
        setStats(prev => ({ ...prev, total: data.length, byTier, totalPoints: totalPts }));
      }
    });

    supabase.from('customers').select('name, phone, tier, points, total_spent, visit_count')
      .order('total_spent', { ascending: false }).limit(5)
      .then(({ data }) => { if (data) setTopCustomers(data); });

    supabase.from('loyalty_transactions').select('points_change, type')
      .eq('type', 'redeem')
      .then(({ data }) => {
        if (data) setStats(prev => ({ ...prev, totalRedeemed: data.reduce((s, t) => s + Math.abs(t.points_change), 0) }));
      });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Stat icon="👥" label="ลูกค้าทั้งหมด" value={stats.total.toString()} sub="คน" colorCls="text-primary" />
        <Stat icon="🎯" label="แต้มรวมในระบบ" value={stats.totalPoints.toLocaleString()} sub="pts" colorCls="text-accent" />
        <Stat icon="🔄" label="แต้มที่แลกใช้" value={stats.totalRedeemed.toLocaleString()} sub="pts" colorCls="text-warning" />
      </div>

      <div className="flex gap-4">
        {/* Tier breakdown */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-[14px] font-bold text-foreground mb-3">📊 แยกตาม Tier</div>
          {Object.entries(stats.byTier).map(([tier, count]) => (
            <div key={tier} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
              <span className="text-[18px]">{tierIcon(tier)}</span>
              <span className="text-[13px] font-bold text-foreground flex-1 capitalize">{tier}</span>
              <span className="font-mono text-[14px] font-bold text-primary tabular-nums">{count}</span>
              <div className="w-24 h-2 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Top 5 */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-[14px] font-bold text-foreground mb-3">🏆 Top 5 ลูกค้ายอดใช้จ่ายสูงสุด</div>
          {topCustomers.map((c, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0">
              <span className="text-[14px] font-black text-muted-foreground w-6 text-center">#{i + 1}</span>
              <span className="text-[18px]">{tierIcon(c.tier || 'member')}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-foreground truncate">{c.name}</div>
                <div className="text-[10px] text-muted-foreground">{c.visit_count || 0} ครั้ง · {(c.points || 0).toLocaleString()} pts</div>
              </div>
              <span className="font-mono text-[14px] font-bold text-primary tabular-nums">฿{Number(c.total_spent || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main CRM Screen ───────────────────────────────────────
const TABS = [
  { label: "👥 ลูกค้า" },
  { label: "🏆 Loyalty Tiers" },
  { label: "📊 สถิติ" },
];

export function CRMScreen() {
  const [tab, setTab] = useState(0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="px-5 pt-4 pb-0 border-b border-border bg-card shrink-0">
        <div className="flex items-end gap-1">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={cn("px-4 py-2.5 rounded-t-xl text-[13px] font-semibold border-b-2 transition-all whitespace-nowrap",
                tab === i ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
        {tab === 0 && <CustomerTab />}
        {tab === 1 && <LoyaltyTiersTab />}
        {tab === 2 && <StatsTab />}
      </div>
    </div>
  );
}
