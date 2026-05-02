export default function Header() {
  return (
    <header className="h-16 border-b bg-card flex items-center px-4 md:px-6">
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">InDict</h1>
          <p className="text-xs text-muted-foreground">Speak. Transcribe. Document.</p>
        </div>
      </div>
    </header>
  );
}
