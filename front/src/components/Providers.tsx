"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { CartProvider } from "@/context/CartContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // staleTime 0 → queries revalidate on mount so admin edits (products,
        // images, categories, home sections, content) show up without a hard wait.
        defaultOptions: { queries: { staleTime: 0, refetchOnWindowFocus: false } },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>{children}</CartProvider>
    </QueryClientProvider>
  );
}
