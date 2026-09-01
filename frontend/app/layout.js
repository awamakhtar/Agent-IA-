export const metadata = {
  title: "Africa Shopping — Agent Marketing IA",
  description: "Assistant IA marketing pour Africa Shopping",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
