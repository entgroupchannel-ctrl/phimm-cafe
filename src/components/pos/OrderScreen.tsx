import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Search, Minus, Plus, Trash2, ChefHat, Receipt, ChevronLeft, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  cat: string;
  img: string;
  popular: boolean;
  qty: number;
  options?: any[];
  optionsText?: string;
  priceAdd?: number;
  note?: string;
  cartUniqueId?: string;
  orderItemId?: string;
  status?: string;
};

interface OrderScreenProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onPay?: () => void;
  onBack?: () => void;
  tableLabel?: string;
  tableId?: string | null;
  orderId?: string | null;
  setOrderId?: (id: string | null) => void;
}

interface MenuItemData {
  id: string;
  name: string;
  price: number;
  cat: string;
  img: string;
  popular: boolean;
}

interface ServedItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  status: string;
  emoji?: string;
  optionsText?: string;
}

export function OrderScreen({ cart, setCart, onPay, onBack, tableLabel = "3", tableId, orderId, setOrderId }: OrderScreenProps) {
  const [activeCat, setActiveCat] = useState("ทั้งหมด");
  const [search, setSearch] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [categories, setCategories] = useState<{ key: string; label: string }[]>([]);
  const [servedItems, setServedItems] = useState<ServedItem[]>([]);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Customization modal state
  const [customizeItem, setCustomizeItem] = useState<MenuItemData | null>(null);
  const [optionGroups, setOptionGroups] = useState<any[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [itemNote, setItemNote] = useState("");
  const [itemQty, setItemQty] = useState(1);

  useEffect(() => { fetchMenu(); }, []);

  async function fetchMenu() {
    const [menuRes, catRes] = await Promise.all([
      supabase.from('menu_items').select('*, menu_categories(name)').eq('is_available', true).order('sort_order'),
      supabase.from('menu_categories').select('*').eq('is_active', true).order('sort_order'),
    ]);
    if (menuRes.data) {
      setMenuItems(menuRes.data.map((m: any) => ({
        id: m.id, name: m.name, price: Number(m.price),
        cat: m.menu_categories?.name || '', img: m.emoji || '🍽', popular: m.is_popular ?? false,
      })));
    }
    if (catRes.data) {
      setCategories([
        { key: 'ทั้งหมด', label: 'ทั้งหมด' },
        { key: 'ยอดนิยม', label: 'ยอดนิยม' },
        ...catRes.data.map((c: any) => ({ key: c.name, label: `${c.icon || ''} ${c.name}`.trim() })),
      ]);
    }
  }

  useEffect(() => {
    if (orderId) loadExistingOrder();
    else setServedItems([]);
  }, [orderId]);

  async function loadExistingOrder() {
    if (!orderId) return;
    const { data } = await supabase
      .from('order_items')
      .select('*, menu_items(name, emoji, price)')
      .eq('order_id', orderId)
      .in('status', ['sent', 'cooking', 'ready', 'served'])
      .order('created_at');
    if (data) {
      setServedItems(data.map((oi: any) => ({
        id: oi.id, name: oi.name, price: Number(oi.price), qty: oi.qty,
        status: oi.status, emoji: oi.menu_items?.emoji, optionsText: oi.options_text,
      })));
    }
  }

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` }, () => loadExistingOrder())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const filtered = menuItems.filter(item => {
    const matchCat = activeCat === "ทั้งหมด" || (activeCat === "ยอดนิยม" ? item.popular : item.cat === activeCat);
    const matchSearch = search === "" || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // ── Customization Modal ──
  async function openCustomize(item: MenuItemData) {
    setCustomizeItem(item);
    setItemNote("");
    setItemQty(1);
    setSelectedOptions({});

    const { data } = await supabase
      .from('menu_option_groups')
      .select('*, menu_options(*)')
      .eq('menu_item_id', item.id)
      .order('sort_order');

    if (data && data.length > 0) {
      setOptionGroups(data.map((g: any) => ({
        ...g,
        menu_options: (g.menu_options || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })));
      const defaults: Record<string, string[]> = {};
      data.forEach((g: any) => {
        const defaultOpts = (g.menu_options || []).filter((o: any) => o.is_default);
        if (defaultOpts.length > 0) defaults[g.id] = defaultOpts.map((o: any) => o.id);
      });
      setSelectedOptions(defaults);
    } else {
      // No options → add directly to cart
      setCustomizeItem(null);
      addToCartDirect(item);
    }
  }

  function addToCartDirect(item: MenuItemData) {
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id && !c.cartUniqueId);
      if (ex) return prev.map(c => c.id === item.id && !c.cartUniqueId ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function toggleOption(groupId: string, optionId: string, type: string) {
    setSelectedOptions(prev => {
      const current = prev[groupId] || [];
      if (type === 'single') {
        return { ...prev, [groupId]: [optionId] };
      } else {
        return {
          ...prev,
          [groupId]: current.includes(optionId) ? current.filter(id => id !== optionId) : [...current, optionId],
        };
      }
    });
  }

  function getExtraPrice() {
    let total = 0;
    optionGroups.forEach(group => {
      const selectedIds = selectedOptions[group.id] || [];
      group.menu_options.forEach((opt: any) => {
        if (selectedIds.includes(opt.id)) total += Number(opt.price_add || 0);
      });
    });
    return total;
  }

  function addToCartWithOptions() {
    if (!customizeItem) return;
    let totalPriceAdd = 0;
    const optionTexts: string[] = [];
    const optionsData: any[] = [];

    optionGroups.forEach(group => {
      const selectedIds = selectedOptions[group.id] || [];
      group.menu_options.forEach((opt: any) => {
        if (selectedIds.includes(opt.id)) {
          totalPriceAdd += Number(opt.price_add || 0);
          if (opt.name !== 'ปกติ') {
            optionTexts.push(opt.price_add > 0 ? `${opt.name} +฿${opt.price_add}` : opt.name);
          }
          optionsData.push({ groupId: group.id, groupName: group.name, optionId: opt.id, optionName: opt.name, priceAdd: opt.price_add });
        }
      });
    });

    if (itemNote.trim()) optionTexts.push(`📝 ${itemNote.trim()}`);

    const cartItem: CartItem = {
      ...customizeItem,
      qty: itemQty,
      options: optionsData,
      optionsText: optionTexts.join(', '),
      priceAdd: totalPriceAdd,
      note: itemNote.trim(),
      cartUniqueId: Date.now().toString(),
    };

    setCart(prev => [...prev, cartItem]);
    setCustomizeItem(null);
  }

  const removeFromCart = (cartUniqueId: string | undefined, id: string) => {
    if (cartUniqueId) {
      setCart(prev => prev.map(c => c.cartUniqueId === cartUniqueId ? { ...c, qty: c.qty - 1 } : c).filter(c => c.qty > 0));
    } else {
      setCart(prev => prev.map(c => c.id === id && !c.cartUniqueId ? { ...c, qty: c.qty - 1 } : c).filter(c => c.qty > 0));
    }
  };

  const increaseCart = (cartUniqueId: string | undefined, id: string) => {
    if (cartUniqueId) {
      setCart(prev => prev.map(c => c.cartUniqueId === cartUniqueId ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart(prev => prev.map(c => c.id === id && !c.cartUniqueId ? { ...c, qty: c.qty + 1 } : c));
    }
  };

  const deleteFromCart = (cartUniqueId: string | undefined, id: string) => {
    if (cartUniqueId) {
      setCart(prev => prev.filter(c => c.cartUniqueId !== cartUniqueId));
    } else {
      setCart(prev => prev.filter(c => !(c.id === id && !c.cartUniqueId)));
    }
  };

  async function sendToKitchen() {
    if (cart.length === 0 || sending) return;
    setSending(true);
    try {
      let oid = orderId;
      if (!oid) {
        const { data: order, error } = await supabase
          .from('orders')
          .insert({ order_number: 'temp', table_id: tableId, order_type: 'dine_in' as any, channel: 'walk_in' as any, status: 'sent' as any, guest_count: 1 })
          .select().single();
        if (error || !order) {
          toast({ title: "เกิดข้อผิดพลาด", description: error?.message || "ไม่สามารถสร้างออเดอร์ได้", variant: "destructive" });
          setSending(false);
          return;
        }
        oid = order.id;
        setOrderId?.(oid);
      }

      const items = cart.map(c => ({
        order_id: oid!,
        menu_item_id: c.id,
        name: c.name,
        price: c.price + (c.priceAdd || 0),
        qty: c.qty,
        note: c.note || null,
        options: c.options || [],
        options_text: c.optionsText || null,
        price_add: c.priceAdd || 0,
        status: 'sent' as any,
        sent_at: new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(items);
      if (itemsError) {
        toast({ title: "เกิดข้อผิดพลาด", description: itemsError.message, variant: "destructive" });
        setSending(false);
        return;
      }
      setCart([]);
      loadExistingOrder();
      toast({ title: "ส่งครัวแล้ว! 🍳", description: `${items.length} รายการ ส่งไปครัวเรียบร้อย` });
    } finally {
      setSending(false);
    }
  }

  const servedTotal = servedItems.reduce((s, i) => s + i.price * i.qty, 0);
  const cartTotal = cart.reduce((s, c) => s + (c.price + (c.priceAdd || 0)) * c.qty, 0);
  const grandTotal = servedTotal + cartTotal;
  const totalQty = servedItems.reduce((s, i) => s + i.qty, 0) + cart.reduce((s, c) => s + c.qty, 0);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'served': return 'เสิร์ฟแล้ว';
      case 'ready': return 'พร้อมเสิร์ฟ';
      case 'cooking': return 'กำลังทำ';
      default: return 'ส่งครัวแล้ว';
    }
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case 'served': return "bg-[hsl(142_64%_38%/0.12)] text-[hsl(142_64%_35%)] border border-[hsl(142_64%_38%/0.25)]";
      case 'ready': return "bg-[hsl(211_100%_50%/0.12)] text-[hsl(211_100%_50%)] border border-[hsl(211_100%_50%/0.25)]";
      default: return "bg-[hsl(38_92%_50%/0.12)] text-[hsl(38_92%_50%)] border border-[hsl(38_92%_50%/0.25)]";
    }
  };

  const extraPrice = getExtraPrice();
  const modalUnitPrice = customizeItem ? customizeItem.price + extraPrice : 0;

  return (
    <div className="flex flex-1 overflow-hidden bg-background">

      {/* ─── LEFT: Menu panel ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Search */}
        <div className="px-4 py-3 border-b border-border bg-[hsl(var(--surface))]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="ค้นหาเมนู / Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-border bg-muted/60 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all" />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 overflow-x-auto scrollbar-hide bg-[hsl(var(--surface))]">
          {categories.map(cat => (
            <button key={cat.key} onClick={() => setActiveCat(cat.key)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all duration-150 select-none active:scale-[0.97]",
                activeCat === cat.key
                  ? "bg-primary text-white border-transparent shadow-[0_2px_8px_hsl(var(--primary)/0.28)]"
                  : "bg-muted/60 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Menu grid */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
          {menuItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl mb-3 opacity-20">📋</div>
                <div className="text-[13px]">กำลังโหลดเมนู...</div>
              </div>
            </div>
          ) : (
            <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
              {filtered.map(item => {
                const inCartQty = cart.filter(c => c.id === item.id).reduce((s, c) => s + c.qty, 0);
                return (
                  <button key={item.id} onClick={() => openCustomize(item)}
                    className={cn(
                      "relative flex flex-col items-start text-left p-3.5 rounded-2xl border transition-all duration-150 select-none active:scale-[0.97]",
                      "bg-[hsl(var(--surface))] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.04)]",
                      inCartQty > 0
                        ? "border-primary/40 shadow-[0_0_0_2px_hsl(var(--primary)/0.15),0_4px_12px_rgba(0,0,0,0.06)]"
                        : "border-border hover:border-border-light hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                    )}>
                    {inCartQty > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-[0_2px_6px_hsl(var(--primary)/0.4)] z-10">
                        {inCartQty}
                      </span>
                    )}
                    {item.popular && (
                      <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.25)] leading-none">
                        ยอดนิยม
                      </span>
                    )}
                    <span className="text-[28px] leading-none mb-2">{item.img}</span>
                    <div className="text-[13px] font-bold text-foreground leading-tight mb-0.5 line-clamp-2">{item.name}</div>
                    <div className="text-[10px] text-muted-foreground mb-2 truncate w-full">{item.cat}</div>
                    <span className="font-mono font-bold text-[14px] tabular-nums" style={{ color: "hsl(var(--primary))" }}>
                      ฿{item.price.toLocaleString()}.00
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT: Order panel ────────────────────────────────── */}
      <div className="w-[340px] shrink-0 flex flex-col overflow-hidden min-h-0 bg-[hsl(var(--surface))] border-l border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <button onClick={onBack}
              className="flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shrink-0"
              title="กลับหน้าโต๊ะ">
              <ChevronLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-black text-foreground">โต๊ะ {tableLabel}</span>
                <span className="text-[11px] text-muted-foreground font-medium">/ Table {tableLabel}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                <span>{totalQty} รายการ</span>
                {orderId && <span className="text-primary/70">📋 มีออเดอร์</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="h-8 px-3 rounded-xl border border-border bg-muted text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">🔗 Party</button>
            <button className="h-8 px-3 rounded-xl border border-border bg-muted text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">🔄 ย้ายโต๊ะ</button>
          </div>
        </div>

        {/* Order list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Served / sent items from DB */}
          {servedItems.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-foreground truncate">
                  {item.emoji && <span className="mr-1">{item.emoji}</span>}
                  {item.name}
                </div>
                {item.optionsText && (
                  <div className="text-[10px] text-[hsl(38_92%_50%)] font-semibold mt-0.5 truncate">⚠️ {item.optionsText}</div>
                )}
              </div>
              <span className={cn("shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-lg", statusStyle(item.status))}>
                {statusLabel(item.status)}
              </span>
              <span className="w-5 text-center font-mono font-bold text-[13px] tabular-nums">{item.qty}</span>
              <div className="font-mono font-bold text-[13px] tabular-nums text-foreground w-16 text-right shrink-0">
                ฿{(item.price * item.qty).toLocaleString()}.00
              </div>
            </div>
          ))}

          {/* New cart items */}
          {cart.map((item, idx) => {
            const key = item.cartUniqueId || `${item.id}-${idx}`;
            return (
              <div key={key} className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-[hsl(var(--primary)/0.03)]">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-foreground truncate">{item.img} {item.name}</div>
                  {item.optionsText && (
                    <div className="text-[10px] text-[hsl(38_92%_50%)] font-semibold mt-0.5 truncate">⚠️ {item.optionsText}</div>
                  )}
                  <div className="text-[11px] text-muted-foreground">
                    ฿{item.price}{(item.priceAdd || 0) > 0 && ` +฿${item.priceAdd}`} / รายการ
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.25)]">ใหม่</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => removeFromCart(item.cartUniqueId, item.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-full border border-border bg-muted text-muted-foreground hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))] transition-colors">
                    <Minus size={11} />
                  </button>
                  <span className="w-5 text-center font-mono font-bold text-[13px] tabular-nums">{item.qty}</span>
                  <button onClick={() => increaseCart(item.cartUniqueId, item.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white shadow-[0_1px_4px_hsl(var(--primary)/0.35)]">
                    <Plus size={11} />
                  </button>
                </div>
                <div className="font-mono font-bold text-[13px] tabular-nums text-foreground w-16 text-right shrink-0">
                  ฿{((item.price + (item.priceAdd || 0)) * item.qty).toLocaleString()}.00
                </div>
                <button onClick={() => deleteFromCart(item.cartUniqueId, item.id)} className="text-muted-foreground/40 hover:text-[hsl(var(--danger))] transition-colors shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}

          {cart.length === 0 && servedItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3 opacity-20">🛒</div>
              <div className="text-[12px]">แตะเมนูเพื่อเพิ่มออเดอร์</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pt-3 pb-4 border-t border-border/60 space-y-3 bg-[hsl(var(--surface))]">
          <div className="flex justify-between items-baseline">
            <span className="text-[12px] text-muted-foreground">ยอดรวม / Subtotal</span>
            <span className="font-mono text-[22px] font-black tabular-nums text-foreground">฿{grandTotal.toLocaleString()}.00</span>
          </div>
          <div className="flex gap-2">
            <button onClick={sendToKitchen} disabled={cart.length === 0 || sending}
              className={cn(
                "flex-1 h-12 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors active:scale-[0.98]",
                cart.length === 0
                  ? "bg-muted text-muted-foreground border border-border cursor-not-allowed"
                  : "bg-[hsl(211_100%_50%/0.12)] text-primary border border-[hsl(211_100%_50%/0.25)] hover:bg-[hsl(211_100%_50%/0.18)]"
              )}>
              <ChefHat size={16} />
              {sending ? "กำลังส่ง..." : "ส่งครัว / Send"}
            </button>
            <button onClick={onPay} disabled={servedItems.length === 0 && cart.length === 0}
              className={cn(
                "flex-1 h-12 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors active:scale-[0.98]",
                servedItems.length === 0 && cart.length === 0
                  ? "bg-muted text-muted-foreground border border-border cursor-not-allowed"
                  : "bg-[hsl(38_92%_50%)] text-white shadow-[0_4px_16px_hsl(38_92%_50%/0.35)] hover:bg-[hsl(38_92%_45%)]"
              )}>
              <Receipt size={16} />
              เช็คบิล / Bill
            </button>
          </div>
        </div>
      </div>

      {/* ─── Customization Modal ──────────────────────────────── */}
      <Dialog open={!!customizeItem} onOpenChange={open => { if (!open) setCustomizeItem(null); }}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-2xl border-border bg-[hsl(var(--surface))]" aria-describedby={undefined}>
          {customizeItem && (
            <>
              {/* Modal Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <span className="text-[32px]">{customizeItem.img}</span>
                <div>
                  <DialogTitle className="text-[16px] font-black text-foreground">{customizeItem.name}</DialogTitle>
                  <div className="text-[13px] font-mono font-bold tabular-nums" style={{ color: "hsl(var(--primary))" }}>
                    ฿{customizeItem.price.toLocaleString()}.00
                  </div>
                </div>
              </div>

              {/* Option Groups */}
              <div className="max-h-[55vh] overflow-y-auto scrollbar-hide px-5 py-4 space-y-5">
                {optionGroups.map(group => (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[13px] font-bold text-foreground">{group.name}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {group.type === 'single' ? '(เลือก 1)' : '(เลือกได้หลายอัน)'}
                      </span>
                      {group.required && <span className="text-[9px] text-[hsl(var(--danger))] font-bold">* จำเป็น</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(group.menu_options || []).map((opt: any) => {
                        const isSelected = (selectedOptions[group.id] || []).includes(opt.id);
                        return (
                          <button key={opt.id} onClick={() => toggleOption(group.id, opt.id, group.type)}
                            className={cn(
                              "min-h-[48px] min-w-[80px] px-4 py-2 rounded-xl text-[13px] font-semibold border-2 transition-all select-none active:scale-[0.97]",
                              isSelected
                                ? group.type === 'single'
                                  ? "bg-primary text-white border-primary shadow-[0_2px_8px_hsl(var(--primary)/0.3)]"
                                  : "bg-primary/10 text-primary border-primary/50"
                                : "bg-muted/60 text-muted-foreground border-border hover:border-border hover:text-foreground"
                            )}>
                            {opt.name}
                            {Number(opt.price_add) > 0 && (
                              <span className="block text-[10px] font-mono opacity-80">+฿{opt.price_add}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Note */}
                <div>
                  <div className="text-[13px] font-bold text-foreground mb-2">📝 หมายเหตุเพิ่มเติม</div>
                  <input type="text" value={itemNote} onChange={e => setItemNote(e.target.value)}
                    placeholder='เช่น "ใส่น้ำจิ้มแยก"'
                    className="w-full h-11 px-4 rounded-xl border border-border bg-muted/60 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                </div>
              </div>

              {/* Qty + Add button */}
              <div className="px-5 py-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-foreground">จำนวน</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setItemQty(q => Math.max(1, q - 1))}
                      className="w-12 h-12 rounded-xl border-2 border-border bg-muted text-foreground text-[18px] font-bold flex items-center justify-center hover:bg-muted/70 transition-colors active:scale-95">−</button>
                    <span className="w-8 text-center font-mono text-[18px] font-black tabular-nums">{itemQty}</span>
                    <button onClick={() => setItemQty(q => q + 1)}
                      className="w-12 h-12 rounded-xl border-2 border-primary bg-primary text-white text-[18px] font-bold flex items-center justify-center hover:opacity-90 transition-opacity active:scale-95">+</button>
                  </div>
                </div>

                {extraPrice > 0 && (
                  <div className="text-[12px] text-muted-foreground text-right">
                    ฿{customizeItem.price} + ฿{extraPrice} = <strong className="text-foreground">฿{modalUnitPrice}</strong> × {itemQty}
                  </div>
                )}

                <button onClick={addToCartWithOptions}
                  className="w-full h-14 rounded-2xl bg-[hsl(142_64%_38%)] text-white text-[15px] font-bold flex items-center justify-center gap-2 shadow-[0_4px_16px_hsl(142_64%_38%/0.35)] hover:bg-[hsl(142_64%_34%)] transition-colors active:scale-[0.98]">
                  ✅ เพิ่มลง Order — ฿{(modalUnitPrice * itemQty).toLocaleString()}.00
                </button>
                <button onClick={() => setCustomizeItem(null)}
                  className="w-full h-11 rounded-2xl border border-border bg-muted text-muted-foreground text-[13px] font-semibold hover:text-foreground transition-colors">
                  ❌ ยกเลิก
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
