import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedisInfo2U Patient Management System",
  description: "MedisInfo2U Patient Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
