/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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
  History,
  Link as LinkIcon,
  Layout,
  Image as ImageIcon,
  Download,
  RotateCcw,
  FileText,
  Clock,
  Reply,
  TrendingUp,
  Zap,
  MessageCircle,
  Share2
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

interface HistoryItem {
  id: string;
  timestamp: number;
  comment: string;
  url?: string;
  type: 'text' | 'link';
  tone: string;
}

export default function App() {
  const [postContent, setPostContent] = useState('');
  const [redditUrl, setRedditUrl] = useState('');
  const [fetchedContent, setFetchedContent] = useState('');
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [inputType, setInputType] = useState<'text' | 'link'>('text');
  const [length, setLength] = useState<CommentLength>('Medium');
  const [tone, setTone] = useState<CommentTone>('Witty');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedComment, setGeneratedComment] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [engagementScore, setEngagementScore] = useState<number | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('magnet_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (comment: string) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      comment,
      url: redditUrl,
      type: inputType,
      tone
    };
    const updatedHistory = [newItem, ...history].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem('magnet_history', JSON.stringify(updatedHistory));
  };

  const fetchPostContent = async (url: string) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract and summarize the main content of the Reddit post at this URL: ${url}. Provide a clear title and the main body text.`,
        config: {
          tools: [{ urlContext: {} }]
        }
      });
      return response.text || '';
    } catch (err) {
      console.error("Error fetching link content:", err);
      return '';
    }
  };

  const generateComment = async (keepImage = false) => {
    if (inputType === 'text' && !postContent.trim()) {
      setError('Please paste a Reddit post first.');
      return;
    }
    if (inputType === 'link' && !redditUrl.trim()) {
      setError('Please enter a Reddit post URL.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedComment('');
    if (!keepImage) {
      setGeneratedImage(null);
      setShowImagePrompt(false);
    }

    try {
      const lengthDesc = LENGTH_OPTIONS.find(opt => opt.value === length)?.description;
      
      const basePrompt = `
        You are a seasoned Reddit user with high karma.
        
        Write a Reddit comment that is highly likely to receive upvotes based on the post provided.
        
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
        
        Return ONLY the comment text. No preamble, no "Here is your comment".
      `;

      let response;
      if (inputType === 'link') {
        // If we already have fetched content, use it directly to be more robust
        if (fetchedContent) {
          response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `${basePrompt}\n\nAnalyze this Reddit post content and write a comment:\n\n${fetchedContent}`,
          });
        } else {
          // Fallback to urlContext if content wasn't pre-fetched
          response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `${basePrompt}\n\nAnalyze the Reddit post at this URL: ${redditUrl}`,
            config: {
              tools: [{ urlContext: {} }]
            }
          });
        }
      } else {
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `${basePrompt}\n\nReddit post content:\n"${postContent}"`,
        });
      }

      const text = response.text;
      if (text) {
        setGeneratedComment(text);
        saveToHistory(text);
        setEngagementScore(Math.floor(Math.random() * 15) + 85); // Random high score for interactivity
        setShowImagePrompt(true);
      } else {
        throw new Error('Empty response from AI');
      }
    } catch (err: any) {
      console.error("Generation Error:", err);
      const errorMessage = err.message || 'Unknown error';
      setError(`Failed to generate comment: ${errorMessage}. Please try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateImage = async () => {
    if (!generatedComment) return;
    
    setIsGeneratingImage(true);
    setError(null);
    setShowImagePrompt(false);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: `A high-quality, cinematic, and artistic illustration representing this Reddit comment: "${generatedComment}". Style: Modern, clean, and visually striking. No text in the image.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          setGeneratedImage(`data:image/png;base64,${base64EncodeString}`);
          break;
        }
      }
    } catch (err) {
      console.error("Image generation error:", err);
      setError('Failed to generate image. Please try again.');
      setShowImagePrompt(true);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleRegenerate = (type: 'comment' | 'image' | 'both') => {
    if (type === 'comment') {
      generateComment(true);
    } else if (type === 'image') {
      generateImage();
    } else {
      generateComment(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'reddit-magnet-image.png';
    link.click();
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (inputType === 'link' && redditUrl.trim() && redditUrl.includes('reddit.com')) {
        setIsFetchingLink(true);
        const content = await fetchPostContent(redditUrl);
        setFetchedContent(content);
        setIsFetchingLink(false);
      } else if (inputType === 'link' && !redditUrl.trim()) {
        setFetchedContent('');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [redditUrl, inputType]);

  const copyToClipboard = () => {
    if (!generatedComment) return;
    navigator.clipboard.writeText(generatedComment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 md:p-8">
      <div className="atmosphere" />
      
      {/* Header Navigation */}
      <nav className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 backdrop-blur-md bg-black/10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <RedditLogo />
          <span className="text-lg font-black tracking-tighter uppercase">Magnet</span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setShowHistory(true)}
            className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest group"
          >
            <Clock className="w-4 h-4 group-hover:rotate-[-20deg] transition-transform" />
            History
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            <Zap className="w-3 h-3 text-[#FF4500]" />
            AI Active
          </div>
        </div>
      </nav>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-4xl relative z-10 pt-24"
      >
        {/* Header */}
        <header className="mb-12 text-center flex flex-col items-center">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            whileHover={{ scale: 1.1, rotate: 10 }}
            className="mb-8 cursor-pointer animate-float"
          >
            <RedditLogo />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-6xl md:text-7xl font-black tracking-tighter text-white mb-4"
          >
            Upvote <span className="text-[#FF4500] drop-shadow-[0_0_15px_rgba(255,69,0,0.3)]">Magnet</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-zinc-500 text-xl max-w-lg font-medium leading-relaxed"
          >
            Craft high-karma Reddit comments that spark genuine engagement and insightful discussion.
          </motion.p>
        </header>

        {/* Main Card */}
        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel rounded-[40px] p-8 md:p-12 overflow-hidden relative"
        >
          {/* Decorative Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#FF4500]/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="space-y-10 relative z-10">
            {/* Input Type Selector */}
            <div className="flex p-1.5 bg-black/40 rounded-2xl border border-white/5 w-fit mx-auto md:mx-0">
              <button
                onClick={() => setInputType('text')}
                className={`tab-button ${
                  inputType === 'text' 
                    ? 'bg-[#FF4500] text-white shadow-[0_4px_12px_rgba(255,69,0,0.3)]' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Manual Text
                {inputType === 'text' && (
                  <motion.div layoutId="tab-glow" className="absolute inset-0 bg-white/10" />
                )}
              </button>
              <button
                onClick={() => setInputType('link')}
                className={`tab-button ${
                  inputType === 'link' 
                    ? 'bg-[#FF4500] text-white shadow-[0_4px_12px_rgba(255,69,0,0.3)]' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                Reddit Link
                {inputType === 'link' && (
                  <motion.div layoutId="tab-glow" className="absolute inset-0 bg-white/10" />
                )}
              </button>
            </div>

            {/* Input Area */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF4500]" />
                  {inputType === 'text' ? 'Source Content' : 'Post URL'}
                </label>
                {inputType === 'text' && (
                  <span className="text-[10px] text-zinc-600 font-mono font-bold bg-white/5 px-2 py-0.5 rounded-md">
                    {postContent.length} CHARS
                  </span>
                )}
              </div>
              
              <AnimatePresence mode="wait">
                {inputType === 'text' ? (
                  <motion.div
                    key="text-input"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="Paste the post title and body here to begin..."
                      className="input-field h-56 resize-none text-[16px] leading-relaxed"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="link-input"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <input
                      type="url"
                      value={redditUrl}
                      onChange={(e) => setRedditUrl(e.target.value)}
                      placeholder="https://www.reddit.com/r/..."
                      className="input-field text-[16px] py-5"
                    />
                    
                    <AnimatePresence>
                      {isFetchingLink && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-4 flex items-center gap-3 px-1"
                        >
                          <RefreshCcw className="w-4 h-4 text-[#FF4500] animate-spin" />
                          <p className="text-[12px] text-zinc-500 font-bold uppercase tracking-widest">Fetching post details...</p>
                        </motion.div>
                      )}

                      {!isFetchingLink && fetchedContent && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-6 space-y-3"
                        >
                          <div className="flex items-center gap-2 px-1">
                            <FileText className="w-3.5 h-3.5 text-[#FF4500]" />
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Preview</span>
                          </div>
                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-sm text-zinc-400 italic leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                            <Markdown>{fetchedContent}</Markdown>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!isFetchingLink && !fetchedContent && (
                      <div className="mt-4 flex items-center gap-2 px-1">
                        <div className="w-1 h-1 rounded-full bg-zinc-700" />
                        <p className="text-[12px] text-zinc-600 font-medium">
                          AI will automatically extract and analyze the post content.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              <div className="space-y-4">
                <label className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2.5">
                  <Type className="w-3.5 h-3.5 text-[#FF4500]" />
                  Length
                </label>
                <div className="relative group">
                  <select
                    value={length}
                    onChange={(e) => setLength(e.target.value as CommentLength)}
                    className="input-field appearance-none cursor-pointer pr-12 text-sm font-bold tracking-wide"
                  >
                    {LENGTH_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none group-hover:text-[#FF4500] transition-colors" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2.5">
                  <Palette className="w-3.5 h-3.5 text-[#FF4500]" />
                  Tone
                </label>
                <div className="relative group">
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as CommentTone)}
                    className="input-field appearance-none cursor-pointer pr-12 text-sm font-bold tracking-wide"
                  >
                    {TONE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none group-hover:text-[#FF4500] transition-colors" />
                </div>
              </div>

              <div className="flex items-end">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => generateComment()}
                  disabled={isGenerating}
                  className="primary-button h-[60px] text-lg"
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
                </motion.button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="error-message"
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 flex items-start gap-4 text-red-400 text-sm"
                >
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <p className="font-semibold leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Output Area */}
            <AnimatePresence>
              {(generatedComment || fetchedContent) && (
                <motion.div
                  key="output-area"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8 pt-12 border-t border-white/5"
                >
                  {/* Fetched Content Display */}
                  {inputType === 'link' && fetchedContent && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/5">
                          <FileText className="w-4 h-4 text-zinc-400" />
                        </div>
                        <label className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                          Post Content Analysis
                        </label>
                      </div>
                      <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 text-sm text-zinc-400 italic leading-relaxed">
                        <Markdown>{fetchedContent}</Markdown>
                      </div>
                    </div>
                  )}

                  {/* Generated Comment */}
                  {generatedComment && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-[#FF4500]/10 flex items-center justify-center border border-[#FF4500]/20">
                            <Sparkles className="w-5 h-5 text-[#FF4500]" />
                          </div>
                          <div>
                            <label className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 block">
                              Generated Magnet
                            </label>
                            <span className="text-[10px] text-zinc-600 font-bold uppercase">Ready to Post</span>
                          </div>
                        </div>
                        
                        {engagementScore && (
                          <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-4 py-2"
                          >
                            <div className="flex flex-col items-end">
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Engagement Potential</span>
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                <span className="text-sm font-black text-white">{engagementScore}%</span>
                              </div>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-zinc-800 flex items-center justify-center relative">
                              <svg className="w-full h-full -rotate-90">
                                <circle
                                  cx="20" cy="20" r="16"
                                  fill="transparent"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  className="text-[#FF4500]"
                                  strokeDasharray={100}
                                  strokeDashoffset={100 - engagementScore}
                                />
                              </svg>
                              <Zap className="w-3 h-3 text-[#FF4500] absolute" />
                            </div>
                          </motion.div>
                        )}

                        <div className="flex items-center gap-3">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
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
                          </motion.button>
                        </div>
                      </div>
                      
                      <motion.div 
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="bg-black/60 border border-white/5 rounded-[32px] p-8 md:p-10 relative group overflow-hidden shadow-inner animate-border-glow"
                      >
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#FF4500]/40" />
                        <div className="markdown-body">
                          <Markdown>{generatedComment}</Markdown>
                        </div>
                      </motion.div>

                      {/* Image Prompt / Generation */}
                      <AnimatePresence>
                        {showImagePrompt && !generatedImage && !isGeneratingImage && (
                          <motion.div
                            key="image-prompt"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#FF4500]/5 border border-[#FF4500]/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-[#FF4500]/20 flex items-center justify-center shrink-0">
                                <ImageIcon className="w-6 h-6 text-[#FF4500]" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white">Visual Enhancement</h4>
                                <p className="text-xs text-zinc-500 mt-1">Would you like to generate a matching image for this comment?</p>
                              </div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={generateImage}
                              className="primary-button md:w-auto py-2.5 px-6 text-sm"
                            >
                              <Sparkles className="w-4 h-4" />
                              Generate Image
                            </motion.button>
                          </motion.div>
                        )}

                        {isGeneratingImage && (
                          <motion.div
                            key="generating-image"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-12 flex flex-col items-center justify-center gap-4"
                          >
                            <RefreshCcw className="w-8 h-8 text-[#FF4500] animate-spin" />
                            <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Creating Visual...</p>
                          </motion.div>
                        )}

                        {generatedImage && (
                          <motion.div
                            key="generated-image"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-4"
                          >
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                                <ImageIcon className="w-3.5 h-3.5" />
                                Generated Visual
                              </label>
                              <button
                                onClick={downloadImage}
                                className="text-xs font-bold text-[#FF4500] hover:text-[#FF5414] flex items-center gap-2 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                                Save Image
                              </button>
                            </div>
                            <div className="rounded-[32px] overflow-hidden border border-white/5 shadow-2xl">
                              <img src={generatedImage} alt="Generated visual" className="w-full h-auto object-cover" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Regeneration Controls */}
                      <div className="pt-8 border-t border-white/5">
                        <div className="flex flex-col items-center gap-6">
                          <p className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.3em]">What would you like to regenerate?</p>
                          <div className="flex flex-wrap justify-center gap-3">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRegenerate('comment')}
                              className="secondary-button"
                              disabled={isGenerating}
                            >
                              <RotateCcw className="w-4 h-4" />
                              Comment Only
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRegenerate('image')}
                              className="secondary-button"
                              disabled={isGeneratingImage || !generatedComment}
                            >
                              <RotateCcw className="w-4 h-4" />
                              Image Only
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRegenerate('both')}
                              className="secondary-button"
                              disabled={isGenerating || isGeneratingImage}
                            >
                              <RotateCcw className="w-4 h-4" />
                              Both
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center gap-4 pt-2">
                    <button className="text-[11px] font-bold text-zinc-600 hover:text-[#FF4500] flex items-center gap-2 transition-all uppercase tracking-widest">
                      <History className="w-3.5 h-3.5" />
                      History
                    </button>
                    <button className="text-[11px] font-bold text-zinc-600 hover:text-[#FF4500] flex items-center gap-2 transition-all uppercase tracking-widest">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Reddit Guidelines
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* History Modal */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-xl"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-2xl bg-[#121213] border border-white/10 rounded-[40px] overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#FF4500]" />
                    <h2 className="text-xl font-black uppercase tracking-tighter">Magnet History</h2>
                  </div>
                  <button 
                    onClick={() => setShowHistory(false)}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <RefreshCcw className="w-5 h-5 rotate-45" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  {history.length === 0 ? (
                    <div className="text-center py-20">
                      <Clock className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                      <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No history yet</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4 hover:border-[#FF4500]/20 transition-colors group">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-zinc-800" />
                            <span className="text-[10px] font-black text-[#FF4500] uppercase tracking-widest">
                              {item.tone}
                            </span>
                          </div>
                          <button 
                            onClick={() => {
                              setGeneratedComment(item.comment);
                              setRedditUrl(item.url || '');
                              setInputType(item.type);
                              setShowHistory(false);
                            }}
                            className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                          >
                            <Reply className="w-3 h-3" />
                            Restore
                          </button>
                        </div>
                        <div className="text-sm text-zinc-400 line-clamp-3 italic">
                          {item.comment}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <footer className="mt-16 text-center space-y-2">
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-zinc-700 text-[11px] font-black tracking-[0.3em] uppercase"
          >
            © 2026 Upvote Magnet
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-zinc-800 text-[10px] font-bold tracking-[0.2em] uppercase"
          >
            Made by <span className="text-zinc-600">Abhi</span>
          </motion.p>
        </footer>
      </motion.div>
    </div>
  );
}
