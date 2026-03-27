import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sun, Moon, Loader2, Save } from "lucide-react";

interface ShopSettings {
  id: string;
  shop_name: string;
  address: string | null;
  phone: string | null;
  tax_id: string | null;
  logo_url: string | null;
  vat_rate: number | null;
  vat_mode: string | null;
  service_charge_pct: number | null;
  receipt_header: string | null;
  receipt_footer: string | null;
  currency: string | null;
  timezone: string | null;
}

const DEFAULT_SETTINGS: Omit<ShopSettings, "id"> = {
  shop_name: "My Shop",
  address: "",
  phone: "",
  tax_id: "",
  logo_url: "",
  vat_rate: 7,
  vat_mode: "included",
  service_charge_pct: 0,
  receipt_header: "",
  receipt_footer: "",
  currency: "THB",
  timezone: "Asia/Bangkok",
};

export function SettingsScreen() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("shop_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code === "PGRST116") {
        // No row — insert default
        const { data: newRow, error: insertErr } = await supabase
          .from("shop_settings")
          .insert(DEFAULT_SETTINGS)
          .select()
          .single();
        if (insertErr) throw insertErr;
        setSettings(newRow as ShopSettings);
      } else if (error) {
        throw error;
      } else {
        setSettings(data as ShopSettings);
      }
    } catch (err: any) {
      toast.error("โหลดการตั้งค่าไม่สำเร็จ: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const saveField = useCallback(async (field: string, value: any) => {
    if (!settings) return;
    setSaving(field);
    try {
      const { error } = await supabase
        .from("shop_settings")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", settings.id);
      if (error) throw error;
      toast.success("✓ บันทึกแล้ว", { duration: 1500 });
    } catch (err: any) {
      toast.error("บันทึกไม่สำเร็จ: " + (err.message || ""));
    } finally {
      setSaving(null);
    }
  }, [settings]);

  const handleChange = (field: keyof ShopSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });

    if (debounceRef.current[field]) clearTimeout(debounceRef.current[field]);
    debounceRef.current[field] = setTimeout(() => saveField(field, value), 600);
  };

  const handleBlur = (field: keyof ShopSettings) => {
    if (!settings) return;
    if (debounceRef.current[field]) {
      clearTimeout(debounceRef.current[field]);
      delete debounceRef.current[field];
    }
    saveField(field, settings[field]);
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        ไม่สามารถโหลดการตั้งค่าได้
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide bg-background">
      <div className="max-w-[740px] mx-auto space-y-4">
        <div className="text-[18px] font-bold text-foreground mb-1 flex items-center gap-2">
          ⚙️ ตั้งค่าระบบ
          {saving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        </div>

        {/* Section 1: Shop Info */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60">
            <div className="text-[14px] font-bold text-foreground">🏪 ข้อมูลร้าน</div>
          </div>
          <div className="p-5 space-y-4">
            <Field label="ชื่อร้าน">
              <Input value={settings.shop_name || ""} onChange={e => handleChange("shop_name", e.target.value)} onBlur={() => handleBlur("shop_name")} />
            </Field>
            <Field label="ที่อยู่">
              <Textarea value={settings.address || ""} onChange={e => handleChange("address", e.target.value)} onBlur={() => handleBlur("address")} rows={2} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="เบอร์โทร">
                <Input value={settings.phone || ""} onChange={e => handleChange("phone", e.target.value)} onBlur={() => handleBlur("phone")} />
              </Field>
              <Field label="เลขประจำตัวผู้เสียภาษี">
                <Input value={settings.tax_id || ""} onChange={e => handleChange("tax_id", e.target.value)} onBlur={() => handleBlur("tax_id")} />
              </Field>
            </div>
            <Field label="Logo URL">
              <Input value={settings.logo_url || ""} onChange={e => handleChange("logo_url", e.target.value)} onBlur={() => handleBlur("logo_url")} placeholder="https://..." />
            </Field>
            {settings.logo_url && (
              <div className="flex justify-center">
                <img src={settings.logo_url} alt="Logo" className="w-20 h-20 object-contain rounded-xl border border-border" onError={e => (e.currentTarget.style.display = "none")} />
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Tax & Payment */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60">
            <div className="text-[14px] font-bold text-foreground">💳 ภาษี & การชำระเงิน</div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Field label="VAT (%)">
                <Input type="number" value={settings.vat_rate ?? 7} onChange={e => handleChange("vat_rate", parseFloat(e.target.value) || 0)} onBlur={() => handleBlur("vat_rate")} />
              </Field>
              <Field label="โหมด VAT">
                <Select value={settings.vat_mode || "included"} onValueChange={v => { handleChange("vat_mode", v); saveField("vat_mode", v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="included">รวมในราคา</SelectItem>
                    <SelectItem value="excluded">แยกนอกราคา</SelectItem>
                    <SelectItem value="none">ไม่คิด VAT</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Service Charge (%)">
                <Input type="number" value={settings.service_charge_pct ?? 0} onChange={e => handleChange("service_charge_pct", parseFloat(e.target.value) || 0)} onBlur={() => handleBlur("service_charge_pct")} />
              </Field>
            </div>
          </div>
        </div>

        {/* Section 3: Receipt */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60">
            <div className="text-[14px] font-bold text-foreground">🧾 ใบเสร็จ</div>
          </div>
          <div className="p-5 space-y-4">
            <Field label="ข้อความหัวใบเสร็จ">
              <Textarea value={settings.receipt_header || ""} onChange={e => handleChange("receipt_header", e.target.value)} onBlur={() => handleBlur("receipt_header")} rows={3} placeholder="ข้อความที่จะแสดงด้านบนใบเสร็จ..." />
            </Field>
            <Field label="ข้อความท้ายใบเสร็จ">
              <Textarea value={settings.receipt_footer || ""} onChange={e => handleChange("receipt_footer", e.target.value)} onBlur={() => handleBlur("receipt_footer")} rows={3} placeholder="ขอบคุณที่อุดหนุน..." />
            </Field>

            {/* Live preview */}
            <div className="mt-2">
              <div className="text-[12px] font-semibold text-muted-foreground mb-2">📃 ตัวอย่างใบเสร็จ</div>
              <div className="bg-white text-black rounded-xl p-4 max-w-[280px] mx-auto text-center font-mono text-[11px] border border-border shadow-sm">
                {settings.receipt_header && <div className="whitespace-pre-wrap mb-2">{settings.receipt_header}</div>}
                <div className="font-bold text-[13px]">{settings.shop_name}</div>
                {settings.address && <div className="text-[10px] mt-0.5">{settings.address}</div>}
                {settings.phone && <div className="text-[10px]">โทร: {settings.phone}</div>}
                {settings.tax_id && <div className="text-[10px]">Tax ID: {settings.tax_id}</div>}
                <div className="border-t border-dashed border-gray-300 my-2" />
                <div className="flex justify-between"><span>ผัดไทย x2</span><span>158.00</span></div>
                <div className="flex justify-between"><span>ชาเย็น x1</span><span>45.00</span></div>
                <div className="border-t border-dashed border-gray-300 my-2" />
                <div className="flex justify-between font-bold"><span>รวม</span><span>203.00</span></div>
                {settings.vat_mode !== "none" && (
                  <div className="flex justify-between text-[10px]"><span>VAT {settings.vat_rate}%</span><span>{settings.vat_mode === "included" ? "(รวมแล้ว)" : `${(203 * (settings.vat_rate ?? 7) / 100).toFixed(2)}`}</span></div>
                )}
                {settings.receipt_footer && (
                  <>
                    <div className="border-t border-dashed border-gray-300 my-2" />
                    <div className="whitespace-pre-wrap">{settings.receipt_footer}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: System */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60">
            <div className="text-[14px] font-bold text-foreground">🔧 ระบบ</div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="สกุลเงิน">
                <Select value={settings.currency || "THB"} onValueChange={v => { handleChange("currency", v); saveField("currency", v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THB">THB (บาท)</SelectItem>
                    <SelectItem value="USD">USD (ดอลลาร์)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Timezone">
                <Select value={settings.timezone || "Asia/Bangkok"} onValueChange={v => { handleChange("timezone", v); saveField("timezone", v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Bangkok">Asia/Bangkok</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[13px] text-muted-foreground font-medium">Dark Mode</span>
              <button onClick={toggleDark} className={cn(
                "w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200",
                dark ? "bg-primary/30" : "bg-border"
              )}>
                <div className={cn(
                  "w-[20px] h-[20px] rounded-full absolute top-[2px] transition-all duration-200 shadow-sm flex items-center justify-center",
                  dark ? "right-[2px] bg-primary" : "left-[2px] bg-muted-foreground/50"
                )}>
                  {dark ? <Sun size={10} className="text-primary-foreground" /> : <Moon size={10} className="text-background" />}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
