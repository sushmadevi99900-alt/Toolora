import { Card } from "./Card";

/** Visible FAQ list (also used as the source for FAQPage JSON-LD). */
export function Faq({ items, headingLevel = 3 }: { items: { question: string; answer: string }[]; headingLevel?: 2 | 3 }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      {items.map((f) => (
        <Card key={f.question} className="p-5">
          {headingLevel === 2 ? (
            <h2 className="text-base font-bold text-(--foreground)">{f.question}</h2>
          ) : (
            <h3 className="text-base font-bold text-(--foreground)">{f.question}</h3>
          )}
          <p className="mt-1.5 text-[15px] leading-relaxed text-(--muted)">{f.answer}</p>
        </Card>
      ))}
    </div>
  );
}
