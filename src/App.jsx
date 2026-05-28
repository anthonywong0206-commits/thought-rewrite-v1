import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const systemPrompt = `
你是一位溫柔、理性、不批判的情緒整理助手。
請輸出 JSON：
{
  "emotion": [],
  "distortion": [],
  "awareness": "",
  "reframe": "",
  "action": ""
}
`;

export default function App() {
  const [thought, setThought] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("home");

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("receipts") || "[]");
    setHistory(saved);
  }, []);

  const saveReceipt = (data) => {
    const updated = [data, ...history];
    setHistory(updated);
    localStorage.setItem("receipts", JSON.stringify(updated));
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
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: thought,
            },
          ],
          response_format: { type: "json_object" }
        }),
      });

      const data = await res.json();
      const parsed = JSON.parse(data.choices[0].message.content);

      const finalData = {
        input: thought,
        ...parsed,
        date: new Date().toLocaleString(),
      };

      setReceipt(finalData);
      saveReceipt(finalData);
      setTab("receipt");
    } catch (e) {
      alert("OpenAI API Error");
      console.error(e);
    }

    setLoading(false);
  };

  const chartData = history.map((item, i) => ({
    name: i + 1,
    value: item.emotion?.length || 1,
  }));

  return (
    <div className="min-h-screen p-4 pb-24">
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
                className="mt-6 w-full bg-black text-white py-4 rounded-2xl tracking-[0.3em]"
              >
                {loading ? "PRINTING..." : "CHECKOUT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "receipt" && receipt && (
        <div className="max-w-xl mx-auto pt-8 fade-up">
          <div className="receipt p-8">
            <h2 className="text-5xl font-black text-center">RECEIPT</h2>

            <div className="mt-10 space-y-10">
              <section>
                <p className="text-sm text-gray-500">01. INPUT</p>
                <p className="mt-3 text-2xl leading-relaxed">
                  {receipt.input}
                </p>
              </section>

              <section>
                <p className="text-sm text-gray-500">02. BE AWARE OF</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {receipt.emotion?.map((e, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-gray-100 text-sm"
                    >
                      {e}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {receipt.distortion?.map((d, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full border text-sm"
                    >
                      {d}
                    </span>
                  ))}
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
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="max-w-xl mx-auto pt-8">
          <h2 className="text-4xl font-black mb-6">Past Receipts</h2>

          <div className="space-y-4">
            {history.map((item, i) => (
              <div
                key={i}
                className="receipt p-5 cursor-pointer"
                onClick={() => {
                  setReceipt(item);
                  setTab("receipt");
                }}
              >
                <p className="text-xs text-gray-500">{item.date}</p>
                <p className="mt-2 text-lg font-semibold line-clamp-2">
                  {item.input}
                </p>
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

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-lg rounded-full px-4 py-3 flex gap-5 shadow-lg">
        <button onClick={() => setTab("home")}>INPUT</button>
        <button onClick={() => setTab("receipt")}>RECEIPT</button>
        <button onClick={() => setTab("history")}>PAST</button>
        <button onClick={() => setTab("insights")}>INSIGHTS</button>
      </div>
    </div>
  );
}