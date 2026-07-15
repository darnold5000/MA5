type AuthCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md border border-border bg-surface p-6 sm:p-8">
      <h1 className="font-display text-3xl tracking-wide uppercase">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
