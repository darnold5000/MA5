type AuthCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md border border-border bg-surface p-4 sm:p-8">
      <h1 className="font-display text-2xl tracking-wide uppercase sm:text-3xl">
        {title}
      </h1>
      <p className="mt-1.5 text-sm leading-snug text-muted sm:mt-2 sm:leading-relaxed">
        {description}
      </p>
      <div className="mt-4 sm:mt-8">{children}</div>
    </div>
  );
}
