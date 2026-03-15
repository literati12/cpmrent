export const metadata = {
  title: "CPMRent App",
  description: "CPM gép nyilvántartó rendszer",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  )
}