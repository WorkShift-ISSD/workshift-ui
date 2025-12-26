"use client";

import { useState, useRef, useEffect } from "react";
import { FaRobot, FaTimes, FaPaperPlane } from "react-icons/fa";

interface Message {
  id: number;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export default function AsistenteBot() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      type: 'bot',
      text: '¡Hola! Soy el asistente de WorkShift. ¿En qué puedo ayudarte?',
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus en textarea cuando se abre
  useEffect(() => {
    if (open) {
      textareaRef.current?.focus();
    }
  }, [open]);

  async function handleAsk() {
    if (!question.trim()) return;

    // Agregar pregunta del usuario
    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      text: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Limpiar input INMEDIATAMENTE
    const currentQuestion = question;
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("/api/docs/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion }),
      });

      const data = await res.json();

      // Agregar respuesta del bot
      const botMessage: Message = {
        id: Date.now() + 1,
        type: 'bot',
        text: data.answer || 'Lo siento, no pude procesar tu pregunta.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error al consultar:', error);
      
      const errorMessage: Message = {
        id: Date.now() + 1,
        type: 'bot',
        text: 'Hubo un error al procesar tu pregunta. Por favor intenta de nuevo.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  // Enviar con Enter (Shift+Enter para nueva línea)
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  return (
    <>
      {/* BOTÓN FLOTANTE */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-4 bg-blue-600 text-white rounded-full p-4 shadow-2xl hover:bg-blue-700 transition-all hover:scale-110 z-50"
        aria-label="Abrir asistente"
      >
        <FaRobot className="w-5 h-5" />
      </button>

      {/* VENTANA DEL CHAT */}
      {open && (
        <div className="fixed bottom-24 right-6 w-96 bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col z-50 max-h-[600px]">
          {/* HEADER */}
          <div className="bg-blue-600 text-white p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaRobot className="w-6 h-6" />
              <div>
                <h3 className="font-bold">Asistente WorkShift</h3>
                <p className="text-xs opacity-90">
                  {loading ? 'Escribiendo...' : 'En línea'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="hover:bg-blue-700 rounded-full p-2 transition-colors"
              aria-label="Cerrar"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>

          {/* MENSAJES CON SCROLL */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-800 max-h-[400px] min-h-[300px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none shadow-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-xs mt-1 ${
                    msg.type === 'user' ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {msg.timestamp.toLocaleTimeString('es-AR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg rounded-bl-none shadow-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div className="p-4 bg-white dark:bg-gray-900 rounded-b-xl border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                className="flex-1 p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Escribe tu pregunta... (Enter para enviar)"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                onClick={handleAsk}
                disabled={loading || !question.trim()}
                className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all self-end"
                aria-label="Enviar"
              >
                <FaPaperPlane className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Presiona Enter para enviar, Shift+Enter para nueva línea
            </p>
          </div>
        </div>
      )}
    </>
  );
}