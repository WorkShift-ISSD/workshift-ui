"use client";

import { useState } from "react";
import { FaRobot } from "react-icons/fa";

export default function AsistenteBot() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");

    const res = await fetch("/api/docs/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();
    setAnswer(data.answer);
    setLoading(false);
  }

  return (
    <>
      {/* BOTÓN FLOTANTE */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-4 bg-blue-600 text-white rounded-full p-3 shadow-2xl hover:bg-blue-700 transition-all hover:scale-110 z-50"
      >
        <FaRobot className="w-7 h-7" />
      </button>

      {/* VENTANA DEL CHAT */}
      {open && (
        <div className="fixed bottom-20 right-6 w-80 bg-gray-900 text-white p-2 rounded-xl shadow-xl">
          <h3 className="text-lg font-bold mb-2">Asistente de WorkShift</h3>

          <textarea
            className="w-full p-2 bg-gray-800 rounded mb-2"
            rows={3}
            placeholder="Preguntá algo sobre la app..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <button
            onClick={handleAsk}
            className="w-full bg-green-600 p-2 rounded hover:bg-green-700"
          >
            Preguntar
          </button>

          {loading && <p className="mt-2 text-sm">Analizando...</p>}

          {answer && (
            <div className="mt-3 p-2 bg-gray-800 rounded text-sm">
              {answer}
            </div>
          )}
        </div>
      )}
    </>
  );
}
