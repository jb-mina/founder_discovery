import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AccumulatedLearning } from "@/lib/db/dashboard";

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

  const items: { label: string; value: number; variant: "green" | "red" | "amber" | "violet" | "default" | "blue" }[] = [
    { label: "확인된 가설", value: data.confirmedAxes, variant: "green" },
    { label: "깨진 가설", value: data.brokenAxes, variant: "red" },
    { label: "진행 중 가설", value: data.inProgressAxes, variant: "amber" },
    { label: "Reality Check", value: data.realityCheckCount, variant: "blue" },
    { label: "확인된 솔루션", value: data.confirmedSolutions, variant: "green" },
    { label: "깨진 솔루션", value: data.brokenSolutions, variant: "red" },
    { label: "보류된 솔루션", value: data.shelvedSolutions, variant: "default" },
  ];

  return (
    <Card className="bg-wash">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-semibold text-foreground">누적 컨텍스트</p>
        <p className="text-[11px] text-subtle">
          깰수록·살릴수록 깊어지는 Real moat
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <Badge key={it.label} variant={it.variant} className="text-[11px]">
            {it.label} <span className="ml-1 font-bold">{it.value}</span>
          </Badge>
        ))}
      </div>
    </Card>
  );
}
