/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCcw, 
  AlertCircle,
  ChevronDown,
  Type,
  Palette,
  ExternalLink,
  History
} from "lucide-react";
import Markdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type CommentLength = 'Small' | 'Medium' | 'Large';
type CommentTone = 'Witty' | 'Serious' | 'Empathetic' | 'Skeptical' | 'Helpful' | 'Sarcastic' | 'Enthusiastic';

const LENGTH_OPTIONS: { value: CommentLength; label: string; description: string }[] = [
  { value: 'Small', label: 'Small', description: '1–2 concise lines' },
  { value: 'Medium', label: 'Medium', description: '3–5 thoughtful lines' },
  { value: 'Large', label: 'Large', description: 'Detailed, story-driven, high insight' },
];

const TONE_OPTIONS: { value: CommentTone; label: string }[] = [
  { value: 'Witty', label: 'Witty & Clever' },
  { value: 'Serious', label: 'Serious & Analytical' },
  { value: 'Empathetic', label: 'Empathetic & Supportive' },
  { value: 'Helpful', label: 'Helpful & Informative' },
  { value: 'Skeptical', label: 'Skeptical & Critical' },
  { value: 'Sarcastic', label: 'Sarcastic (Reddit Classic)' },
  { value: 'Enthusiastic', label: 'Enthusiastic & Hype' },
];

const RedditLogo = () => (
  <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 fill-[#FF4500]">
    <g>
      <circle fill="#FF4500" cx="10" cy="10" r="10"></circle>
      <path fill="#FFF" d="M16.67,10a1.46,1.46,0,0,0-2.47-1,7.12,7.12,0,0,0-3.41-1.14l.58-2.72,1.9.4a.85.85,0,1,0,.13-.51L11.09,4.59a.43.43,0,0,0-.52.34l-.65,3.07a7.05,7.05,0,0,0-3.44,1.14A1.46,1.46,0,0,0,4,11.59a1.57,1.57,0,0,0,.2.76,4.6,4.6,0,0,0,0,1.57,1.46,1.46,0,1,0,2.73.71,3.36,3.36,0,0,1,3.12-2.36,3.36,3.36,0,0,1,3.12,2.36,1.46,1.46,0,1,0,2.73-.71,1.51,1.51,0,0,0,.2-.76A1.46,1.46,0,0,0,16.67,10ZM7,11.41a.85.85,0,1,1,.85.85A.85.85,0,0,1,7,11.41Zm6.39,3.13a3.41,3.41,0,0,1-6.77,0,.19.19,0,0,1,0-.06.18.18,0,0,1,.31-.12,3,3,0,0,0,6.12,0,.18.18,0,0,1,.31.12A.19.19,0,0,1,13.38,14.54Zm-.54-2.28a.85.85,0,1,1,.85-.85A.85.85,0,0,1,12.84,12.26Z"></path>
    </g>
  </svg>
);

export default function App() {
  const [postContent, setPostContent] = useState('');
  const [length, setLength] = useState<CommentLength>('Medium');
  const [tone, setTone] = useState<CommentTone>('Witty');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedComment, setGeneratedComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateComment = async () => {
    if (!postContent.trim()) {
      setError('Please paste a Reddit post first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedComment('');

    try {
      const lengthDesc = LENGTH_OPTIONS.find(opt => opt.value === length)?.description;
      
      const prompt = `
        You are a seasoned Reddit user with high karma.
        
        Write a Reddit comment that is highly likely to receive upvotes based on the post provided below.
        
        The comment must:
        - Sound natural, human, and non-AI.
        - Be insightful, relatable, or emotionally intelligent.
        - Avoid emojis unless extremely subtle.
        - Match Reddit culture (casual, clever, honest).
        - Use a ${tone} tone.
        - Never sound promotional or salesy.
        - Use standard Reddit formatting if needed (e.g., blockquotes for specific parts of the post).
        
        Comment length: ${length} (${lengthDesc})
        Desired Tone: ${tone}
        
        Reddit post content:
        "${postContent}"
        
        Return ONLY the comment text. No preamble, no "Here is your comment".
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text;
      if (text) {
        setGeneratedComment(text);
      } else {
        throw new Error('No response from AI');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate comment. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedComment) return;
    navigator.clipboard.writeText(generatedComment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen reddit-gradient flex flex-col items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        {/* Header */}
        <header className="mb-10 text-center flex flex-col items-center">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="mb-6"
          >
            <RedditLogo />
          </motion.div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white mb-3">
            Upvote <span className="text-[#FF4500]">Magnet</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-md">
            Generate Reddit comments designed to attract upvotes and spark engagement.
          </p>
        </header>

        {/* Main Card */}
        <div className="glass-panel rounded-[32px] p-6 md:p-10">
          <div className="space-y-8">
            {/* Input Area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-500 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-[#FF4500]" />
                  Paste Reddit Post
                </label>
                <span className="text-[10px] text-zinc-600 font-mono">
                  {postContent.length} characters
                </span>
              </div>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What's the post about? Paste the title and body here..."
                className="input-field h-48 resize-none text-[15px] leading-relaxed"
              />
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-500 flex items-center gap-2">
                  <Type className="w-3.5 h-3.5 text-[#FF4500]" />
                  Length
                </label>
                <div className="relative">
                  <select
                    value={length}
                    onChange={(e) => setLength(e.target.value as CommentLength)}
                    className="input-field appearance-none cursor-pointer pr-10 text-sm font-medium"
                  >
                    {LENGTH_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-500 flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-[#FF4500]" />
                  Tone
                </label>
                <div className="relative">
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as CommentTone)}
                    className="input-field appearance-none cursor-pointer pr-10 text-sm font-medium"
                  >
                    {TONE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={generateComment}
                  disabled={isGenerating}
                  className="primary-button h-[52px]"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCcw className="w-5 h-5 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-red-400 text-sm"
                >
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <p className="font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Output Area */}
            <AnimatePresence>
              {generatedComment && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-8 border-t border-[#343536]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FF4500]/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-[#FF4500]" />
                      </div>
                      <label className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">
                        Generated Magnet
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyToClipboard}
                        className="secondary-button"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-green-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="bg-[#030303] border border-[#343536] rounded-3xl p-8 relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#FF4500]/50" />
                    <div className="markdown-body">
                      <Markdown>{generatedComment}</Markdown>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 pt-2">
                    <button className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                      <History className="w-3 h-3" />
                      View History
                    </button>
                    <button className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                      <ExternalLink className="w-3 h-3" />
                      Reddit Guidelines
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Info */}
        <footer className="mt-12 text-center text-zinc-600 text-[11px] font-medium tracking-widest uppercase">
          <p>© 2026 Upvote Magnet • Powered by Gemini 3 Flash</p>
        </footer>
      </motion.div>
    </div>
  );
}
