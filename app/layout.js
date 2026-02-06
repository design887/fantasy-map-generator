export const metadata = {
  title: "Fantasy Map Generator",
  description: "Procedural fantasy map generator with AI enhancement",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
