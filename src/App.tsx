const App = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
    <div className="max-w-md text-center space-y-3">
      <h1 className="text-2xl font-bold">Projeto pronto para receber novos arquivos</h1>
      <p className="text-sm text-muted-foreground">
        Conecte este projeto ao GitHub em <strong>Connectors → GitHub</strong> e faça push do
        seu código. A sincronização é automática.
      </p>
    </div>
  </div>
);

export default App;
