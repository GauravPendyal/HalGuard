import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Plus,
  Paperclip,
  Globe,
  Brain,
  Mic,
  MicOff,
  Square,
  X,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { Attachment } from '../types';

interface ChatInputProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isGenerating: boolean;
  onStopGeneration: () => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  reasoningEnabled: boolean;
  onToggleReasoning: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isGenerating,
  onStopGeneration,
  webSearchEnabled,
  onToggleWebSearch,
  reasoningEnabled,
  onToggleReasoning,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((text.trim() || attachments.length > 0) && !isGenerating) {
      onSendMessage(text.trim(), attachments);
      setText('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map((f) => ({
      id: `att-${Math.random()}`,
      name: f.name,
      type: f.type,
      size: `${(f.size / 1024).toFixed(1)} KB`,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setText(transcript);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Container Box */}
      <div className="relative rounded-3xl bg-chatgpt-inputLight dark:bg-[#2f2f2f] border border-chatgpt-borderLight dark:border-chatgpt-borderDark/60 shadow-lg focus-within:border-chatgpt-accentGreen dark:focus-within:border-chatgpt-accentGreen transition-all">
        {/* Attachments Chips */}
        {attachments.length > 0 && (
          <div className="p-3 pb-0 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#212121] border border-chatgpt-borderLight dark:border-chatgpt-borderDark text-xs text-chatgpt-textLight dark:text-chatgpt-textDark shadow-xs"
              >
                {att.type.startsWith('image/') ? (
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="font-medium truncate max-w-[120px]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-[#383838] rounded-full text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask HalluciGuard to verify an answer..."
          rows={1}
          className="w-full px-4 pt-3.5 pb-2 bg-transparent text-chatgpt-textLight dark:text-chatgpt-textDark placeholder-chatgpt-textMutedLight dark:placeholder-chatgpt-textMutedDark text-sm sm:text-base resize-none outline-none max-h-[200px]"
        />

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Toolbar & Buttons */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          {/* Left tools */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-[#383838] text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark transition-colors"
              title="Attach File"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onToggleWebSearch}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                webSearchEnabled
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'hover:bg-gray-200 dark:hover:bg-[#383838] text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark'
              }`}
              title="Search the web"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>

            <button
              type="button"
              onClick={onToggleReasoning}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                reasoningEnabled
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                  : 'hover:bg-gray-200 dark:hover:bg-[#383838] text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark'
              }`}
              title="Enable deep reasoning"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Reason</span>
            </button>
          </div>

          {/* Right send / mic / stop buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-2 rounded-full transition-colors ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'hover:bg-gray-200 dark:hover:bg-[#383838] text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark'
              }`}
              title="Voice Dictation"
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="p-2 rounded-full bg-chatgpt-textLight dark:bg-white text-chatgpt-darkBg dark:text-black hover:opacity-90 transition-opacity"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!text.trim() && attachments.length === 0}
                className={`p-2 rounded-full transition-all ${
                  text.trim() || attachments.length > 0
                    ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 scale-105'
                    : 'bg-gray-300 dark:bg-[#424242] text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-2 text-center text-[11px] text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">
        Every answer is routed through detection, evidence verification, judgment, correction, re-verification, and memory.
      </div>
    </div>
  );
};
