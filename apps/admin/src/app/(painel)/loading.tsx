export default function Loading() {
  return (
    <div aria-label="Carregando conteudo" className="animate-pulse space-y-4">
      <div className="h-24 rounded-lg border border-border bg-card" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-lg border border-border bg-card" />
        <div className="h-28 rounded-lg border border-border bg-card" />
        <div className="h-28 rounded-lg border border-border bg-card" />
      </div>
      <div className="h-72 rounded-lg border border-border bg-card" />
    </div>
  );
}
