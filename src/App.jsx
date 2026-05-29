
import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";

const LOGO_URL = "/logo.png";

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
非理性思維 / 思想偏差只能從以下「標準學術名稱清單」選擇，不得自行創作新名稱，不得改寫名稱，不得使用近義詞。

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
        return { name, explanation: defaultDistortionInfo[name] };
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

function ReceiptPrinter({ stage = "printing" }) {
  const progressText =
    stage === "analyzing" ? "AI 正在分析你的想法…" :
    stage === "printing" ? "正在打印轉念收據…" :
    "收據已生成！";

  return (
    <div className="max-w-md mx-auto pt-12 text-center fade-up">
      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] text-[#9b7b63] font-black">THOUGHT REWRITE</p>
        <h2 className="text-4xl font-black mt-3">思維重整小票機</h2>
        <p className="text-gray-500 mt-3">把混亂的念頭，印成可以理解的收據。</p>
      </div>

      <div className="printer-wrap mx-auto">
        <div className="printer-paper-top">
          <div className="paper-lines">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div className="printer-body">
          <div className="printer-face">
            <div className="printer-eye"></div>
            <div className="printer-smile"></div>
            <div className="printer-light"></div>
          </div>
          <div className="printer-slot"></div>
        </div>

        <div className="printed-receipt">
          <p className="text-[10px] tracking-[0.25em]">RECEIPT</p>
          <div className="mini-barcode"></div>
          <p className="text-xs mt-2">{progressText}</p>
        </div>
      </div>

      <div className="mt-10 bg-white/80 rounded-3xl p-5 shadow-xl border border-black/5">
        <div className="h-3 rounded-full bg-[#eadfd3] overflow-hidden">
          <div className={`h-full bg-[#8fbf6f] rounded-full ${stage === "done" ? "w-full" : "printer-progress"}`}></div>
        </div>
        <p className="mt-4 text-sm text-gray-600">{progressText}</p>
        <div className="mt-3 flex justify-center gap-2">
          <span className="dot"></span>
          <span className="dot delay-1"></span>
          <span className="dot delay-2"></span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [thought, setThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [tab, setTab] = useState("home");
  const [selectedDistortion, setSelectedDistortion] = useState(null);
  const [favorite, setFavorite] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [printerStage, setPrinterStage] = useState("idle");
  const cardRef = useRef(null);
  const receiptStoryRef = useRef(null);

  const currentDistortions = useMemo(
    () => normalizeDistortions(receipt?.distortion),
    [receipt]
  );

  const generateReceipt = async () => {
    if (!thought.trim()) {
      alert("請先輸入你的想法。");
      return;
    }

    setLoading(true);
    setPrinterStage("analyzing");
    setTab("printing");

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

      if (!res.ok) throw new Error("OpenAI API request failed");

      setPrinterStage("printing");

      const data = await res.json();
      const parsed = safeJsonParse(data.choices?.[0]?.message?.content || "{}");
      const normalizedDistortions = normalizeDistortions(parsed.distortion);

      const normalized = {
        id: `TR-${Date.now()}`,
        input: thought,
        emotion: Array.isArray(parsed.emotion) ? parsed.emotion : [],
        distortion: normalizedDistortions.length > 0
          ? normalizedDistortions
          : [{ name: "過度概括", explanation: defaultDistortionInfo["過度概括"] }],
        awareness: parsed.awareness || "你正在嘗試理解一個不容易承受的念頭，這本身已經是一種覺察。",
        reframe: parsed.reframe || "也許這個想法正在反映你的壓力，而不是反映你的全部能力或價值。",
        action: parsed.action || "先停一停，喝一口水，然後寫下現在最需要處理的一小步。",
        date: new Date().toLocaleString()
      };

      setReceipt(normalized);
      setFavorite(false);
      setReceiptPreview(null);

      setTimeout(() => {
        setPrinterStage("done");
        setTimeout(() => {
          setTab("receipt");
          setLoading(false);
        }, 700);
      }, 1700);

    } catch (e) {
      setLoading(false);
      setPrinterStage("idle");
      setTab("home");
      alert("OpenAI API Error，請檢查 API Key 或網絡設定。");
      console.error(e);
    }
  };

  const openDistortion = (item) => {
    const name = standardizeDistortionName(item.name);
    setSelectedDistortion({
      name,
      explanation: item.explanation || defaultDistortionInfo[name]
    });
  };

  const addCurrentToRecord = () => {
    if (!receipt) return;
    const saved = JSON.parse(localStorage.getItem("receipts") || "[]");
    const exists = saved.some((item) => item.id === receipt.id);
    const updated = exists ? saved : [{ ...receipt, favorite }, ...saved];
    localStorage.setItem("receipts", JSON.stringify(updated));
    alert("已加入紀錄");
  };

  const toggleFavorite = () => {
    setFavorite((prev) => !prev);
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

  const makeReceiptStoryCanvas = async () => {
    if (!receiptStoryRef.current) return null;

    await new Promise((resolve) => setTimeout(resolve, 250));

    const target = receiptStoryRef.current;
    const width = target.scrollWidth;
    const height = target.scrollHeight;

    return await html2canvas(target, {
      backgroundColor: "#f7efe5",
      scale: 2,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
      useCORS: true
    });
  };

  const generateReceiptPreview = async () => {
    setPreviewLoading(true);

    try {
      const canvas = await makeReceiptStoryCanvas();
      if (!canvas) return;

      const dataUrl = canvas.toDataURL("image/png");
      setReceiptPreview(dataUrl);
    } catch (error) {
      console.error(error);
      alert("生成預覽失敗，請再試一次。");
    }

    setPreviewLoading(false);
  };

  const downloadReceiptStory = async () => {
    let dataUrl = receiptPreview;

    if (!dataUrl) {
      const canvas = await makeReceiptStoryCanvas();
      if (!canvas) return;
      dataUrl = canvas.toDataURL("image/png");
      setReceiptPreview(dataUrl);
    }

    const link = document.createElement("a");
    link.download = `thought-rewrite-receipt-story-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const shareReceiptStory = async () => {
    let dataUrl = receiptPreview;

    if (!dataUrl) {
      const canvas = await makeReceiptStoryCanvas();
      if (!canvas) return;
      dataUrl = canvas.toDataURL("image/png");
      setReceiptPreview(dataUrl);
    }

    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], "thought-rewrite-receipt-story.png", {
      type: "image/png"
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "Thought Rewrite Receipt",
        text: "我的思維重整收據",
        files: [file]
      });
    } else if (navigator.share) {
      await navigator.share({
        title: "Thought Rewrite Receipt",
        text: receipt?.reframe || "我的思維重整收據"
      });
    } else {
      alert("此瀏覽器未支援直接分享，已改為下載圖片。");
      downloadReceiptStory();
    }
  };

  return (
    <div className="min-h-screen p-4 pb-32 bg-[#f7efe5] relative overflow-x-hidden">
      <style>{`
        body {
          background: #f7efe5;
        }

        .receipt {
          background: #fffdf8;
          border: 1px solid rgba(70, 45, 30, 0.1);
          box-shadow: 0 24px 60px rgba(83, 57, 38, 0.14);
          border-radius: 30px;
        }

        .receipt-paper {
          position: relative;
          background:
            linear-gradient(#fffdf8, #fffaf2),
            repeating-linear-gradient(0deg, rgba(0,0,0,0.025) 0px, rgba(0,0,0,0.025) 1px, transparent 1px, transparent 7px);
          box-shadow: 0 28px 70px rgba(74, 52, 34, 0.16);
        }

        .receipt-paper::before,
        .receipt-paper::after {
          content: "";
          position: absolute;
          left: 0;
          width: 100%;
          height: 14px;
          background: radial-gradient(circle at 8px 7px, #f7efe5 7px, transparent 8px) repeat-x;
          background-size: 16px 14px;
          pointer-events: none;
        }

        .receipt-paper::before {
          top: -1px;
        }

        .receipt-paper::after {
          bottom: -1px;
          transform: rotate(180deg);
        }

        .receipt-export-paper {
          overflow: visible !important;
        }

        .fade-up {
          animation: fadeUp 0.55s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .printer-wrap {
          width: 250px;
          height: 330px;
          position: relative;
        }

        .printer-body {
          position: absolute;
          left: 50%;
          top: 112px;
          transform: translateX(-50%);
          width: 230px;
          height: 155px;
          border-radius: 36px;
          background: linear-gradient(180deg, #fffaf2, #e8dac9);
          box-shadow: 0 30px 60px rgba(80, 56, 35, 0.2), inset 0 -10px 20px rgba(78, 52, 32, 0.08);
          border: 1px solid rgba(90, 60, 35, 0.12);
        }

        .printer-face {
          position: absolute;
          top: 35px;
          left: 50%;
          transform: translateX(-50%);
          width: 72px;
          height: 46px;
          border-radius: 24px;
          background: #1f2a24;
          box-shadow: inset 0 0 14px rgba(255,255,255,0.14);
        }

        .printer-eye::before,
        .printer-eye::after {
          content: "";
          position: absolute;
          top: 17px;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #9df486;
          box-shadow: 0 0 12px #9df486;
        }

        .printer-eye::before { left: 20px; }
        .printer-eye::after { right: 20px; }

        .printer-smile {
          position: absolute;
          left: 50%;
          top: 29px;
          transform: translateX(-50%);
          width: 20px;
          height: 8px;
          border-bottom: 2px solid #9df486;
          border-radius: 0 0 20px 20px;
        }

        .printer-light {
          position: absolute;
          right: -58px;
          bottom: -45px;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: #7ac65b;
          border: 5px solid #ecf4df;
          box-shadow: 0 0 16px #7ac65b;
          animation: pulseLight 1.2s ease-in-out infinite;
        }

        @keyframes pulseLight {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.75; }
        }

        .printer-slot {
          position: absolute;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          width: 160px;
          height: 15px;
          border-radius: 999px;
          background: #6b4b36;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.25);
        }

        .printer-paper-top {
          position: absolute;
          left: 50%;
          top: 0;
          transform: translateX(-50%);
          width: 135px;
          height: 120px;
          background: #fffdf8;
          border: 1px solid rgba(80, 50, 30, 0.12);
          box-shadow: 0 12px 30px rgba(75, 53, 37, 0.12);
          border-radius: 14px 14px 4px 4px;
          animation: paperWiggle 1.4s ease-in-out infinite;
        }

        .paper-lines {
          padding: 28px 18px;
        }

        .paper-lines span {
          display: block;
          height: 7px;
          background: #d9cdbd;
          border-radius: 999px;
          margin-bottom: 12px;
          animation: lineBlink 1.1s infinite;
        }

        .paper-lines span:nth-child(2) { width: 76%; animation-delay: 0.15s; }
        .paper-lines span:nth-child(3) { width: 58%; animation-delay: 0.3s; }

        @keyframes lineBlink {
          0%,100% { opacity: 0.35; }
          50% { opacity: 1; }
        }

        @keyframes paperWiggle {
          0%,100% { transform: translateX(-50%) rotate(-0.4deg); }
          50% { transform: translateX(-50%) rotate(0.5deg); }
        }

        .printed-receipt {
          position: absolute;
          left: 50%;
          top: 245px;
          transform: translateX(-50%);
          width: 150px;
          min-height: 110px;
          background: #fffdf8;
          border-left: 1px solid rgba(80,50,30,0.08);
          border-right: 1px solid rgba(80,50,30,0.08);
          box-shadow: 0 20px 35px rgba(70,45,28,0.16);
          padding: 18px 13px;
          animation: receiptPrint 2.2s ease-in-out infinite;
        }

        .printed-receipt::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -10px;
          width: 100%;
          height: 12px;
          background: radial-gradient(circle at 6px 6px, #f7efe5 6px, transparent 7px) repeat-x;
          background-size: 12px 12px;
        }

        @keyframes receiptPrint {
          0% { height: 52px; transform: translateX(-50%) translateY(-18px); opacity: 0.5; }
          45% { height: 125px; transform: translateX(-50%) translateY(0); opacity: 1; }
          100% { height: 125px; transform: translateX(-50%) translateY(0); opacity: 1; }
        }

        .mini-barcode {
          height: 28px;
          margin-top: 12px;
          background: repeating-linear-gradient(90deg, #111 0 2px, transparent 2px 5px, #111 5px 7px, transparent 7px 12px);
        }

        .printer-progress {
          animation: printerProgress 2.2s ease-in-out infinite;
        }

        @keyframes printerProgress {
          0% { width: 8%; }
          55% { width: 84%; }
          100% { width: 96%; }
        }

        .dot {
          width: 7px;
          height: 7px;
          background: #8fbf6f;
          border-radius: 999px;
          display: inline-block;
          animation: dotPulse 1.2s ease-in-out infinite;
        }

        .delay-1 { animation-delay: 0.18s; }
        .delay-2 { animation-delay: 0.36s; }

        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-4px); }
        }

        .soft-grid {
          background-image:
            radial-gradient(circle at 20% 10%, rgba(143,191,111,0.2), transparent 24%),
            radial-gradient(circle at 85% 18%, rgba(244,180,140,0.22), transparent 26%),
            radial-gradient(circle at 50% 92%, rgba(181,151,120,0.18), transparent 28%);
        }
      `}</style>

      <div className="absolute inset-0 soft-grid pointer-events-none"></div>

      {tab === "home" && (
        <div className="max-w-xl mx-auto pt-7 fade-up relative">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 bg-white/70 border border-black/10 rounded-full px-4 py-2 text-xs font-black tracking-[0.18em] text-[#8a6248] shadow-sm">
              ✦ RECEIPT PRINTER MODE
            </div>
          </div>

          <div className="receipt p-6 md:p-8">
            <div className="receipt-paper rounded-[2rem] p-7">
              <div className="text-center border-b border-dashed border-gray-300 pb-6">
                <div className="mx-auto mb-4 flex justify-center">
                  <img
                    src={LOGO_URL}
                    alt="Thought Rewrite Logo"
                    className="w-24 h-24 object-contain drop-shadow-lg"
                  />
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-wide">
                  THOUGHT REWRITE
                </h1>
                <p className="mt-3 text-sm tracking-[0.2em] text-gray-500">
                  轉念小票
                </p>
                <p className="mt-4 text-gray-500 leading-relaxed">
                  把混亂的念頭，印成可以理解的收據。
                </p>
              </div>

              <div className="mt-8">
                <p className="font-black mb-3 tracking-[0.12em]">你的想法是…</p>

                <textarea
                  value={thought}
                  onChange={(e) => setThought(e.target.value)}
                  placeholder="例如：我覺得自己做得不好，好擔心會失敗..."
                  maxLength={500}
                  className="w-full h-52 rounded-3xl border border-black/10 bg-[#fffaf2] p-5 text-lg shadow-inner resize-none"
                />

                <div className="text-right text-xs text-gray-400 mt-2">
                  {thought.length}/500
                </div>

                <button
                  onClick={generateReceipt}
                  disabled={loading}
                  className="mt-5 w-full bg-[#9f6b60] text-white py-4 rounded-3xl tracking-[0.22em] font-black active:scale-[0.98] transition disabled:opacity-60 shadow-xl"
                >
                  {loading ? "PRINTING..." : "印出我的收據 →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "printing" && (
        <ReceiptPrinter stage={printerStage === "done" ? "done" : printerStage} />
      )}

      {tab === "receipt" && receipt && (
        <div className="max-w-xl mx-auto pt-7 fade-up relative">
          <div className="receipt-paper rounded-[2rem] p-7">
            <div className="text-center border-b border-dashed border-gray-300 pb-6">
              <div className="mx-auto mb-4 flex justify-center">
                <img
                  src={LOGO_URL}
                  alt="Thought Rewrite Logo"
                  className="w-20 h-20 object-contain drop-shadow-md"
                />
              </div>
              <h2 className="text-4xl font-black">思維重整收據</h2>
              <p className="mt-2 text-xs tracking-[0.28em] text-gray-500">
                THOUGHT REWRITE RECEIPT
              </p>

              <div className="mt-4 flex justify-between text-xs text-gray-400">
                <span>NO. {String(receipt.id || Date.now()).slice(-10)}</span>
                <span>{receipt.date}</span>
              </div>
            </div>

            <div className="mt-7 space-y-7">
              <section>
                <p className="text-xs font-black tracking-[0.2em] text-[#9b7b63]">01｜你的想法 INPUT</p>
                <p className="mt-3 text-2xl leading-relaxed">
                  “{receipt.input}”
                </p>
              </section>

              <div className="border-t border-dashed border-gray-300"></div>

              <section>
                <p className="text-xs font-black tracking-[0.2em] text-[#9b7b63]">02｜辨別到的非理性思維</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {currentDistortions.map((d, i) => (
                    <button
                      type="button"
                      key={`${d.name}-${i}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDistortion(d);
                      }}
                      className="cursor-pointer px-4 py-2 rounded-2xl border border-black/10 bg-[#f5eee5] text-sm shadow-sm hover:bg-black hover:text-white active:scale-95 transition"
                    >
                      {standardizeDistortionName(d.name)} ⓘ
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-xs font-black tracking-[0.2em] text-[#9b7b63]">03｜情緒識別 EMOTION</p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(receipt.emotion?.length ? receipt.emotion : ["未有情緒標籤"]).map((e, i) => (
                    <div key={i} className="rounded-2xl bg-white/70 border border-black/10 p-3 text-center text-sm font-bold">
                      {e}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-xs font-black tracking-[0.2em] text-[#9b7b63]">04｜AI 轉念建議</p>

                <p className="mt-4 leading-loose text-gray-700">
                  {receipt.awareness}
                </p>

                <div className="mt-4 rounded-3xl bg-[#eef3e9] p-5 border border-black/5">
                  <p className="text-xs font-black tracking-[0.18em] text-[#6c8e56]">REFRAME</p>
                  <p className="mt-3 leading-loose text-lg">
                    {receipt.reframe}
                  </p>
                </div>

                <div className="mt-4 rounded-3xl bg-[#fff7df] p-5 border border-black/5">
                  <p className="text-xs font-black tracking-[0.18em] text-[#9a7944]">ACTION</p>
                  <p className="mt-3 leading-loose text-lg">
                    {receipt.action}
                  </p>
                </div>
              </section>

              <div className="border-t border-dashed border-gray-300 pt-5">
                <div className="h-12 bg-[repeating-linear-gradient(90deg,#111_0_3px,transparent_3px_6px,#111_6px_8px,transparent_8px_14px)] opacity-80"></div>
                <p className="text-center text-xs tracking-[0.22em] text-gray-400 mt-4">
                  THANK YOU FOR USING THOUGHT REWRITE
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTab("receiptStory")}
                className="w-full rounded-3xl bg-black text-white py-4 tracking-[0.18em] font-black active:scale-[0.98] transition"
              >
                保留收據
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "receiptStory" && receipt && (
        <div className="max-w-md mx-auto pt-6 fade-up relative">
          <div className="text-center mb-5">
            <h2 className="text-4xl font-black tracking-wide">保留收據</h2>
            <p className="text-sm text-gray-500 mt-2 tracking-[0.2em]">
              先產生完整長收據預覽，再下載或分享
            </p>
          </div>

          <div className="rounded-[2rem] bg-white/80 border border-black/10 shadow-2xl p-4">
            {!receiptPreview ? (
              <div className="min-h-[520px] rounded-[1.7rem] bg-[#f7efe5] border border-dashed border-[#c8b5a1] flex flex-col items-center justify-center text-center p-8">
                <div className="printer-wrap scale-[0.68] -my-10"></div>
                <h3 className="text-2xl font-black mt-2">準備生成收據圖</h3>
                <p className="text-gray-500 text-sm mt-3 leading-loose">
                  系統會先生成一張 完整長收據圖片，確認完整後再下載或分享。
                </p>
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-auto rounded-[1.7rem] bg-[#f7efe5] border border-black/10">
                <img
                  src={receiptPreview}
                  alt="思維重整收據預覽"
                  className="w-full h-auto object-contain"
                />
              </div>
            )}
          </div>

          <div className="fixed -left-[9999px] top-0 w-[390px] pointer-events-none">
            <div
              ref={receiptStoryRef}
              className="w-[390px] bg-[#f7efe5] relative overflow-visible"
            >
              <div className="absolute inset-0 soft-grid"></div>

              <div className="relative px-[18px] py-[22px] box-border">
                <div className="text-center mb-[14px]">
                  <div className="inline-flex items-center gap-2 bg-white/80 border border-black/10 rounded-full px-4 py-2 text-[10px] font-black tracking-[0.18em] text-[#8a6248] shadow-sm">
                    ✦ THOUGHT REWRITE
                  </div>

                  <h3 className="text-[30px] leading-tight font-black mt-[14px]">思維重整收據</h3>
                  <p className="text-[10px] tracking-[0.28em] text-gray-500 mt-[6px]">
                    THOUGHT REWRITE RECEIPT
                  </p>
                </div>

                <div className="receipt-paper receipt-export-paper rounded-[24px] px-[18px] py-[20px] box-border overflow-visible w-full">
                  <div className="text-center border-b border-dashed border-gray-300 pb-[12px]">
                    <div className="mx-auto mb-[10px] flex justify-center">
                      <img
                        src={LOGO_URL}
                        alt="Thought Rewrite Logo"
                        className="w-[64px] h-[64px] object-contain"
                      />
                    </div>

                    <div className="flex justify-between text-[9px] text-gray-400">
                      <span>NO. {String(receipt.id || Date.now()).slice(-10)}</span>
                      <span>{receipt.date}</span>
                    </div>
                  </div>

                  <div className="mt-[12px] space-y-[11px]">
                    <section>
                      <p className="text-[9px] font-black tracking-[0.16em] text-[#9b7b63]">
                        01｜INPUT
                      </p>
                      <p className="mt-[6px] text-[16px] leading-[1.55] break-words whitespace-normal">
                        “{shorten(receipt.input, 76)}”
                      </p>
                    </section>

                    <div className="border-t border-dashed border-gray-300"></div>

                    <section>
                      <p className="text-[9px] font-black tracking-[0.16em] text-[#9b7b63]">
                        02｜EMOTION
                      </p>

                      <div className="mt-[7px] flex flex-wrap gap-[6px]">
                        {(receipt.emotion?.length ? receipt.emotion : ["未有情緒標籤"]).slice(0, 4).map((e, i) => (
                          <span
                            key={i}
                            className="px-[10px] py-[4px] rounded-full bg-[#f5eee5] text-[10px] font-bold border border-black/5"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </section>

                    <section>
                      <p className="text-[9px] font-black tracking-[0.16em] text-[#9b7b63]">
                        03｜THINKING PATTERN
                      </p>

                      <div className="mt-[7px] flex flex-wrap gap-[6px]">
                        {currentDistortions.slice(0, 3).map((d, i) => (
                          <span
                            key={`${d.name}-${i}`}
                            className="px-[10px] py-[4px] rounded-full bg-white text-[10px] font-bold border border-black/10"
                          >
                            {standardizeDistortionName(d.name)}
                          </span>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[22px] bg-[#eef3e9] p-[13px] border border-black/5">
                      <p className="text-[9px] font-black tracking-[0.16em] text-[#6c8e56]">
                        REFRAME
                      </p>
                      <p className="mt-[6px] text-[12.5px] leading-[1.68] break-words whitespace-normal">
                        {shorten(receipt.reframe, 128)}
                      </p>
                    </section>

                    <section className="rounded-[22px] bg-[#fff7df] p-[13px] border border-black/5">
                      <p className="text-[9px] font-black tracking-[0.16em] text-[#9a7944]">
                        ACTION
                      </p>
                      <p className="mt-[6px] text-[12.5px] leading-[1.68] break-words whitespace-normal">
                        {shorten(receipt.action, 96)}
                      </p>
                    </section>
                  </div>

                  <div className="mt-[16px] pt-[14px] border-t border-dashed border-gray-300">
                    <p className="text-center text-[8px] tracking-[0.28em] text-gray-400 mb-[6px]">
                      BARCODE
                    </p>
                    <div className="w-full h-[42px] bg-[repeating-linear-gradient(90deg,#111_0_3px,transparent_3px_6px,#111_6px_8px,transparent_8px_14px)] opacity-85"></div>
                    <p className="text-center text-[9px] tracking-[0.2em] text-gray-400 mt-[10px]">
                      理解自己，就是改變的開始
                    </p>
                  </div>
                </div>

                <div className="mt-[16px] text-center">
                  <p className="text-[9px] tracking-[0.22em] text-[#9b7b63] font-black">
                    KEEP THIS RECEIPT FOR YOURSELF
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-28 mt-5 bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-black/10 overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-gray-200 text-sm font-bold">
              <button
                onClick={generateReceiptPreview}
                disabled={previewLoading}
                className="py-4 active:bg-gray-100 disabled:opacity-50"
              >
                ◎<br />{previewLoading ? "生成中" : "產生長收據"}
              </button>
              <button onClick={downloadReceiptStory} className="py-4 active:bg-gray-100">
                ↓<br />下載
              </button>
              <button onClick={shareReceiptStory} className="py-4 active:bg-gray-100">
                ⤴<br />分享
              </button>
              <button onClick={() => setTab("receipt")} className="py-4 active:bg-gray-100">
                ←<br />返回
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "card" && receipt && (
        <div className="max-w-2xl mx-auto pt-6 fade-up relative">
          <div className="text-center mb-5">
            <h2 className="text-4xl font-black tracking-wide">轉念小卡</h2>
            <p className="text-sm text-gray-500 mt-2 tracking-[0.2em]">
              THOUGHT REWRITE CARD
            </p>
          </div>

          <div ref={cardRef} className="bg-[#f7efe5] p-3 rounded-[2rem]">
            <div className="mx-auto max-w-xl bg-[#fffdf8] rounded-[2rem] shadow-2xl border border-black/10 overflow-hidden">
              <div className="p-6 text-center border-b border-dashed border-gray-300">
                <div className="mx-auto mb-4 flex justify-center">
                  <img
                    src={LOGO_URL}
                    alt="Thought Rewrite Logo"
                    className="w-16 h-16 object-contain"
                  />
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

              <div className="p-4 md:p-6">
                <div className="mb-5">
                  <span className="px-3 py-1 rounded-full bg-[#eee8dd] text-xs font-bold">
                    原來的想法
                  </span>
                  <p className="mt-4 text-xl md:text-2xl leading-relaxed break-words">
                    “{shorten(receipt.input, 58)}”
                  </p>
                </div>

                <p className="mb-3 text-xs text-gray-400 tracking-[0.18em] text-center">
                  BEFORE → AFTER
                </p>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-4 items-stretch">
                  <div className="rounded-3xl bg-[#f8e9e5] p-3 md:p-5 border border-black/5 min-w-0 overflow-hidden">
                    <p className="font-black tracking-[0.08em] md:tracking-[0.18em] text-[10px] md:text-sm break-words">
                      轉念前 BEFORE
                    </p>

                    <div className="mt-3 md:mt-5 space-y-3 md:space-y-5 text-[11px] md:text-sm leading-relaxed break-words">
                      <div className="min-w-0">
                        <p className="font-bold">情緒狀態</p>
                        <p className="text-gray-600 mt-1 break-words">
                          {shorten(receipt.emotion?.join("、") || "混亂、壓力", 26)}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold">內在對話</p>
                        <p className="text-gray-600 mt-1 break-words">
                          {shorten(receipt.awareness, 38)}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold">思維模式</p>
                        <p className="text-gray-600 mt-1 break-words">
                          {shorten(currentDistortions.map(d => d.name).join("、") || "過度概括", 26)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 md:mt-6 text-right text-lg md:text-2xl italic text-gray-400">
                      before
                    </p>
                  </div>

                  <div className="hidden md:flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl">
                      →
                    </div>
                  </div>

                  <div className="rounded-3xl bg-[#eef3e9] p-3 md:p-5 border border-black/5 min-w-0 overflow-hidden">
                    <p className="font-black tracking-[0.08em] md:tracking-[0.18em] text-[10px] md:text-sm break-words">
                      轉念後 AFTER
                    </p>

                    <div className="mt-3 md:mt-5 space-y-3 md:space-y-5 text-[11px] md:text-sm leading-relaxed break-words">
                      <div className="min-w-0">
                        <p className="font-bold">情緒狀態</p>
                        <p className="text-gray-600 mt-1 break-words">
                          較穩定、較清晰
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold">新的理解</p>
                        <p className="text-gray-600 mt-1 break-words">
                          {shorten(receipt.reframe, 42)}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold">思維轉化</p>
                        <p className="text-gray-600 mt-1 break-words">
                          轉向較平衡的理解。
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 md:mt-6 text-right text-lg md:text-2xl italic text-gray-400">
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

          <div className="sticky bottom-28 mt-5 bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-black/10 overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-gray-200 text-sm">
              <button onClick={downloadCard} className="py-4 active:bg-gray-100">
                ↓<br />下載
              </button>
              <button onClick={shareCard} className="py-4 active:bg-gray-100">
                ⤴<br />分享
              </button>
              <button onClick={toggleFavorite} className="py-4 active:bg-gray-100">
                {favorite ? "★" : "☆"}<br />收藏
              </button>
              <button onClick={addCurrentToRecord} className="py-4 active:bg-gray-100">
                ▤<br />加入紀錄
              </button>
            </div>
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

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92vw] max-w-md bg-white/95 backdrop-blur-xl rounded-[2rem] px-4 py-4 flex justify-around items-center shadow-2xl border border-black/10 z-40 text-base font-black tracking-[0.12em]">
        <button
          onClick={() => setTab("home")}
          className={`min-w-[86px] py-3 rounded-2xl active:scale-95 transition ${tab === "home" ? "bg-black text-white" : "text-black"}`}
        >
          INPUT
        </button>

        <button
          onClick={() => receipt && setTab("receipt")}
          className={`min-w-[100px] py-3 rounded-2xl active:scale-95 transition ${tab === "receipt" ? "bg-black text-white" : "text-black"} ${!receipt ? "opacity-40" : ""}`}
        >
          RECEIPT
        </button>

        <button
          onClick={() => receipt && setTab("card")}
          className={`min-w-[86px] py-3 rounded-2xl active:scale-95 transition ${tab === "card" ? "bg-black text-white" : "text-black"} ${!receipt ? "opacity-40" : ""}`}
        >
          CARD
        </button>
      </div>
    </div>
  );
}
