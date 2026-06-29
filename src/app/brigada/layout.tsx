export const metadata = {
  title: 'ESTRATO Brigada',
  description: 'App de captura territorial para brigadistas',
};

export default function BrigadaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-secondary-50">
      {children}
    </div>
  );
}
