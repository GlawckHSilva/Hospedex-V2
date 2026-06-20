import { cn } from "@hospedex/ui";

/**
 * Fundo animado premium usado nas telas de autenticacao.
 *
 * O componente e visual apenas: nao acessa sessao, Supabase Auth nem dados do
 * usuario. Isso evita misturar experiencia de marca com regras de autenticacao.
 */
export function AnimatedLoginBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animated-login-background", className)}
    >
      <span className="auth-ambient-glow auth-ambient-glow--primary" />
      <span className="auth-ambient-glow auth-ambient-glow--secondary" />
      <span className="auth-ambient-glow auth-ambient-glow--deep" />
      <span className="auth-particle-field" />
      <span className="auth-light-beam auth-light-beam--one" />
      <span className="auth-light-beam auth-light-beam--two" />
      <span className="auth-cyan-pulse" />
    </div>
  );
}
