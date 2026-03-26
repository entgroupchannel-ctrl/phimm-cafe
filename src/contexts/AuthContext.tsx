import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StaffInfo {
  id: string;
  name: string;
  nickname: string;
  roleId: string;
  roleName: string;
  roleLabel: string;
}

interface AuthContextType {
  staff: StaffInfo | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem("pos_staff");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStaff(parsed.staff);
        setPermissions(parsed.permissions);
      } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const saveSession = (staffInfo: StaffInfo, perms: string[]) => {
    setStaff(staffInfo);
    setPermissions(perms);
    sessionStorage.setItem("pos_staff", JSON.stringify({ staff: staffInfo, permissions: perms }));
  };

  const loginWithPin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc("verify_pin", { input_pin: pin });

      if (error) return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" };
      if (!data || (data as any[]).length === 0) return { success: false, error: "PIN ไม่ถูกต้อง" };

      const row = (data as any[])[0];
      const staffInfo: StaffInfo = {
        id: row.staff_id,
        name: row.staff_name,
        nickname: row.staff_nickname,
        roleId: row.role_id,
        roleName: row.role_name,
        roleLabel: row.role_label,
      };

      const { data: perms } = await supabase.rpc("get_role_permissions", { p_role_id: row.role_id });
      const permList = (perms as string[]) || [];

      saveSession(staffInfo, permList);
      return { success: true };
    } catch {
      return { success: false, error: "เกิดข้อผิดพลาด" };
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) return { success: false, error: "Email หรือ Password ไม่ถูกต้อง" };

      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, nickname, role_id, roles(name, label)")
        .eq("auth_uid", authData.user.id)
        .eq("is_active", true)
        .single();

      if (!staffData) return { success: false, error: "ไม่พบข้อมูลพนักงาน" };

      const staffInfo: StaffInfo = {
        id: staffData.id,
        name: staffData.name,
        nickname: staffData.nickname || "",
        roleId: staffData.role_id,
        roleName: (staffData.roles as any)?.name || "",
        roleLabel: (staffData.roles as any)?.label || "",
      };

      const { data: perms } = await supabase.rpc("get_role_permissions", { p_role_id: staffData.role_id });
      saveSession(staffInfo, (perms as string[]) || []);
      return { success: true };
    } catch {
      return { success: false, error: "เกิดข้อผิดพลาด" };
    }
  };

  const logout = () => {
    setStaff(null);
    setPermissions([]);
    sessionStorage.removeItem("pos_staff");
    supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      staff, permissions,
      isAuthenticated: !!staff,
      isLoading,
      loginWithPin, loginWithEmail, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
