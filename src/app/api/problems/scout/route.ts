import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { PROBLEM_CATEGORIES } from "@/lib/problem-categories";

const client = new Anthropic();

const CATEGORY_ENUM_LIST = PROBLEM_CATEGORIES.map((c) => `"${c}"`).join(", ");

const SYSTEM = `당신은 Problem Scout Agent입니다. 창업자가 탐색할 문제 카드를 발굴하는 리서처입니다.

역할:
- 제공된 실제 데이터(Product Hunt, App Store, 투자 뉴스 등)를 분석하여 창업자 관점의 문제를 식별합니다
- 각 문제를 창업자 관점에서 구조화합니다

사용자가 요청하면 다음 형식의 문제 카드를 JSON 배열로 반환하세요:
[
  {
    "title": "한 줄 문제 제목",
    "who": "누가 겪는가 (구체적인 페르소나)",
    "when": "언제 겪는가",
    "why": "왜 겪는가 (근본 원인)",
    "painPoints": "구체적인 불편함과 비용",
    "alternatives": "현재 대체재",
    "source": "yc | sequoia | a16z | producthunt | appstore | news | manual",
    "sourceUrl": "출처 URL",
    "tags": "태그1,태그2",
    "stage": "seed | series-a",
    "category": "허용된 enum 중 정확히 하나"
  }
]

중요:
- 실제 데이터가 제공된 경우: sourceUrl은 반드시 제공된 데이터에 있는 URL만 사용하세요.
- 실제 데이터가 없는 경우: sourceUrl은 빈 문자열("")로 두세요. URL을 추측하거나 생성하지 마세요.
- 투자 뉴스 데이터가 제공된 경우: source는 기사에서 파악 가능한 투자사 이름("yc"/"a16z"/"sequoia") 또는 "news".
- 투자 뉴스 sourceUrl: 반드시 기사 URL(url 필드)을 사용하세요. 스타트업 웹사이트 URL을 추측하거나 생성하지 마세요.
- category 필드는 다음 enum 중 정확히 하나여야 합니다 (절대 새 라벨을 만들지 말 것): ${CATEGORY_ENUM_LIST}.
- 위 enum 중 적합한 것이 없으면 category는 빈 문자열("")로 두세요. 가장 가까운 것에 억지로 매칭하지 마세요.
- 응답은 반드시 JSON 배열만 반환하세요. 설명 텍스트 없이.`;

const PH_TOPIC_MAP: Record<string, string> = {
  productivity: "productivity",
  생산성: "productivity",
  health: "health",
  healthcare: "health",
  헬스: "health",
  헬스케어: "health",
  운동: "health",
  피트니스: "health",
  developer: "developer-tools",
  "b2b": "developer-tools",
  saas: "developer-tools",
  개발자: "developer-tools",
  consumer: "consumer-tech",
  education: "education",
  교육: "education",
  학습: "education",
  자기계발: "education",
  finance: "finance",
  fintech: "finance",
  핀테크: "finance",
  투자: "finance",
  세금: "finance",
  세무: "finance",
  마케팅: "marketing",
  세일즈: "marketing",
  데이터: "tech",
  분석: "tech",
  ai: "artificial-intelligence",
  자동화: "artificial-intelligence",
  web3: "web3",
  크립토: "web3",
  블록체인: "web3",
  바이오: "health",
  딥테크: "tech",
  콘텐츠: "social-media",
  엔터테인먼트: "social-media",
  게임: "games",
  여행: "travel",
  쇼핑: "e-commerce",
  커머스: "e-commerce",
  패션: "lifestyle",
  뷰티: "lifestyle",
  반려: "lifestyle",
  주거: "real-estate",
  부동산: "real-estate",
  육아: "lifestyle",
  가족: "lifestyle",
  멘탈: "health",
  채용: "developer-tools",
  hr: "developer-tools",
  원격: "productivity",
  협업: "productivity",
  환경: "sustainability",
  지속가능성: "sustainability",
  시니어: "health",
  돌봄: "health",
};

const VC_TOPIC_MAP: Record<string, string> = {
  건강: "healthcare", 헬스: "healthcare", 헬스케어: "healthcare",
  운동: "fitness wellness exercise", 피트니스: "fitness wellness exercise",
  생산성: "productivity",
  교육: "education", 학습: "education learning",
  자기계발: "self improvement learning",
  재무: "fintech", 핀테크: "fintech",
  투자: "investing wealth management", 자산관리: "investing wealth management",
  세금: "tax accounting", 세무: "tax accounting", 회계: "tax accounting",
  커리어: "career jobs",
  채용: "HR recruiting talent", hr: "HR recruiting talent",
  원격: "remote work async collaboration", 협업: "remote work async collaboration",
  식품: "food delivery", 음식: "food delivery",
  여행: "travel",
  "b2b": "B2B SaaS enterprise", saas: "B2B SaaS enterprise",
  개발자: "developer tools devtools",
  마케팅: "marketing automation sales", 세일즈: "marketing automation sales",
  데이터: "data analytics BI", 분석: "data analytics BI",
  멘탈: "mental health wellness",
  반려동물: "pet care",
  환경: "sustainability climate", 지속가능성: "sustainability climate",
  쇼핑: "ecommerce shopping", 커머스: "ecommerce shopping",
  엔터테인먼트: "entertainment media",
  콘텐츠: "content creation editing video",
  게임: "gaming game studio",
  시니어: "senior care eldercare", 돌봄: "senior care eldercare",
  ai: "AI automation agents", 자동화: "AI automation agents",
  web3: "web3 crypto blockchain DeFi", 크립토: "web3 crypto blockchain DeFi", 블록체인: "web3 crypto blockchain DeFi",
  바이오: "biotech deeptech synthetic biology", 딥테크: "biotech deeptech synthetic biology",
  패션: "fashion beauty", 뷰티: "fashion beauty",
  주거: "real estate housing proptech", 부동산: "real estate housing proptech",
  육아: "parenting family kids", 가족: "parenting family kids",
};

function stripSourceLabels(s: string): string {
  return s
    .toLowerCase()
    .replace(/투자\s*뉴스/g, "")
    .replace(/product\s*hunt/g, "")
    .replace(/app\s*store|앱스토어/g, "");
}

async function fetchProductHuntPosts(query: string) {
  const lq = stripSourceLabels(query);
  const topic = Object.entries(PH_TOPIC_MAP).find(([k]) => lq.includes(k))?.[1];

  const gql = `{
    posts(first: 15, featured: true, order: VOTES${topic ? `, topic: "${topic}"` : ""}) {
      nodes {
        name
        tagline
        description
        url
        website
        votesCount
        createdAt
        topics { nodes { name } }
      }
    }
  }`;

  const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PRODUCT_HUNT_API_KEY}`,
    },
    body: JSON.stringify({ query: gql }),
  });
  const data = await res.json();
  const posts = data.data?.posts?.nodes ?? [];
  console.log(`[scout] PH ${posts.length} posts, topic: ${topic ?? "none"}`);
  return posts;
}

async function fetchAppStorePosts(count = 50) {
  const res = await fetch(
    `https://rss.marketingtools.apple.com/api/v2/kr/apps/top-free/${count}/apps.json`
  );
  const data = await res.json();
  return (data.feed?.results ?? []).map((a: { name: string; url: string; artistName: string; genres?: { name: string }[] }) => ({
    name: a.name,
    url: a.url,
    artistName: a.artistName,
    genre: a.genres?.[0]?.name ?? "",
  }));
}

async function fetchVCNews(query: string) {
  const lq = stripSourceLabels(query);
  const topicStr = [...new Set(
    Object.entries(VC_TOPIC_MAP)
      .filter(([k]) => lq.includes(k))
      .map(([, v]) => v)
  )].join(" ") || "startup";

  const searchQuery = topicStr !== "startup"
    ? `${topicStr} startup problem 2025 funded investment YC a16z sequoia`
    : `YC a16z sequoia startup 2025 investment problem customers solution`;

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: searchQuery,
      search_depth: "basic",
      include_raw_content: true,
      max_results: 6,
    }),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const data = await res.json();
  const results = (data.results ?? []).map((r: {
    title: string; url: string; content: string; raw_content?: string;
  }) => ({
    title: r.title,
    url: r.url,
    content: r.content,
    raw_content: r.raw_content?.slice(0, 1500),
  }));
  console.log(`[scout] Tavily ${results.length} results, query: "${searchQuery}"`);
  return results;
}

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  const q = query || "최근 Product Hunt featured 제품 중 흥미로운 문제 5개";
  const lq = q.toLowerCase();
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        const send = (s: string) => controller.enqueue(encoder.encode(s));
        try {
          let contextBlock = "";

          if (lq.includes("product hunt")) {
            send("||STAGE||데이터 수집 중\n");
            const posts = await fetchProductHuntPosts(q).catch(() => []);
            contextBlock += `[Product Hunt 데이터]\n${JSON.stringify(posts, null, 2)}\n\n`;
          }

          if (lq.includes("app store") || lq.includes("앱스토어")) {
            send("||STAGE||데이터 수집 중\n");
            const apps = await fetchAppStorePosts(50).catch(() => []);
            contextBlock += `[App Store 랭킹 데이터]\n${JSON.stringify(apps, null, 2)}\n\n`;
          }

          if (lq.includes("투자 뉴스")) {
            send("||STAGE||뉴스 검색 중\n");
            const news = await fetchVCNews(q).catch((e) => {
              console.error("[scout] Tavily failed:", e);
              return [];
            });
            send("||STAGE||스타트업 페이지 분석 중\n");
            if (news.length > 0)
              contextBlock += `[투자 뉴스 데이터]\n${JSON.stringify(news, null, 2)}\n\n`;
          }

          const userMessage = contextBlock
            ? `${contextBlock}위 실제 데이터를 기반으로 다음 요청을 처리하세요. 요청에 명시된 관심 분야와 무관한 내용은 건너뜁니다:\n${q}`
            : q;

          console.log(`[scout] contextBlock ${contextBlock.length} chars, query: "${q}"`);
          send("||STAGE||문제 카드 생성 중\n");

          const stream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: SYSTEM,
            messages: [{ role: "user", content: userMessage }],
          });

          for await (const chunk of stream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              send(chunk.delta.text);
            }
          }
        } catch (e) {
          console.error("[scout]", e);
        }
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
