import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Code2 } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "model";
  content: string;
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: "Hello! I am your LeetCode Teaching Assistant. What problem are you working on? (I will only provide hints, no code!)",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey === "your_gemini_api_key_here") {
        throw new Error("Gemini API key is not configured.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are a LeetCode teaching assistant. You help students by giving hints to LeetCode problems. 
YOU MUST NOT GIVE THE FULL CODE SOLUTION under any circumstances. Only provide hints, explain the algorithm, or discuss time/space complexity.
If the student asks for the exact code, politely refuse and offer another hint or explain the logic instead.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          { role: "user", parts: [{ text: systemInstruction }] },
          { role: "model", parts: [{ text: "Understood. I will act as a teaching assistant and only provide hints, never code." }] },
          ...messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
          { role: "user", parts: [{ text: userMessage }] }
        ],
      });

      const aiResponse = response.text || "I couldn't process that request.";
      
      setMessages((prev) => [...prev, { role: "model", content: aiResponse }]);
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      
      let displayMessage = "Failed to get response. Please try again.";
      const errorStr = String(error.message || error);
      
      if (
        errorStr.includes("429") || 
        errorStr.includes("quota") || 
        errorStr.includes("RESOURCE_EXHAUSTED") || 
        errorStr.includes("quota exceeded")
      ) {
        displayMessage = "⚠️ The AI Assistant's daily free usage quota has been reached. Please try again later, or ask your lab coordinator to check the Gemini API billing configuration.";
      } else if (errorStr.includes("key is not configured")) {
        displayMessage = "⚠️ Gemini API key is not configured in the system. Please ask your coordinator to set VITE_GEMINI_API_KEY.";
      } else {
        displayMessage = `Error: ${error.message || "Failed to get response."}`;
      }

      setMessages((prev) => [
        ...prev,
        { role: "model", content: displayMessage },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center justify-center
          ${isOpen ? "opacity-0 pointer-events-none translate-y-10" : "opacity-100 translate-y-0"}
          bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white`}
      >
        <MessageCircle size={28} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col border border-slate-200"
            style={{ height: "500px", maxHeight: "80vh" }}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Code2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold">LeetCode Assistant</h3>
                  <p className="text-xs text-indigo-100">Hints only, no code!</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === "user"
                        ? "bg-indigo-50 text-indigo-650"
                        : "bg-purple-50 text-purple-650"
                    }`}
                  >
                    {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-sm"
                        : "bg-white border border-slate-200 rounded-tl-sm text-slate-800 shadow-sm"
                    }`}
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-650 flex items-center justify-center">
                    <Bot size={16} />
                  </div>
                  <div className="px-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1 text-slate-500">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask for a hint..."
                  className="flex-1 bg-transparent border-none outline-none resize-none max-h-24 min-h-[40px] text-sm py-2 text-slate-800 placeholder:text-slate-400"
                  rows={1}
                  style={{ background: "transparent", color: "#1e293b" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0
                    ${
                      input.trim() && !isLoading
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
