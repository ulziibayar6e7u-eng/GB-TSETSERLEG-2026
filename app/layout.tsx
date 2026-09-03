import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Гурванбулаг Цэцэрлэг | Удирдлагын систем",
  description: "Баянхонгор аймгийн Гурванбулаг сумын Хүүхдийн цэцэрлэгийн нэгдсэн удирдлагын систем",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="mn" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-800">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
