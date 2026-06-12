import { useState, useRef, useEffect, FormEvent } from "react";
import { Sparkles, Send, Bot, User, Trash2, HelpCircle, ArrowRight, Hourglass, Zap } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "model";
  text: string;
  time: string;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-assistant-msg",
      sender: "model",
      text: "Olá! Deseja analisar a eficiência geral de suas Unidades de Beneficiamento de Sementes hoje? Analiso em tempo real suas taxas de OEE, MTTR/MTBF, problemas ativos de paradas e proponho planos de ajuste para as equipes.",
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Suggested quick prompts
  const suggestions = [
    "Como podemos melhorar o OEE hoje?",
    "Quais as principais causas de paradas registradas?",
    "Explicar cálculo técnico de MTBF e MTTR",
    "Estimar melhoria na transição de cultivares"
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || sending) return;
    setSending(true);

    const userMsgId = Math.random().toString();
    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMsg("");

    try {
      // Map state messages to match endpoint structure: { sender: "user" | "model", text: "string" }
      const chatHistory = messages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        },
        body: JSON.stringify({
          message: textToSend,
          chatHistory
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no canal de processamento de IA.");

      const assistantMessage: Message = {
        id: Math.random().toString(),
        sender: "model",
        text: data.reply,
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      const errorMessage: Message = {
        id: Math.random().toString(),
        sender: "model",
        text: "Ocorreu um erro ao processar a dúvida operacional de sementes. Verifique sua sessão corporativa ou rede.",
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputMsg);
  };

  const clearChatHistory = () => {
    if (confirm("Confirmar a limpeza de todo o histórico da conversa ativa?")) {
      setMessages([
        {
          id: "initial-assistant-msg-cleared",
          sender: "model",
          text: "Histórico redefinido. Como posso ajudar com a produção das UBSs agora?",
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    }
  };

  // Scroll to bottom on updates
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Premium string tokenizer to format response blocks without external markdown libraries
  const parseMarkdownText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Bullets parser
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const rawContent = line.trim().substring(2);
        return (
          <li key={idx} className="ml-5 list-disc text-xs text-slate-300 leading-relaxed mb-1">
            {formatBoldSegments(rawContent)}
          </li>
        );
      }
      return (
        <p key={idx} className="text-xs text-slate-300 leading-relaxed mb-2 font-sans">
          {formatBoldSegments(line)}
        </p>
      );
    });
  };

  const formatBoldSegments = (text: string) => {
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-slate-105">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] h-[600px] flex flex-col justify-between animate-fade-in" id="ai_assistant_view">
      {/* Header bar */}
      <div className="p-4 border-b border-[#151f33] flex justify-between items-center bg-gradient-to-r from-[#121c32] to-[#0d172a] rounded-t-xl shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/20 text-white">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">IA Operacional • Consultoria Industrial</h1>
            <p className="text-[10px] text-blue-200 mt-0.5 uppercase tracking-wider font-mono">
              Grounded Model • OEE Specialist
            </p>
          </div>
        </div>

        <button
          onClick={clearChatHistory}
          className="p-2 text-blue-100 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
          title="Pesquisar nova conversa"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#070a13]">
        {messages.map((m) => {
          const isModel = m.sender === "model";
          return (
            <div key={m.id} className={`flex gap-3 max-w-[85%] ${isModel ? "mr-auto" : "ml-auto flex-row-reverse"}`}>
              {/* Profile icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm
                ${isModel ? "bg-[#121c32] text-sky-400" : "bg-[#1565C0] text-white"}
              `}>
                {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message block balloon */}
              <div className={`rounded-xl p-4 shadow-sm border
                ${isModel 
                  ? "bg-[#0a0f1d] border-[#151f33] text-slate-200" 
                  : "bg-[#1565C0]/85 border-transparent text-white"}
              `}>
                {!isModel ? (
                  <p className="text-xs leading-relaxed font-sans">{m.text}</p>
                ) : (
                  <div className="space-y-1">
                    {parseMarkdownText(m.text)}
                  </div>
                )}
                <span className={`text-[9px] block text-right mt-1.5 font-mono 
                  ${isModel ? "text-slate-500" : "text-blue-200"}
                `}>
                  {m.time}
                </span>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex gap-3 max-w-[80%] mr-auto animate-pulse">
            <div className="w-8 h-8 rounded-full bg-[#121c32] text-sky-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-[#0a0f1d] rounded-xl p-4 border border-[#151f33] text-slate-200 shadow-sm flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce delay-150" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce delay-300" />
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider ml-1">Analisando sensores da planta...</span>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Suggested chips or quick prompts */}
      <div className="p-3 border-t border-[#151f33] bg-[#0a0f1d] flex flex-wrap gap-2 shrink-0">
        {suggestions.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(sug)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 bg-[#121c32]/50 hover:bg-[#121c32] border border-[#151f33] rounded-lg px-3 py-1.5 transition-all text-left cursor-pointer"
          >
            <Zap className="w-3 h-3 text-sky-500" />
            <span>{sug}</span>
          </button>
        ))}
      </div>

      {/* Input control block */}
      <div className="p-3 border-t border-[#151f33] bg-[#0a0f1d] rounded-b-xl shrink-0">
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <input
            type="text"
            required
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            disabled={sending}
            placeholder="Perguntar sobre canais de eficiência, MTBF, paradas ativas ou consultoria de sementes..."
            className="flex-1 px-4 py-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] disabled:opacity-50 font-sans"
          />
          <button
            type="submit"
            disabled={sending || !inputMsg.trim()}
            className="px-4 py-2 rounded-lg bg-[#1565C0] hover:bg-[#121c32] text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <span>Consultar</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
