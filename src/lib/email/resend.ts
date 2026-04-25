import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.INVITE_FROM_EMAIL ?? "My 0to1 <onboarding@resend.dev>";
const BASE_URL = process.env.INVITE_BASE_URL ?? "https://www.my0to1.com";

let client: Resend | null = null;

function getClient(): Resend {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (!client) client = new Resend(apiKey);
  return client;
}

export async function sendInviteEmail(input: { to: string; code: string }): Promise<void> {
  const { to, code } = input;
  const loginUrl = `${BASE_URL}/login?code=${encodeURIComponent(code)}`;

  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>My 0to1 초대</title></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Apple SD Gothic Neo',sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
    <div style="margin-bottom:32px;">
      <p style="margin:0;font-size:14px;font-weight:600;color:#7c3aed;letter-spacing:0.05em;text-transform:uppercase;">My 0to1</p>
      <h1 style="margin:8px 0 0 0;font-size:22px;line-height:1.4;color:#1a1a1a;">알파 초대를 보냅니다</h1>
    </div>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">
      안녕하세요. My 0to1 알파에 초대합니다 — 1인 창업자가 자기 자신을 이해하고 시장에서 풀 만한 문제를 찾아 솔루션 핏까지 검증하는 0to1 비즈니스 운영체제입니다.
    </p>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;">
      아래 코드로 로그인하시면 바로 사용해 보실 수 있어요.
    </p>
    <div style="margin:0 0 24px 0;padding:20px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;text-align:center;">
      <p style="margin:0 0 8px 0;font-size:12px;color:#7c3aed;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">초대 코드</p>
      <p style="margin:0;font-size:28px;letter-spacing:0.16em;font-family:'SFMono-Regular',Menlo,monospace;font-weight:600;color:#1a1a1a;">${code}</p>
    </div>
    <div style="margin:0 0 24px 0;text-align:center;">
      <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;">로그인하기</a>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#666666;">
      링크가 안 열리면 <a href="${BASE_URL}/login" style="color:#7c3aed;">${BASE_URL}/login</a>에 직접 접속해 위 코드를 입력하세요.
    </p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #e5e5e5;">
    <p style="margin:0;font-size:12px;line-height:1.6;color:#999999;">
      이 메일은 my0to1.com 알파 초대 신청에 응해 발송됐습니다. 신청한 적이 없다면 무시해 주세요.
    </p>
  </div>
</body></html>`;

  const text = `My 0to1 알파에 초대합니다.

초대 코드: ${code}

아래 링크로 로그인하세요:
${loginUrl}

링크가 안 열리면 ${BASE_URL}/login에 접속해 위 코드를 입력해 주세요.`;

  await getClient().emails.send({
    from: FROM,
    to,
    subject: "My 0to1 알파 초대 코드",
    html,
    text,
  });
}
