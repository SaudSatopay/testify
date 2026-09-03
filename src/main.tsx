import React from "react";
import ReactDOM from "react-dom/client";

import App from "@/App";
import { SupabaseSetupScreen } from "@/components/shared/SupabaseSetupScreen";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import "@/index.css";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      {isSupabaseConfigured ? (
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            <App />
            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
        </AuthProvider>
      ) : (
        <SupabaseSetupScreen />
      )}
    </ThemeProvider>
  </React.StrictMode>,
);
