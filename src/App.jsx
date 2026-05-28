
import { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import html2canvas from "html2canvas";

const allowedDistortionNames = [
  "災難化",
  "非黑即白",
  "過度概括",
  "情緒化推理",
  "否定正面經驗",
  "讀心術",
  "應該化",
  "標籤化",
  "個人化",
  "放大負面"
];

const systemPrompt = `
你是一位溫柔、理性、不批判的情緒整理助手。
你的工作不是提供心靈雞湯，而是協助用戶理解情緒、辨認可能的非理性思維、提供較平衡的新視角，以及建立溫柔而實際的小行動。

非常重要：
非理性思維 / 思想偏差只能從以下「標準學術名稱清單」選擇，不得自行創作新名稱，不得改寫名稱，不得使用近義詞，不得使用「全球化思維」「比較化思維」「完美主義思維」等非清單名稱。

標準學術名稱清單：
1. 災難化
2. 非黑即白
3. 過度概括
4. 情緒化推理
5. 否定正面經驗
6. 讀心術
7. 應該化
8. 標籤化
9. 個人化
10. 放大負面

如果用戶的想法看似屬於其他名稱，請改用最接近的清單名稱。

請只輸出有效 JSON，不要輸出 markdown，不要加任何解釋文字。

格式必須是：
{
  "emotion": ["情緒1", "情緒2"],
  "distortion": [
    {
      "name": "必須是標準學術名稱清單其中之一",
      "explanation": "用簡短、溫柔、易明的方式解釋這種思維如何出現在用戶的想法中。"
    }
  ],
  "awareness": "一段溫柔的察覺整理",
  "reframe": "一段較平衡的新視角",
  "action": "一個極小但可做到的小行動"
}
`;

const defaultDistortionInfo = {
  "災難化": "傾向把事情想像成最壞結果，好像問題一定會全面失控。可以先提醒自己：現在只是其中一個困難時刻，不等於整件事已經完結。",
  "非黑即白": "把事情看成只有成功或失敗、好或壞，忽略中間還有很多可能性。可以嘗試問自己：有沒有第三種解讀？",
  "過度概括": "因為一次經驗，就推論所有事情都會一樣。可以提醒自己：一次經驗不代表永遠如此。",
  "情緒化推理": "因為自己感到很糟，就認定事情一定真的很糟。情緒是真實的，但未必等於全部事實。",
  "否定正面經驗": "忽略自己做得到、曾經努力或曾經成功的部分，只集中在不足。可以嘗試補回一件你已經做過的事。",
  "讀心術": "假設別人一定在負面評價自己，但其實未必有足夠證據。可以先把『我肯定他這樣想』改成『我擔心他可能這樣想』。",
  "應該化": "對自己或他人有很多『應該』、『必須』，令壓力變得更大。可以把『我一定要』改成『我希望可以慢慢做到』。",
  "標籤化": "用一個負面標籤定義自己，例如『我很失敗』。一個狀態不等於整個人。",
  "個人化": "把事情過度歸咎於自己，覺得所有問題都是自己的責任。可以分開：哪些是我的責任，哪些不是？",
  "放大負面": "把負面部分放得很大，令其他事實被蓋過。可以嘗試同時看見困難和資源。"
};

const distortionAliasMap = {
  "全球化思維": "過度概括",
  "全面化思維": "過度概括",
  "全面化推論": "過度概括",
  "以偏概全": "過度概括",
  "過份概括": "過度概括",
  "過分概括": "過度概括",
  "完美主義思維": "應該化",
  "完美主義": "應該化",
  "必須化": "應該化",
  "應該思維": "應該化",
  "讀心": "讀心術",
  "猜測別人想法": "讀心術",
  "自我標籤": "標籤化",
  "負面標籤": "標籤化",
  "自責": "個人化",
  "過度責任化": "個人化",
  "個人化歸因": "個人化",
  "負面放大": "放大負面",
  "放大負面經驗": "放大負面",
  "貶低正面": "否定正面經驗",
  "忽略正面": "否定正面經驗",
  "二分法": "非黑即白",
  "二元思維": "非黑即白",
  "黑白思維": "非黑即白",
  "災難性思維": "災難化",
  "災難式思維": "災難化",
  "情緒推理": "情緒化推理",
  "比較化思維": "放大負面"
};

function standardizeDistortionName(name) {
  const raw = String(name || "").trim();

  if (allowedDistortionNames.includes(raw)) return raw;
  if (distortionAliasMap[raw]) return distortionAliasMap[raw];

  const compact = raw.replace(/\s/g, "");

  if (compact.includes("全球") || compact.includes("全面") || compact.includes("以偏概全")) return "過度概括";
  if (compact.includes("完美") || compact.includes("必須") || compact.includes("應該")) return "應該化";
  if (compact.includes("讀心") || compact.includes("別人想")) return "讀心術";
  if (compact.includes("標籤") || compact.includes("廢") || compact.includes("失敗的人")) return "標籤化";
  if (compact.includes("自責") || compact.includes("責任") || compact.includes("怪自己")) return "個人化";
  if (compact.includes("放大") || compact.includes("負面")) return "放大負面";
  if (compact.includes("正面") || compact.includes("優點")) return "否定正面經驗";
  if (compact.includes("黑白") || compact.includes("二元") || compact.includes("二分")) return "非黑即白";
  if (compact.includes("災難") || compact.includes("最壞")) return "災難化";
  if (compact.includes("情緒")) return "情緒化推理";

  return "過度概括";
}

function normalizeDistortions(input) {
  if (!input) return [];

  const arr = Array.isArray(input) ? input : [input];

  const normalized = arr
    .map((item) => {
      if (typeof item === "string") {
        const name = standardizeDistortionName(item);
        return {
          name,
          explanation: defaultDistortionInfo[name]
        };
      }

      if (typeof item === "object" && item !== null) {
        const rawName =
          item.name ||
          item.title ||
          item.type ||
          item.label ||
          item.distortion ||
          "過度概括";

        const name = standardizeDistortionName(rawName);

        return {
          name,
          explanation:
            item.explanation ||
            item.description ||
            item.reason ||
            item.detail ||
            defaultDistortionInfo[name]
        };
      }

      return null;
    })
    .filter(Boolean);

  const unique = [];
  const seen = new Set();

  normalized.forEach((item) => {
    if (!seen.has(item.name)) {
      seen.add(item.name);
      unique.push(item);
    }
  });

  return unique;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Invalid JSON response");
  }
}

function shorten(text, max = 52) {
  const raw = String(text || "");
  if (raw.length <= max) return raw;
  return raw.slice(0, max) + "…";
}

export default function App() {
  const [thought, setThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("home");
  const [selectedDistortion, setSelectedDistortion] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("receipts") || "[]");
    setHistory(saved);
  }, []);

  const currentDistortions = useMemo(
    () => normalizeDistortions(receipt?.distortion),
    [receipt]
  );

  const updateHistory = (updated) => {
    setHistory(updated);
    localStorage.setItem("receipts", JSON.stringify(updated));
  };

  const saveReceipt = (data) => {
    const id = data.id || `receipt-${Date.now()}`;
    const withId = { ...data, id };

    const exists = history.some((item) => item.id === id);
    const updated = exists
      ? history.map((item) => (item.id === id ? { ...item, ...withId } : item))
      : [withId, ...history];

    updateHistory(updated);
    return withId;
  };

  const generateReceipt = async () => {
    if (!thought.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: thought },
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!res.ok) {
        throw new Error("OpenAI API request failed");
      }

      const data = await res.json();
      const parsed = safeJsonParse(data.choices?.[0]?.message?.content || "{}");

      const normalizedDistortions = normalizeDistortions(parsed.distortion);

      const normalized = {
        id: `receipt-${Date.now()}`,
        input: thought,
        emotion: Array.isArray(parsed.emotion) ? parsed.emotion : [],
        distortion: normalizedDistortions.length > 0
          ? normalizedDistortions
          : [
              {
                name: "過度概括",
                explanation: defaultDistortionInfo["過度概括"]
              }
            ],
        awareness: parsed.awareness || "你正在嘗試理解一個不容易承受的念頭，這本身已經是一種覺察。",
        reframe: parsed.reframe || "也許這個想法正在反映你的壓力，而不是反映你的全部能力或價值。",
        action: parsed.action || "先停一停，喝一口水，然後寫下現在最需要處理的一小步。",
        date: new Date().toLocaleString(),
        favorite: false,
        cardSaved: false
      };

      const saved = saveReceipt(normalized);
      setReceipt(saved);
      setTab("receipt");
    } catch (e) {
      alert("OpenAI API Error，請檢查 API Key 或網絡設定。");
      console.error(e);
    }

    setLoading(false);
  };

  const openDistortion = (item) => {
    const name = standardizeDistortionName(item.name);

    setSelectedDistortion({
      name,
      explanation:
        item.explanation ||
        defaultDistortionInfo[name]
    });
  };

  const addCurrentToRecord = () => {
    if (!receipt) return;
    const saved = saveReceipt({
      ...receipt,
      distortion: normalizeDistortions(receipt.distortion),
      cardSaved: true
    });
    setReceipt(saved);
    alert("已加入紀錄");
  };

  const toggleFavorite = () => {
    if (!receipt) return;

    const updatedReceipt = {
      ...receipt,
      favorite: !receipt.favorite
    };

    setReceipt(updatedReceipt);

    const updated = history.some((item) => item.id === updatedReceipt.id)
      ? history.map((item) => item.id === updatedReceipt.id ? updatedReceipt : item)
      : [updatedReceipt, ...history];

    updateHistory(updated);
  };

  const makeCardCanvas = async () => {
    if (!cardRef.current) return null;

    return await html2canvas(cardRef.current, {
      backgroundColor: "#f5f2ec",
      scale: 2,
      useCORS: true
    });
  };

  const downloadCard = async () => {
    const canvas = await makeCardCanvas();
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `thought-rewrite-card-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const shareCard = async () => {
    const canvas = await makeCardCanvas();
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], "thought-rewrite-card.png", {
        type: "image/png"
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Thought Rewrite Card",
          text: "我的轉念小卡",
          files: [file]
        });
      } else if (navigator.share) {
        await navigator.share({
          title: "Thought Rewrite Card",
          text: receipt?.reframe || "我的轉念小卡"
        });
      } else {
        alert("此瀏覽器未支援直接分享，已改為下載圖片。");
        downloadCard();
      }
    }, "image/png");
  };

  const chartData = history.map((item, i) => ({
    name: i + 1,
    value: normalizeDistortions(item.distortion).length || 1,
  }));

  return (
    <div className="min-h-screen p-4 pb-28 bg-[#f5f2ec]">
      {tab === "home" && (
        <div className="max-w-xl mx-auto pt-10 fade-up">
          <div className="receipt p-8">
            <h1 className="text-5xl font-black tracking-wide">
              THOUGHT REWRITE
            </h1>

            <p className="mt-4 text-gray-500 leading-relaxed">
              We help you reframe difficult thoughts,
              one receipt at a time.
            </p>

            <div className="mt-10">
              <p className="font-bold mb-3">你現在的想法</p>

              <textarea
                value={thought}
                onChange={(e) => setThought(e.target.value)}
                placeholder="是不是所有事情都失控了..."
                className="w-full h-52 rounded-2xl border border-gray-300 bg-[#faf8f3] p-5 text-lg"
              />

              <button
                onClick={generateReceipt}
                disabled={loading}
                className="mt-6 w-full bg-black text-white py-4 rounded-2xl tracking-[0.3em] active:scale-[0.98] transition disabled:opacity-60"
              >
                {loading ? "PRINTING..." : "CHECKOUT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "receipt" && receipt && (
        <div className="max-w-xl mx-auto pt-8 fade-up">
          <div className="receipt p-8 relative">
            <h2 className="text-5xl font-black text-center">RECEIPT</h2>

            <p className="mt-3 text-center text-xs text-gray-400 tracking-[0.3em]">
              THOUGHT RECEIPT
            </p>

            <div className="mt-10 space-y-10">
              <section>
                <p className="text-sm text-gray-500">01. INPUT</p>
                <p className="mt-3 text-2xl leading-relaxed">
                  {receipt.input}
                </p>
              </section>

              <section>
                <p className="text-sm text-gray-500">02. BE AWARE OF</p>

                <p className="mt-4 text-xs font-bold tracking-[0.2em] text-gray-400">
                  EMOTION
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {receipt.emotion?.length > 0 ? (
                    receipt.emotion.map((e, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-gray-100 text-sm"
                      >
                        {e}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">未有情緒標籤</span>
                  )}
                </div>

                <p className="mt-6 text-xs font-bold tracking-[0.2em] text-gray-400">
                  IRRATIONAL THOUGHTS｜只使用標準學術名稱｜點擊查看解釋
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {currentDistortions.length > 0 ? (
                    currentDistortions.map((d, i) => (
                      <button
                        type="button"
                        key={`${d.name}-${i}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openDistortion(d);
                        }}
                        className="cursor-pointer px-4 py-2 rounded-full border border-black/20 bg-white text-sm shadow-sm hover:bg-black hover:text-white active:scale-95 transition"
                      >
                        {standardizeDistortionName(d.name)} ⓘ
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        openDistortion({
                          name: "過度概括",
                          explanation: defaultDistortionInfo["過度概括"]
                        })
                      }
                      className="cursor-pointer px-4 py-2 rounded-full border border-black/20 bg-white text-sm shadow-sm hover:bg-black hover:text-white active:scale-95 transition"
                    >
                      查看思想偏差說明 ⓘ
                    </button>
                  )}
                </div>

                <p className="mt-5 text-gray-600 leading-relaxed">
                  {receipt.awareness}
                </p>
              </section>

              <section>
                <p className="text-sm text-gray-500">03. REFRAME</p>

                <p className="mt-4 leading-loose text-lg">
                  {receipt.reframe}
                </p>
              </section>

              <section>
                <p className="text-sm text-gray-500">04. ACTION</p>

                <p className="mt-4 leading-loose text-lg">
                  {receipt.action}
                </p>
              </section>

              <button
                type="button"
                onClick={() => setTab("card")}
                className="w-full rounded-2xl bg-black text-white py-4 tracking-[0.18em] active:scale-[0.98] transition"
              >
                生成轉念小卡 CARD
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "card" && receipt && (
        <div className="max-w-2xl mx-auto pt-6 fade-up">
          <div className="text-center mb-5">
            <h2 className="text-4xl font-black tracking-wide">轉念小卡</h2>
            <p className="text-sm text-gray-500 mt-2 tracking-[0.2em]">
              THOUGHT REWRITE CARD
            </p>
          </div>

          <div
            ref={cardRef}
            className="bg-[#f5f2ec] p-4 rounded-[2rem]"
          >
            <div className="mx-auto max-w-xl bg-[#fffdf8] rounded-[2rem] shadow-2xl border border-black/10 overflow-hidden">
              <div className="p-7 text-center border-b border-dashed border-gray-300">
                <div className="mx-auto w-12 h-7 rounded-lg border border-gray-300 mb-4 flex items-center justify-center text-xs">
                  ◌
                </div>
                <h3 className="text-3xl font-black">轉念小卡</h3>
                <p className="text-xs tracking-[0.28em] text-gray-500 mt-2">
                  THOUGHT REWRITE CARD
                </p>
                <div className="mt-4 flex justify-between text-xs text-gray-400">
                  <span>NO. {String(receipt.id || Date.now()).slice(-8)}</span>
                  <span>{receipt.date || new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <span className="px-3 py-1 rounded-full bg-[#eee8dd] text-xs font-bold">
                    原來的想法
                  </span>
                  <p className="mt-4 text-2xl leading-relaxed">
                    “{shorten(receipt.input, 58)}”
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
                  <div className="rounded-3xl bg-[#f8e9e5] p-5 border border-black/5">
                    <p className="font-black tracking-[0.18em] text-sm">
                      轉念前 BEFORE
                    </p>

                    <div className="mt-5 space-y-5 text-sm leading-relaxed">
                      <div>
                        <p className="font-bold">情緒狀態</p>
                        <p className="text-gray-600 mt-1">
                          {receipt.emotion?.join("、") || "混亂、壓力"}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold">內在對話</p>
                        <p className="text-gray-600 mt-1">
                          {shorten(receipt.awareness, 60)}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold">思維模式</p>
                        <p className="text-gray-600 mt-1">
                          {currentDistortions.map(d => d.name).join("、") || "過度概括"}
                        </p>
                      </div>
                    </div>

                    <p className="mt-6 text-right text-2xl italic text-gray-400">
                      before
                    </p>
                  </div>

                  <div className="hidden md:flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl">
                      →
                    </div>
                  </div>

                  <div className="rounded-3xl bg-[#eef3e9] p-5 border border-black/5">
                    <p className="font-black tracking-[0.18em] text-sm">
                      轉念後 AFTER
                    </p>

                    <div className="mt-5 space-y-5 text-sm leading-relaxed">
                      <div>
                        <p className="font-bold">情緒狀態</p>
                        <p className="text-gray-600 mt-1">
                          較穩定、較清晰、可行動
                        </p>
                      </div>

                      <div>
                        <p className="font-bold">新的理解</p>
                        <p className="text-gray-600 mt-1">
                          {shorten(receipt.reframe, 70)}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold">思維轉化</p>
                        <p className="text-gray-600 mt-1">
                          從單一負面解讀，轉向較平衡的理解。
                        </p>
                      </div>
                    </div>

                    <p className="mt-6 text-right text-2xl italic text-gray-400">
                      after
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  <div className="rounded-3xl border border-black/10 p-5">
                    <p className="font-black tracking-[0.18em] text-sm">
                      小行動 ACTION
                    </p>
                    <p className="mt-3 text-sm leading-loose text-gray-700">
                      {receipt.action}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-black/10 p-5">
                    <p className="font-black tracking-[0.18em] text-sm">
                      給未來的自己 REMINDER
                    </p>
                    <p className="mt-3 text-sm leading-loose text-gray-700">
                      你正在努力整理自己，這已經很不容易。慢慢來，也是一種前進。
                    </p>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-300 mt-6 pt-6 text-center">
                  <p className="text-xl leading-relaxed">
                    “ 理解自己，就是改變的開始。 ”
                  </p>
                  <p className="text-xs tracking-[0.28em] text-gray-400 mt-3">
                    THOUGHT REWRITE
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-24 mt-5 bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-black/10 overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-gray-200 text-sm">
              <button onClick={downloadCard} className="py-4 active:bg-gray-100">
                ↓<br />下載
              </button>
              <button onClick={shareCard} className="py-4 active:bg-gray-100">
                ⤴<br />分享
              </button>
              <button onClick={toggleFavorite} className="py-4 active:bg-gray-100">
                {receipt.favorite ? "★" : "☆"}<br />收藏
              </button>
              <button onClick={addCurrentToRecord} className="py-4 active:bg-gray-100">
                ▤<br />加入紀錄
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="max-w-xl mx-auto pt-8">
          <h2 className="text-4xl font-black mb-6">Past Receipts</h2>

          <div className="space-y-4">
            {history.length === 0 && (
              <div className="receipt p-6 text-gray-500">
                暫時未有紀錄。
              </div>
            )}

            {history.map((item, i) => (
              <div
                key={i}
                className="receipt p-5 cursor-pointer"
                onClick={() => {
                  const normalizedItem = {
                    ...item,
                    distortion: normalizeDistortions(item.distortion)
                  };
                  setReceipt(normalizedItem);
                  setTab("receipt");
                }}
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-xs text-gray-500">{item.date}</p>
                    <p className="mt-2 text-lg font-semibold line-clamp-2">
                      {item.input}
                    </p>
                  </div>
                  <div className="text-xl">{item.favorite ? "★" : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "insights" && (
        <div className="max-w-xl mx-auto pt-8">
          <h2 className="text-4xl font-black mb-6">Insights</h2>

          <div className="receipt p-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="value" stroke="#111" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedDistortion && (
        <div
          className="fixed inset-0 bg-black/45 flex items-center justify-center p-6 z-[9999]"
          onClick={() => setSelectedDistortion(null)}
        >
          <div
            className="bg-[#fdfcf9] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-black/10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs tracking-[0.25em] text-gray-400 mb-3">
              STANDARD COGNITIVE DISTORTION
            </p>

            <h3 className="text-2xl font-black mb-4">
              {selectedDistortion.name}
            </h3>

            <p className="text-gray-650 leading-loose">
              {selectedDistortion.explanation}
            </p>

            <button
              type="button"
              onClick={() => setSelectedDistortion(null)}
              className="mt-6 w-full bg-black text-white py-3 rounded-2xl active:scale-[0.98] transition"
            >
              關閉
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-lg rounded-full px-4 py-3 flex gap-4 shadow-lg z-40 text-sm">
        <button onClick={() => setTab("home")}>INPUT</button>
        <button onClick={() => setTab("receipt")}>RECEIPT</button>
        <button onClick={() => receipt && setTab("card")}>CARD</button>
        <button onClick={() => setTab("history")}>PAST</button>
        <button onClick={() => setTab("insights")}>INSIGHTS</button>
      </div>
    </div>
  );
}
