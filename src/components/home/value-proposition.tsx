import { SectionHeading } from "@/components/shared/section-heading";

const benefits = [
  {
    title: "Personalized Programming",
    description:
      "Training built around your goals, schedule, and the way you move.",
  },
  {
    title: "Expert Coaching",
    description:
      "Hands-on guidance that keeps every session focused and productive.",
  },
  {
    title: "Sustainable Results",
    description:
      "Progress you can maintain through consistent training and clear habits.",
  },
] as const;

export function ValueProposition() {
  return (
    <section className="border-b border-border bg-surface px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          title="Fitness Built Around You"
          description="MA5 Performance combines personalized coaching, purposeful programming, and a private training environment in Avon, Indiana."
        />
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {benefits.map((benefit) => (
            <article key={benefit.title}>
              <h3 className="font-display text-2xl tracking-wide uppercase">
                {benefit.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
