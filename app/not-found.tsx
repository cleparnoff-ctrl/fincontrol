import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Página não encontrada</h2>
      <p className="text-outline mb-8">Não conseguimos encontrar o recurso solicitado.</p>
      <Link href="/" className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold">
        Voltar para o Início
      </Link>
    </div>
  );
}
