import { Card, CardContent } from "@/components/ui/card";

export function StatsCard({ label, value, hint, icon: Icon, tone = "primary" }) {
  const toneClass =
    tone === "accent"
      ? "bg-accent text-accent-foreground"
      : tone === "secondary"
        ? "bg-secondary text-secondary-foreground"
        : "bg-primary text-primary-foreground";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <h3 className="mt-3 text-3xl font-extrabold tracking-tight">{value}</h3>
            {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
          </div>
          <div className={`rounded-2xl p-3 ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
