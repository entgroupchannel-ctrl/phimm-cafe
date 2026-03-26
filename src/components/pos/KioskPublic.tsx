import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KioskScreen } from "./KioskScreen";

export function KioskPublic() {
  const { tableId } = useParams();
  const [tableLabel, setTableLabel] = useState<string | null>(null);

  useEffect(() => {
    if (tableId) {
      supabase.from('tables').select('label').eq('id', tableId).single()
        .then(({ data }) => setTableLabel(data?.label || null));
    }
  }, [tableId]);

  return <KioskScreen tableId={tableId} tableLabel={tableLabel} isPublic={true} />;
}
