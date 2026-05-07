import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAllPersonaConfigs } from "@/lib/db/reality-check-config";
import { MODEL_PRESETS } from "@/lib/llm";
import { PersonaConfigEditor } from "./PersonaConfigEditor";

const PERSONA_LABELS: Record<string, { title: string; sub: string }> = {
  investor: { title: "냉정한 투자자", sub: "재무·증거 강도 비판" },
  friend: { title: "솔직한 친구", sub: "동기·운영·삶의 맥락 평가" },
  socratic: { title: "소크라테스", sub: "검증되지 않은 가정 질문" },
  moderator: { title: "중재자", sub: "세 페르소나 종합 + 다음 액션" },
};

export default async function RealityCheckSettingsPage() {
  const configs = await getAllPersonaConfigs();

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-tertiary hover:text-secondary mb-4"
      >
        <ArrowLeft size={12} />
        대시보드로
      </Link>

      <h1 className="text-xl font-semibold mb-1">Reality Check 모델 설정</h1>
      <p className="text-sm text-secondary mb-6">
        4개 페르소나 각각이 어떤 LLM을 호출할지 지정합니다. 같은 vendor에서 답이 비슷하게 나오면
        다른 vendor로 바꿔보세요. 변경 즉시 다음 RC 실행부터 적용됩니다.
      </p>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-6 text-xs text-amber-900">
        <p className="font-medium mb-0.5">데이터 거버넌스 안내</p>
        <p>
          OpenRouter 경유 모델(OpenAI / Google / Perplexity)을 선택하면 솔루션·1-pager
          내용이 OpenRouter를 통해 해당 vendor로 전달됩니다. OpenRouter 대시보드에서{" "}
          <strong>로그 보존 끄기 + zero data retention</strong> 옵션을 미리 설정하세요.
        </p>
      </div>

      <div className="space-y-3">
        {configs.map((cfg) => {
          const meta = PERSONA_LABELS[cfg.persona] ?? { title: cfg.persona, sub: "" };
          return (
            <PersonaConfigEditor
              key={cfg.persona}
              persona={cfg.persona}
              title={meta.title}
              subtitle={meta.sub}
              currentVendor={cfg.vendor}
              currentModel={cfg.model}
              presets={MODEL_PRESETS}
            />
          );
        })}
      </div>
    </div>
  );
}
