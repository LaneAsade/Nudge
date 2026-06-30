import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { Task } from '../types';

interface FilesWidgetProps {
  onTasksGenerated: (tasks: Omit<Task, 'id' | 'status' | 'createdAt' | 'subtasks'>[]) => void;
}

export const FilesWidget: React.FC<FilesWidgetProps> = ({ onTasksGenerated }) => {
  const [link, setLink] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processDocument = async (payload: any) => {
    setIsProcessing(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/agent/summarize-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to process document');
      const generatedTasks = await res.json();
      
      if (generatedTasks && generatedTasks.length > 0) {
        onTasksGenerated(generatedTasks.map((t: any) => ({
          title: t.title,
          description: t.description,
          deadline: t.deadline || new Date(Date.now() + 86400000).toISOString(),
          estimatedEffort: t.estimatedEffort || 1,
          category: 'work',
          priorityScore: 50
        })));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('Error processing document.');
    } finally {
      setIsProcessing(false);
      setLink('');
    }
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!link.trim()) return;
    processDocument({ link: link.trim() });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      const base64Data = base64Url.split(',')[1];
      await processDocument({ fileBase64: base64Data, mimeType: file.type });
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-bg-card border border-border-color rounded-[32px] p-10 max-w-2xl mx-auto shadow-sm">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-accent text-[#111] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-medium tracking-tighter mb-2 text-text-main">AI Document Summarizer</h2>
        <p className="text-text-mut text-sm max-w-md mx-auto">
          Upload a PDF or paste a Google Doc link. The agent will extract key action items and automatically add them to your dashboard.
        </p>
      </div>

      <div className="space-y-8">
        {/* URL Input */}
        <form onSubmit={handleLinkSubmit} className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <LinkIcon className="w-5 h-5 text-text-mut" />
          </div>
          <input
            type="url"
            placeholder="Paste Google Doc link here..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
            disabled={isProcessing}
            className="w-full bg-[#F9F9F9] dark:bg-neutral-900 border border-border-color pl-12 pr-32 py-4 rounded-2xl text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors text-text-main"
          />
          <button
            type="submit"
            disabled={!link.trim() || isProcessing}
            className="absolute right-2 top-2 bottom-2 px-6 bg-accent text-[#111] rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Extract'}
          </button>
        </form>

        <div className="flex items-center gap-4 text-text-mut text-sm font-medium uppercase tracking-widest">
          <div className="flex-1 h-px bg-border-color"></div>
          OR
          <div className="flex-1 h-px bg-border-color"></div>
        </div>

        {/* File Upload */}
        <div 
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`border-2 border-dashed border-border-color rounded-[24px] p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent hover:bg-[#F9F9F9] dark:hover:bg-neutral-900 transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.txt,.doc,.docx"
            className="hidden"
          />
          <Upload className="w-10 h-10 text-text-mut mb-4" />
          <h3 className="text-lg font-medium text-text-main mb-1">Click to upload document</h3>
          <p className="text-sm text-text-mut">PDF, TXT, or DOCX (Max 10MB)</p>
        </div>

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">Successfully extracted tasks and added them to your dashboard!</span>
          </div>
        )}
      </div>
    </div>
  );
};
