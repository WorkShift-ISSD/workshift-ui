// app/components/WhatsAppChatbot.tsx
"use client";

import { useState } from "react";
import { FaWhatsapp } from "react-icons/fa"; // ✅ Logo oficial de WhatsApp
import { X, Send } from "lucide-react";

export default function WhatsAppChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  
  const phoneNumber = "5492995873256";

  const handleSendMessage = () => {
    if (!message.trim()) return;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
    setMessage("");
  };

  const quickMessages = [
    "Hola, necesito informar una falta",
    "¿Como informo un cambio?",
    "¿Puedo enviar un certificado?",
    "Necesito ayuda con una licencia",
  ];

  return (
    <>
      {/* Botón flotante con logo de WhatsApp */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 bg-green-500 hover:bg-green-600 
                   text-white p-3 rounded-full shadow-2xl transition-all 
                   hover:scale-110 z-50"
        >
          <FaWhatsapp className="w-7 h-7" />
        </button>
      )}

      {/* Ventana del chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 bg-white dark:bg-gray-800 
                      rounded-2xl shadow-2xl z-50 flex flex-col 
                      border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="bg-green-500 text-black p-4 rounded-t-2xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <FaWhatsapp className="w-6 h-6 text-green-300" />
              </div>
              <div>
                <h3 className="font-semibold">Bienvenido al WhatsApp de RRHH</h3>
                <p className="text-xs opacity-90">En línea</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-green-600 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 flex-1 max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            {/* Mensaje de bienvenida */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                ¡Hola! 👋 ¿En qué podemos ayudarte hoy?
              </p>
            </div>

            {/* Mensajes rápidos */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
                Mensajes rápidos:
              </p>
              {quickMessages.map((msg, index) => (
                <button
                  key={index}
                  onClick={() => setMessage(msg)}
                  className="w-full text-left p-3 bg-white dark:bg-gray-800 
                           hover:bg-gray-100 dark:hover:bg-gray-700 
                           rounded-lg text-sm text-gray-700 dark:text-gray-300 
                           transition-colors border border-gray-200 dark:border-gray-700"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Escribe tu mensaje..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 
                         rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleSendMessage}
                className="bg-green-500 hover:bg-green-600 text-white p-2 
                         rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Te redirigiremos a WhatsApp
            </p>
          </div>
        </div>
      )}
    </>
  );
}