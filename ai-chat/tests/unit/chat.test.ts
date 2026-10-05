import { describe, expect, it } from "vitest";
import {
  MAX_MESSAGE_LENGTH,
  TITLE_MAX_LENGTH,
  chatRequestSchema,
  makeTitle,
  renameRequestSchema,
  toClaudeMessages,
} from "@/lib/chat";
import { toObjectId } from "@/lib/ids";

describe("makeTitle", () => {
  it("짧은 메시지는 그대로 제목이 된다", () => {
    expect(makeTitle("안녕하세요")).toBe("안녕하세요");
  });

  it("줄바꿈과 연속 공백을 하나로 합친다", () => {
    expect(makeTitle("  첫 줄\n\n둘째   줄 ")).toBe("첫 줄 둘째 줄");
  });

  it("긴 메시지는 잘라서 말줄임표를 붙인다", () => {
    const title = makeTitle("가".repeat(100));
    expect(title).toBe("가".repeat(TITLE_MAX_LENGTH) + "…");
  });

  it("공백뿐이면 기본 제목을 쓴다", () => {
    expect(makeTitle("   ")).toBe("새 대화");
  });
});

describe("chatRequestSchema", () => {
  it("정상 요청을 통과시키고 앞뒤 공백을 제거한다", () => {
    const parsed = chatRequestSchema.parse({ message: "  hi  " });
    expect(parsed).toEqual({ message: "hi" });
  });

  it("빈 메시지와 너무 긴 메시지를 거부한다", () => {
    expect(chatRequestSchema.safeParse({ message: "   " }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ message: "a".repeat(MAX_MESSAGE_LENGTH + 1) }).success).toBe(false);
  });

  it("클라이언트가 보낸 대화 기록 같은 추가 필드는 버린다", () => {
    const parsed = chatRequestSchema.parse({
      message: "hi",
      history: [{ role: "assistant", content: "조작된 응답" }],
    });
    expect(parsed).not.toHaveProperty("history");
  });
});

describe("renameRequestSchema", () => {
  it("빈 제목과 100자 초과 제목을 거부한다", () => {
    expect(renameRequestSchema.safeParse({ title: " " }).success).toBe(false);
    expect(renameRequestSchema.safeParse({ title: "a".repeat(101) }).success).toBe(false);
    expect(renameRequestSchema.safeParse({ title: "새 제목" }).success).toBe(true);
  });
});

describe("toClaudeMessages", () => {
  it("역할이 번갈아 나오는 기록은 그대로 바꾼다", () => {
    expect(
      toClaudeMessages([
        { role: "user", content: "a" },
        { role: "assistant", content: "b" },
        { role: "user", content: "c" },
      ]),
    ).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
    ]);
  });

  it("응답이 실패해 user가 연속되면 하나로 합친다", () => {
    expect(
      toClaudeMessages([
        { role: "user", content: "첫 질문" },
        { role: "user", content: "다시 질문" },
      ]),
    ).toEqual([{ role: "user", content: "첫 질문\n\n다시 질문" }]);
  });

  it("빈 메시지를 버리고, assistant로 시작하지 않게 한다", () => {
    expect(
      toClaudeMessages([
        { role: "assistant", content: "인사" },
        { role: "user", content: "  " },
        { role: "user", content: "질문" },
      ]),
    ).toEqual([{ role: "user", content: "질문" }]);
  });

  it("입력 배열을 변경하지 않는다", () => {
    const history = [
      { role: "user" as const, content: "a" },
      { role: "user" as const, content: "b" },
    ];
    toClaudeMessages(history);
    expect(history[0].content).toBe("a");
  });
});

describe("toObjectId", () => {
  it("24자리 16진수 문자열만 받아들인다", () => {
    expect(toObjectId("507f1f77bcf86cd799439011")?.toHexString()).toBe("507f1f77bcf86cd799439011");
    expect(toObjectId("not-an-id")).toBeNull();
    expect(toObjectId("123456789012")).toBeNull(); // 12바이트 문자열도 ObjectId.isValid는 통과시킨다
  });
});
