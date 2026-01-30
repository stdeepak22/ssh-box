import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "SSH Box",
    description: "Secure SSH Key Management",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
