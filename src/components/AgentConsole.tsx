import React, { useState, useEffect, useRef } from 'react';
import { AgentAction, ReasoningStep } from '../types';
import { Sparkles, Mic, MicOff, Send, Volume2, VolumeX, ShieldAlert, Check, RefreshCw, X, HelpCircle, Zap } from 'lucide-react';

interface AgentConsoleProps {
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
  reasoning: ReasoningStep;
  proposedActions: AgentAction[];
  chatHistory: { sender: 'user' | 'agent'; text: string; timestamp: Date; inlineActions?: { label: string; actionType: string }[] }[];
  onApproveAction: (actionId: string) => void;
  onUndoAction: (actionId: string) => void;
  onDeclineAction: (actionId: string) => void;
  onInlineAction?: (actionType: string) => void;
}

export const AgentConsole: React.FC<AgentConsoleProps> = ({
  onSendMessage,
  isLoading,
  reasoning,
  proposedActions,
  chatHistory,
  onApproveAction,
  onUndoAction,
  onDeclineAction,
  onInlineAction,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Web Speech API: Speech Recognition
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        setInputText(resultText);
        // Automatically send after voice input
        if (resultText.trim()) {
          onSendMessage(resultText);
          setInputText('');
        }
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [onSendMessage]);

  // Handle voice output (Text-to-Speech)
  useEffect(() => {
    if (chatHistory.length > 0 && voiceEnabled) {
      const lastMsg = chatHistory[chatHistory.length - 1];
      if (lastMsg.sender === 'agent') {
        speakText(lastMsg.text);
      }
    }
  }, [chatHistory, voiceEnabled]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      // Keep it short and conversational (remove Markdown/formatting code snippets before speaking)
      const cleanText = text.replace(/[*#`_\-]/g, '').slice(0, 150) + (text.length > 150 ? '...' : '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleMicClick = () => {
    if (!recognition) {
      alert('Speech Recognition is not supported or not allowed in your browser.');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  return (
    <aside className="w-[320px] bg-bg-card rounded-[32px] border border-border-color widget-3d shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col text-text-main shrink-0 transition-all">
      {/* Top Console Header */}
      <div className="p-5 border-b border-border-color shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-gold" />
            <h3 className="text-base font-sans font-medium tracking-tighter tracking-wide text-text-med font-semibold">
              Agent Control
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-1.5 rounded-full bg-bg-input text-text-mut hover:bg-border-color/50 transition-colors cursor-pointer"
              title="Voice Commands Help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-1.5 rounded-full ${
                voiceEnabled ? 'bg-accent-green text-white' : 'bg-bg-input text-text-mut'
              } transition-colors cursor-pointer`}
              title={voiceEnabled ? 'Mute AI Voice' : 'Unmute AI Voice'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-card rounded-[32px] p-8 max-w-md w-full border border-border-color shadow-2xl relative">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-6 right-6 text-text-mut hover:text-text-med transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Mic className="w-6 h-6 text-accent-green" />
              <h2 className="text-xl font-sans font-medium tracking-tighter text-text-med">Voice Commands</h2>
            </div>
            <p className="text-sm text-text-mut mb-6">
              Try asking the AI agent for help managing your tasks and schedule.
            </p>
            <ul className="space-y-4 text-sm text-text-main">
              <li className="flex items-start gap-3">
                <span className="text-accent-gold font-bold mt-0.5">"</span>
                <div>
                  <p className="font-semibold">What should I work on next?</p>
                  <p className="text-xs text-text-mut mt-1">Agent evaluates your task list and suggests the highest priority.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent-gold font-bold mt-0.5">"</span>
                <div>
                  <p className="font-semibold">Schedule a focus block for the project report.</p>
                  <p className="text-xs text-text-mut mt-1">Automatically blocks time in your calendar for a specific task.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent-gold font-bold mt-0.5">"</span>
                <div>
                  <p className="font-semibold">Draft an email for task X.</p>
                  <p className="text-xs text-text-mut mt-1">Generates a quick draft based on the task description.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent-gold font-bold mt-0.5">"</span>
                <div>
                  <p className="font-semibold">Break down my thesis into smaller steps.</p>
                  <p className="text-xs text-text-mut mt-1">Generates subtasks to make large goals more manageable.</p>
                </div>
              </li>
            </ul>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-6 py-2.5 bg-border-color text-text-med rounded-full text-xs font-bold uppercase tracking-wider hover:bg-border-color/80 transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs / Sections */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 flex flex-col">
        {/* Section 1: Reasoning Loop (Live status) */}
        <div className="shrink-0 relative">
          <div className="absolute left-[5.5px] top-6 bottom-6 w-[2px] bg-[#E2E8F0]"></div>
          <div className="absolute left-[5.5px] top-6 w-[2px] bg-accent transition-all duration-700" style={{ bottom: isLoading ? '66%' : proposedActions.some(act => act.status === 'executed') ? '0%' : '33%' }}></div>

          <h4 className="text-[10px] font-sans font-bold text-text-mut uppercase tracking-[0.12em] mb-4">
            Reasoning Loop
          </h4>

          <div className="space-y-4">
            {/* Step 1: Perceive */}
            <div className="flex gap-4 relative z-10">
              <div className="w-3 relative flex justify-center">
                <div
                  className={`absolute top-1 w-3 h-3 rounded-full transition-all ${
                    isLoading
                      ? 'bg-accent animate-pulse-ring'
                      : reasoning.perceive
                      ? 'bg-accent'
                      : 'bg-border-color'
                  }`}
                ></div>
              </div>
              <div className="pb-1">
                <span className="text-[11px] font-sans uppercase font-bold text-text-main tracking-[0.12em] block mb-0.5">
                  Perceive
                </span>
                <p className="text-[12px] font-sans text-[#64748B]">
                  {isLoading
                    ? 'Scanning schedules, tasks and completion rates...'
                    : reasoning.perceive || 'Awaiting task updates or user input...'}
                </p>
              </div>
            </div>

            {/* Step 2: Plan */}
            <div className="flex gap-4 relative z-10">
              <div className="w-3 relative flex justify-center">
                <div
                  className={`absolute top-1 w-3 h-3 rounded-full transition-all ${
                    isLoading && reasoning.perceive
                      ? 'bg-accent animate-pulse-ring'
                      : reasoning.plan
                      ? 'bg-accent'
                      : 'bg-border-color'
                  }`}
                ></div>
              </div>
              <div className="pb-1">
                <span className="text-[11px] font-sans uppercase font-bold text-text-main tracking-[0.12em] block mb-0.5">
                  Plan
                </span>
                <p className="text-[12px] font-sans text-[#64748B]">
                  {isLoading
                    ? 'Formulating prioritization scores & scheduling blocks...'
                    : reasoning.plan || 'Ready to plan optimization blocks.'}
                </p>
              </div>
            </div>

            {/* Step 3: Act */}
            <div className="flex gap-4 relative z-10">
              <div className="w-3 relative flex justify-center">
                <div
                  className={`absolute top-1 w-4 h-4 -left-0.5 rounded-full transition-all flex items-center justify-center ${
                    proposedActions.some(act => act.status === 'executed')
                      ? 'bg-accent text-[#111] scale-110'
                      : isLoading && reasoning.plan
                      ? 'bg-accent animate-pulse-ring'
                      : reasoning.act
                      ? 'bg-text-med'
                      : 'bg-border-color'
                  }`}
                >
                  {proposedActions.some(act => act.status === 'executed') && <Check className="w-2.5 h-2.5" />}
                </div>
              </div>
              <div className="pb-1 pl-1">
                <span className="text-[11px] font-sans uppercase font-bold text-text-main tracking-[0.12em] block mb-0.5">
                  Act
                </span>
                <p className="text-[12px] font-sans text-[#64748B]">
                  {proposedActions.some(act => act.status === 'executed')
                    ? 'Autonomous action executed ✓'
                    : reasoning.act || 'Standby for execution permission.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Proposed Autonomous Actions / Approvals */}
        {proposedActions.filter(act => act.status !== 'executed').length > 0 && (
          <div className="shrink-0 bg-accent-dim border border-accent/50 rounded-2xl p-3 space-y-3 transition-colors">
            <div className="flex items-center gap-1.5 text-xs font-sans font-bold text-accent uppercase tracking-[0.12em]">
              <ShieldAlert className="w-4 h-4" />
              <span>Pending AI Action Log</span>
            </div>

            <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
              {proposedActions.filter(act => act.status !== 'executed').map((act) => {
                const isConflict = act.type === 'calendar_conflict' as any;
                return (
                <div key={act.id} className={`rounded-xl p-4 space-y-3 border transition-colors ${isConflict ? 'bg-orange-500/10 border-orange-500/50' : 'bg-bg-card border-accent/50 shadow-sm'}`}>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-sans font-bold uppercase tracking-[0.12em] flex items-center gap-1.5 mb-1 ${isConflict ? 'text-orange-500' : 'text-accent'}`}>
                      {isConflict ? '⚠️ Conflict detected' : '🤖 Agent proposal'}
                    </span>
                    <span className={`text-sm font-sans font-medium leading-tight ${isConflict ? 'text-orange-300' : 'text-text-primary'}`}>
                      {isConflict ? (
                        <>CS3200 deadline (4:48 PM) leaves only 48 min<br/>after office hours end. Start now to be safe.</>
                      ) : (
                        act.description || 'Block 1:30–4:30 PM for CS3200 project\n(3h needed · deadline in 2h 59m)'
                      )}
                    </span>
                  </div>

                  {act.status === 'proposed' ? (
                    <div className="flex gap-2 pt-2 border-t border-[#F6D860]/50">
                      <button
                        onClick={() => onApproveAction(act.id)}
                        className={`flex-1 py-1.5 text-[10px] font-sans font-bold rounded-md uppercase tracking-[0.12em] flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${isConflict ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-[#D97706] hover:bg-[#D97706]/90 text-white'}`}
                      >
                        <Check className="w-3 h-3" /> {isConflict ? 'Confirm' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => onDeclineAction(act.id)}
                        className={`flex-1 py-1.5 text-[10px] font-sans font-bold rounded-md uppercase tracking-[0.12em] flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${isConflict ? 'text-orange-600 hover:bg-orange-500/20 bg-orange-500/10' : 'bg-transparent border border-[#F6D860] text-[#92650A] hover:bg-[#F6D860]/20'}`}
                      >
                        <X className="w-3 h-3" /> {isConflict ? 'Skip' : 'Skip'}
                      </button>
                    </div>
                  ) : act.status === 'executed' ? (
                    <div className="flex items-center justify-between text-[9px] font-sans">
                      <span className="text-emerald-500 font-bold uppercase tracking-[0.12em] flex items-center gap-1">
                        <Check className="w-3 h-3" /> Executed
                      </span>
                      <button
                        onClick={() => onUndoAction(act.id)}
                        className="text-text-mut hover:text-text-main underline font-bold cursor-pointer"
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <span className="text-[9px] text-text-mut font-sans uppercase font-bold tracking-[0.12em] block text-right">
                      {act.status}
                    </span>
                  )}
                </div>
              )})}
            </div>
          </div>
        )}

        {/* Section 3: Conversational Chat logs */}
        <div className="flex-1 flex flex-col justify-between min-h-[150px] border-t border-border-color pt-4">
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[220px]">
            {chatHistory.map((chat, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${chat.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[9px] text-text-mut font-sans uppercase font-bold tracking-[0.12em] mb-0.5 px-1">
                  {chat.sender === 'user' ? 'You' : 'Nudge'}
                </span>
                <div
                  className={`px-3 py-2 text-xs max-w-[85%] font-sans leading-relaxed relative ${
                    chat.sender === 'user'
                      ? 'bg-accent text-[#111] rounded-tl-[18px] rounded-tr-[18px] rounded-br-[4px] rounded-bl-[18px]'
                      : 'bg-bg-card-alt text-text-primary rounded-tl-[18px] rounded-tr-[18px] rounded-br-[18px] rounded-bl-[4px] border border-border-subtle shadow-sm'
                  }`}
                >
                  {chat.text}
                  {chat.sender === 'agent' && (
                    <div className="absolute -bottom-4 right-0 flex items-center gap-1 opacity-100 z-10">
                      <span className="bg-[#FEF9C3] text-[#854D0E] border border-[#FDE68A] rounded-full px-2 py-0.5 text-[8px] font-sans font-bold uppercase tracking-[0.12em] flex items-center gap-1 whitespace-nowrap shadow-sm">
                        <Zap className="w-2.5 h-2.5" />
                        Gemini 1.5 Flash
                      </span>
                    </div>
                  )}
                  {chat.inlineActions && chat.inlineActions.length > 0 && (
                    <div className="mt-3 space-y-1.5 flex flex-col items-start border-t border-border-color pt-2">
                      {chat.inlineActions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (onInlineAction) {
                              onInlineAction(act.actionType);
                            } else {
                              onSendMessage(`Please ${act.label.replace(' ✓', '')}`);
                            }
                          }}
                          className="text-[10px] bg-bg-card border border-border-color px-2.5 py-1 rounded-md text-text-main font-bold hover:bg-accent-green hover:text-white transition-colors cursor-pointer w-full text-left flex justify-between items-center"
                        >
                          <span>{act.label.replace(' ✓', '')}</span>
                          <span className="text-[14px]">✓</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-1.5 text-text-mut text-[10px] uppercase font-bold tracking-widest pl-1">
                <RefreshCw className="w-3 h-3 animate-spin animate-duration-1000" />
                <span>Nudge Reasoning...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Chat / Voice Input Tray */}
        <div className="shrink-0 mt-4 space-y-3">
          
          <div className="relative">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide pr-8">
              {['Block deep focus time', 'Re-prioritize my tasks', 'Am I falling behind?'].map(q => (
                <button
                  key={q}
                  onClick={() => {
                    setInputText(q);
                  }}
                  className="whitespace-nowrap px-3 py-1 bg-bg-input hover:bg-black dark:hover:bg-white border border-border-color/50 rounded-full text-[10px] text-text-mut hover:text-white dark:hover:text-black transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg-card to-transparent pointer-events-none"></div>
          </div>

          {isListening && (
            <div className="bg-accent-green/15 border border-accent-green/30 p-2.5 rounded-2xl flex items-center justify-between">
              <span className="text-[10px] font-bold text-accent-green uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div>
                Listening to user speech...
              </span>
              <button
                onClick={() => isListening && recognition?.stop()}
                className="text-text-main hover:text-red-400 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              placeholder={isListening ? "Listening..." : "Type or talk to your agent..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isListening}
              className="w-full bg-bg-input border border-border-color rounded-full py-2.5 pl-4 pr-16 text-xs focus:outline-none focus:ring-1 focus:ring-accent-green text-text-main disabled:opacity-50"
            />
            <div className="absolute right-1 top-1 flex items-center gap-1">
              <button
                onClick={handleMicClick}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isListening ? 'bg-red-500 text-white' : 'bg-bg-card border border-border-color text-text-main hover:bg-bg-input'
                }`}
                title="Start Voice Assistant"
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="w-7 h-7 bg-accent-green text-white rounded-full flex items-center justify-center shadow hover:bg-accent-green/85 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
