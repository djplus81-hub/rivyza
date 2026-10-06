import "./globals.css";

export const metadata = {
  title: "RIVYZA",
  description: "Vive. Conecta. Transmite.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
