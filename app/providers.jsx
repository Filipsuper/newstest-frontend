"use client";

import { AppProvider } from "./providers/AppProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { ModalProvider } from "./providers/ModalProvider";

export default function Providers({ children }) {
  return (
    <AppProvider>
      <ThemeProvider>
        <AuthProvider>
          <ModalProvider>{children}</ModalProvider>
        </AuthProvider>
      </ThemeProvider>
    </AppProvider>
  );
}
