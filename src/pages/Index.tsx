import { AuthProvider } from "@/contexts/AuthContext";
import { POSApp } from "@/components/POSApp";

export default function Index() {
  return (
    <AuthProvider>
      <POSApp />
    </AuthProvider>
  );
}
