import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AccumulatedLearning } from "@/lib/db/dashboard";

type BadgeItem = {
  label: string;
  value: number;
  variant: "green" | "red" | "amber" | "violet" | "default" | "blue";
};

export function AccumulatedLearningStrip({ data }: { data: AccumulatedLearning }) {
  const allZero =
    data.confirmedAxes === 0 &&
    data.brokenAxes === 0 &&
    data.inProgressAxes === 0 &&
    data.realityCheckCount === 0 &&
    data.shelvedSolutions === 0 &&
    data.confirmedSolutions === 0 &&
    data.brokenSolutions === 0;

  if (allZero) return null;

  const hypothesisItems: BadgeItem[] = [
    { label: "확인됨", value: data.confirmedAxes, variant: "green" },
    { label: "깨짐", value: data.brokenAxes, variant: "red" },
    { label: "진행 중", value: data.inProgressAxes, variant: "amber" },
  ];
  const solutionItems: BadgeItem[] = [
    { label: "확인됨", value: data.confirmedSolutions, variant: "green" },
    { label: "깨짐", value: data.brokenSolutions, variant: "red" },
    { label: "보류", value: data.shelvedSolutions, variant: "default" },
    { label: "Reality Check", value: data.realityCheckCount, variant: "blue" },
  ];

  return (
    <Card className="bg-wash">
      <p className="text-h2 font-semibold text-foreground mb-3">누적 컨텍스트</p>
      <div className="space-y-2.5">
        <Group label="가설" items={hypothesisItems} />
        <Group label="솔루션" items={solutionItems} />
      </div>
    </Card>
  );
}

function Group({ label, items }: { label: string; items: BadgeItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted w-12 shrink-0">{label}</span>
      {items.map((it) => (
        <Badge key={it.label} variant={it.variant}>
          {it.label} <span className="ml-1 font-bold">{it.value}</span>
        </Badge>
      ))}
    </div>
  );
}
