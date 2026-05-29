import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Sparkles, Terminal, Volume2, Mic, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Which role would you like to be interviewed for, and how many questions would you like to answer?\n\n- Software Engineer\n- Data Analyst\n- Full Stack Developer\n- Other (Please specify)\n\n*(e.g., "Software Engineer, 5 questions")*',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (messages.length > 1 || isLoading) {
      scrollToBottom('smooth');
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      if (input === '') {
        textareaRef.current.style.height = '52px'; // Reset height
      } else {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
    }
  }, [input]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
    scrollToBottom('auto');
  };

  const handleFocus = () => {
    setTimeout(() => scrollToBottom('smooth'), 150);
  };

  useEffect(() => {
    // Setup Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setInput(prev => prev + (prev.length > 0 ? " " : "") + transcript.trim());
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          setMicError('Microphone access is denied. Please enable it in your browser.');
          setTimeout(() => setMicError(null), 5000);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop playing anything
      const cleanText = text.replace(/[*#_`~|-]/g, ''); // Remove Markdown before speaking
      const utterance = new SpeechSynthesisUtterance(cleanText);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Server failed to respond");
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "I'm sorry, I couldn't process that.",
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
       const errorMessage = error?.message || "System Error: Unable to reach the AI interviewer.";
       setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `System Error: ${errorMessage}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0a0a] text-neutral-50 font-sans relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur-xl z-50 w-full">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 shadow-lg shadow-black/50">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0a0a0a] rounded-full" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              AI Interviewer Pro
            </h1>
            <p className="text-[13px] text-neutral-400 font-medium">Strict & Professional Assessment</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto w-full scroll-smooth z-10 relative">
        <div className="p-4 md:p-6 pt-12 md:pt-16 pb-8 md:pb-6 max-w-4xl mx-auto flex flex-col gap-6">
          {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "flex gap-3 md:gap-4 max-w-[98%] sm:max-w-[90%] md:max-w-[85%]",
                message.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 outline outline-2 outline-offset-2",
                  message.role === 'user' 
                    ? "bg-neutral-800 text-neutral-300 outline-neutral-800/50" 
                    : "bg-emerald-950 text-emerald-400 outline-emerald-900/50"
                )}
              >
                {message.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>

              {/* Message Bubble container */}
              <div className="relative group flex flex-col gap-1 w-full min-w-0">
                <div
                  className={cn(
                    "px-4 md:px-5 py-3 md:py-4 rounded-2xl text-[14.5px] md:text-[15px] leading-relaxed break-words w-full",
                    message.role === 'user'
                      ? "bg-neutral-100 text-neutral-900 rounded-tr-sm shadow-sm"
                      : "bg-neutral-900/80 border border-white/5 text-neutral-200 rounded-tl-sm shadow-md backdrop-blur-sm"
                  )}
                >
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap font-medium">{message.content}</p>
                  ) : (
                    <div className="markdown-body w-full">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Text-to-Speech Button (Assistant only) */}
                {message.role === 'assistant' && (
                  <div className="flex md:absolute md:-right-12 md:top-2 mt-1 md:mt-0 justify-start md:justify-center">
                    <button
                      onClick={() => speakText(message.content)}
                      className="p-2 text-neutral-400 hover:text-emerald-400 md:bg-neutral-900 md:hover:bg-neutral-800 rounded-full border border-transparent md:border-white/5 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 shadow-none md:shadow-sm flex items-center gap-2 text-xs font-medium"
                      title="Read aloud"
                    >
                      <Volume2 size={16} />
                      <span className="md:hidden">Read Aloud</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex w-full justify-start animate-in fade-in duration-300">
            <div className="flex gap-4 max-w-[85%] md:max-w-[75%] flex-row">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 bg-emerald-950 text-emerald-400 outline outline-2 outline-offset-2 outline-emerald-900/50">
                <Bot size={14} />
              </div>
              <div className="px-5 py-4 rounded-2xl bg-neutral-900/80 border border-white/5 text-neutral-200 rounded-tl-sm flex items-center gap-3 shadow-md backdrop-blur-sm">
                <Loader2 size={16} className="animate-spin text-emerald-500" />
                <span className="text-[14px] text-neutral-400 animate-pulse font-medium">Evaluating response...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" /> {/* Standard spacing */}
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 md:p-6 border-t border-white/5 bg-[#0a0a0a]/90 backdrop-blur-xl flex-shrink-0 w-full z-10 relative">
        <div className="max-w-4xl mx-auto flex flex-col gap-3 relative">
          {micError && (
            <div className="absolute -top-14 left-0 right-0 mx-auto w-max px-4 py-2 bg-red-950/80 border border-red-900/50 text-red-400 text-[13px] rounded-lg backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 shadow-lg">
              {micError}
            </div>
          )}
          <div className="flex gap-3 relative shadow-2xl rounded-2xl w-full">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder="Type or speak your answer here..."
              className={cn(
                "w-full bg-neutral-900/50 border rounded-2xl px-5 py-4 pr-28 text-[15px] text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all duration-200 ease-out resize-none overflow-hidden",
                isListening ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "border-white/10 focus:border-emerald-500/50"
              )}
              rows={1}
              style={{ minHeight: '60px', maxHeight: '160px' }}
            />
            
            {/* Voice Input Button */}
            <button
              onClick={toggleListening}
              title={isListening ? "Stop listening" : "Start speaking"}
              className={cn(
                "absolute right-[4.5rem] top-2 bottom-2 aspect-square flex items-center justify-center rounded-xl transition-all duration-200 shadow-sm",
                isListening 
                  ? "bg-red-500/10 text-red-400 animate-pulse border border-red-500/30" 
                  : "bg-transparent text-neutral-400 hover:bg-neutral-800 hover:text-white border-transparent"
              )}
            >
              {isListening ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
            </button>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center rounded-xl bg-white text-neutral-950 hover:bg-neutral-200 transition-all duration-200 disabled:opacity-50 disabled:hover:bg-white active:scale-95 shadow-sm border border-transparent"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] text-neutral-500 font-medium flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles size={12} className="text-emerald-500" /> AI Interviewer
            </p>
            <p className="text-[11px] text-neutral-500 font-mono">
              Enter to send, Shift + Enter for new line
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
