import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, FileText, Check, Edit2, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeProfile } from '../services/api';
import { useApp } from '../context/AppContext';

interface EducationItem {
  school: string;
  period: string;
  degree: string;
}

interface ExperienceItem {
  company: string;
  period: string;
  role: string;
  details: string[]; 
}

interface PersonaData {
  name: string;
  contact: string;
  intro: string;
  education: EducationItem[];
  experience: ExperienceItem[];
  skills: string[];
}

interface PersonaBuilderProps {
  onBack: () => void;
  onNext: () => void;
  language: 'zh' | 'en';
  theme: 'light' | 'dark';
}

export function PersonaBuilder({ onBack, onNext, language, theme }: PersonaBuilderProps) {
  const { profile, setProfile } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const t = {
    zh: {
      step1: "STEP 1",
      title: "画像构建",
      done: "完成",
      edit: "编辑",
      collapse: "收起",
      clear: "清空",
      inputLabel: "自然语言输入",
      placeholder: "在此输入或粘贴你的经历描述，AI 将自动提取关键画像信息...",
      or: "或者",
      fileParsing: "简历文件解析",
      fileSupport: "支持 PDF, DOCX, HTML",
      selectFile: "选择文件",
      noFile: "未选择任何文件",
      analyzing: "系统分析中...",
      complete: "分析完成",
      initiate: "开始分析",
      completeText: "分析完成 ✓",
      intro: "个人简介",
      education: "教育背景",
      experience: "工作经历"
    },
    en: {
      step1: "STEP 1",
      title: "Persona Building",
      done: "Done",
      edit: "Edit",
      collapse: "Collapse",
      clear: "Clear",
      inputLabel: "Natural Language Input",
      placeholder: "Enter or paste your experience description here, AI will automatically extract key persona information...",
      or: "OR",
      fileParsing: "Resume File Parsing",
      fileSupport: "Supports PDF, DOCX, HTML",
      selectFile: "Select File",
      noFile: "No file selected",
      analyzing: "SYSTEM ANALYZING...",
      complete: "ANALYSIS COMPLETE",
      initiate: "INITIATE ANALYSIS",
      completeText: "Analysis Complete ✓",
      intro: "Introduction",
      education: "Education",
      experience: "Work Experience"
    }
  };
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 不再自动清空，保持流程中的数据

  const handleAnalyze = async () => {
    setError('');
    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      
      if (text.trim()) {
        formData.append('free_text', text.trim());
      }
      
      if (!selectedFile && !text.trim()) {
        throw new Error(language === 'zh' ? '请输入文本或上传文件' : 'Please enter text or upload a file');
      }
      
      const result = await analyzeProfile(formData);
      
      // 转换 API 返回的数据格式为组件需要的格式
      const personaData: PersonaData = {
        name: result.profile.name || '',
        contact: result.profile.contact || result.profile.email || result.profile.phone || '',
        intro: result.profile.intro || result.profile.summary || '',
        education: (result.profile.education || []).map(edu => ({
          school: edu.school || '',
          period: edu.period || `${edu.start || ''} - ${edu.end || ''}`.trim(),
          degree: edu.degree || ''
        })),
        experience: (result.profile.experience || []).map(exp => ({
          company: exp.company || '',
          period: exp.period || `${exp.start || ''} - ${exp.end || ''}`.trim(),
          role: exp.role || '',
          details: exp.bullets || exp.details || []
        })),
        skills: result.profile.skills || []
      };
      
      setProfile(result.profile); // 保存原始 profile 到全局状态
      setIsComplete(true);
      
      setTimeout(() => {
        setShowDetails(true);
      }, 500);
    } catch (err: any) {
      setError(err.message || (language === 'zh' ? '分析失败' : 'Analysis failed'));
      console.error('Profile analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAddEducation = () => {
    if (!profile) return;
    const newEdu = {
      school: '',
      degree: '',
      major: '',
      start: '',
      end: '',
    };
    setProfile({
      ...profile,
      education: [...(profile.education || []), newEdu],
    });
  };

  const handleRemoveEducation = (idx: number) => {
    if (!profile) return;
    const newEdu = [...(profile.education || [])];
    newEdu.splice(idx, 1);
    setProfile({...profile, education: newEdu});
  };

  const handleAddExperience = () => {
    if (!profile) return;
    const newExp = {
      company: '',
      role: '',
      start: '',
      end: '',
      bullets: [],
    };
    setProfile({
      ...profile,
      experience: [...(profile.experience || []), newExp],
    });
  };

  const handleRemoveExperience = (idx: number) => {
    if (!profile) return;
    const newExp = [...(profile.experience || [])];
    newExp.splice(idx, 1);
    setProfile({...profile, experience: newExp});
  };

  const handleCollapse = () => {
    setShowDetails(false);
    setIsEditing(false);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-transparent p-4 overflow-hidden relative font-sans perspective-1000 ${isDark ? 'text-gray-100' : 'text-[#1F1F1F]'}`}>
       
       {/* --- GEOMETRIC LINES OVERLAY --- */}
       
       {/* ------------------------------------------ */}

      {/* Background Header */}
      <div className="absolute top-14 md:top-6 left-0 right-0 text-center z-10 pointer-events-none">
        <h2 className={`text-2xl font-serif italic drop-shadow-sm tracking-tight ${isDark ? 'text-gray-200' : 'text-[#1A1A1A]'}`}>MirrorStudio</h2>
        <p className={`text-[10px] tracking-[0.3em] uppercase font-semibold ${isDark ? 'text-gray-400 opacity-60' : 'text-[#444] opacity-70'}`}>CVfoR1</p>
      </div>

      {/* Navigation - Left (Desktop) */}
      <div className="hidden md:block absolute left-12 top-1/2 -translate-y-1/2 z-30">
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full w-14 h-14 border transition-all duration-300 group
             ${isDark 
                ? 'bg-[#1A1A1A] border-white/20 shadow-[6px_6px_12px_rgba(0,0,0,0.5),-6px_-6px_12px_rgba(255,255,255,0.05)] hover:bg-[#222] text-gray-300' 
                : 'bg-[#E0E5EC] border-white/50 shadow-[6px_6px_12px_#A3A7AE,-6px_-6px_12px_#FFFFFF] hover:shadow-[inset_6px_6px_12px_#A3A7AE,inset_-6px_-6px_12px_#FFFFFF] hover:scale-100 text-gray-600'
             }
          `}
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </Button>
      </div>

      {/* Navigation - Mobile (Top Left) */}
      <div className="md:hidden absolute left-4 top-12 z-30">
        <Button
          variant="ghost"
          size="icon"
          className={`rounded-full w-10 h-10 border transition-all duration-300 backdrop-blur-md
             ${isDark 
                ? 'bg-black/20 border-white/10 text-gray-300 hover:bg-white/10' 
                : 'bg-white/40 border-white/40 text-gray-700 hover:bg-white/60'
             }
          `}
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content - Center Card */}
      <div className="w-full max-w-4xl relative flex justify-center z-20 items-center md:items-end">
        
        {/* Ghost Card - Next Step */}
        <div className={`absolute right-4 top-1/2 -translate-y-1/2 translate-x-full w-full max-w-2xl h-[70vh] backdrop-blur-xl rounded-2xl shadow-xl border opacity-40 scale-90 hidden lg:block pointer-events-none -ml-32 transform rotate-3 mix-blend-soft-light
            ${isDark ? 'bg-black/20 border-white/10' : 'bg-white/20 border-white/30'}
        `}></div>

        {/* REFLECTION UNDER THE CARD */}
        <div className={`absolute bottom-[-40px] left-4 right-4 h-16 blur-2xl rounded-[50%] scale-x-90 z-0 ${isDark ? 'bg-white/5' : 'bg-black/20'}`}></div>

        {/* MAIN CARD CONTAINER - Spring Animation */}
        <motion.div
           initial={{ opacity: 0, y: 40, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           exit={{ opacity: 0, y: -40, scale: 0.95 }}
           transition={{ type: "spring", damping: 25, stiffness: 300 }}
           className="w-full max-w-2xl z-20 mx-4 h-[65vh] md:h-[75vh] flex flex-col"
        >
          <Card className={`w-full h-full backdrop-blur-2xl border-0 flex flex-col overflow-hidden relative group transition-colors duration-500
              ${isDark 
                 ? 'bg-black/40 shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.1)] rounded-none' // Tech style: No rounded corners in dark mode? Or maybe just tighter?
                 : 'bg-white/60 shadow-[0_30px_60px_-10px_rgba(30,30,35,0.15),inset_0_0_0_1px_rgba(255,255,255,0.4)] rounded-3xl'
              }
          `}>
          
          {/* Tech Line Corners for Dark Mode */}
          {isDark && (
              <>
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-white/30 z-50"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-white/30 z-50"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-white/30 z-50"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-white/30 z-50"></div>
                  
                  {/* Tech Grid Background for Card */}
                  <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              </>
          )}

          {/* 1. Glossy Edge Highlight (Top) */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent z-50 opacity-80"></div>
          
          {/* 2. Glass Shine (Diagonal) */}
          <div className={`absolute inset-0 bg-gradient-to-tr pointer-events-none z-10 opacity-30 group-hover:opacity-40 transition-opacity duration-1000
             ${isDark ? 'from-white/5 via-white/10 to-transparent' : 'from-white/5 via-white/20 to-transparent'}
          `}></div>

          <CardHeader className={`flex flex-row items-center justify-between border-b pb-4 shrink-0 z-20 relative backdrop-blur-sm
              ${isDark ? 'bg-black/20 border-white/10' : 'bg-white/30 border-gray-200/40'}
          `}>
            <div className="flex items-center gap-4">
              <span className={`text-xs font-bold tracking-wide uppercase drop-shadow-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t[language].step1}</span>
              <CardTitle className={`text-lg font-bold drop-shadow-sm ${isDark ? 'text-white' : 'text-[#1F1F1F]'}`}>{t[language].title}</CardTitle>
            </div>
          
            <AnimatePresence mode="wait">
              {showDetails ? (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex gap-2"
                >
                  {isEditing ? (
                    <Button variant="outline" size="sm" className="text-xs rounded-full h-8 px-4 gap-1 bg-gray-600 text-white hover:bg-gray-700 border-0 shadow-lg" onClick={() => setIsEditing(false)}>
                      <Check className="w-3 h-3" /> {t[language].done}
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" className={`text-xs h-8 px-4 gap-1 border hover:bg-opacity-80 backdrop-blur-sm shadow-[2px_2px_5px_rgba(0,0,0,0.05)]
                          ${isDark ? 'bg-white/10 border-white/20 text-gray-200 hover:bg-white/20 rounded-none' : 'bg-white/50 border-white/60 text-gray-700 hover:bg-white rounded-full'}
                      `} onClick={() => setIsEditing(true)}>
                        <Edit2 className="w-3 h-3" /> {t[language].edit}
                      </Button>
                      <Button variant="outline" size="sm" className={`text-xs h-8 px-4 gap-1 border hover:bg-opacity-80 backdrop-blur-sm shadow-[2px_2px_5px_rgba(0,0,0,0.05)]
                          ${isDark ? 'bg-white/10 border-white/20 text-gray-200 hover:bg-white/20 rounded-none' : 'bg-white/50 border-white/60 text-gray-700 hover:bg-white rounded-full'}
                      `} onClick={handleCollapse}>
                        {t[language].collapse} <ChevronUp className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                   <Button variant="ghost" size="sm" className={`text-xs rounded-full bg-transparent px-3 transition-colors font-medium
                      ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}
                   `} onClick={() => {setText(''); setSelectedFile(null); setIsComplete(false); setProfile(null);}}>
                    {t[language].clear}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardHeader>

          <div className="relative flex-1 overflow-hidden h-full z-10">
               {/* Form Content */}
              <ScrollArea className="h-full">
                <div className="p-5 md:p-8 pt-6 md:pt-8 space-y-6 md:space-y-8">
                  {/* Text Input Section */}
                  <div className="space-y-3">
                    <label className={`text-sm font-semibold ml-1 drop-shadow-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t[language].inputLabel}</label>
                    <div className="relative group/input">
                      <div className={`absolute -inset-0.5 rounded-xl blur opacity-30 group-hover/input:opacity-60 transition duration-500
                          ${isDark ? 'bg-gradient-to-r from-gray-700 to-gray-600' : 'bg-gradient-to-r from-gray-200 to-gray-300'}
                      `}></div>
                      <Textarea
                        placeholder={t[language].placeholder}
                        className={`relative min-h-[140px] resize-none border-0 shadow-inner focus-visible:ring-0 p-5 text-sm transition-all
                           ${isDark 
                              ? 'bg-black/30 text-gray-200 placeholder:text-gray-600 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.5),inset_-2px_-2px_6px_rgba(255,255,255,0.05)] focus:bg-black/40 rounded-none border-l-2 border-white/20' 
                              : 'bg-white/60 text-gray-800 placeholder:text-gray-400 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:bg-white/80 rounded-xl'
                           }
                        `}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* File Upload Section */}
                  <div className="space-y-3">
                    <label className={`text-sm font-semibold ml-1 drop-shadow-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t[language].or}</label>
                    <div className={`text-sm mb-2 ml-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{t[language].fileParsing}</div>
                    
                    <div 
                      className={`group relative border border-dashed transition-all duration-300 p-6 flex flex-col items-start gap-2 cursor-pointer shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_25px_-10px_rgba(0,0,0,0.15)]
                          ${isDark 
                              ? 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 rounded-none' 
                              : 'border-gray-400/40 hover:border-gray-500/60 bg-white/40 hover:bg-white/60 rounded-xl'
                          }
                      `}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <div className={`p-3 shadow-inner ${isDark ? 'bg-white/10 text-gray-300 rounded-none' : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 rounded-xl'}`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className={`font-bold text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            {selectedFile ? selectedFile.name : t[language].noFile}
                          </div>
                          <div className={`text-xs font-medium mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{t[language].fileSupport}</div>
                        </div>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className={`text-xs h-9 shadow-[2px_2px_5px_rgba(0,0,0,0.05)] border
                              ${isDark 
                                  ? 'bg-white/10 border-white/10 text-gray-200 hover:bg-white/20 rounded-none' 
                                  : 'bg-white border-gray-100 text-gray-700 rounded-lg'
                              }
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          {t[language].selectFile}
                        </Button>
                      </div>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".pdf,.doc,.docx,.html"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className={`p-4 rounded border ${isDark ? 'bg-red-900/20 border-red-500/50 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      {error}
                    </div>
                  )}

                  {/* Action Button - MIRROR TECH HUD BUTTON */}
                  <div className="pt-4 pb-8 flex items-center justify-center md:justify-start gap-4">
                    <Button 
                      className={`relative w-full md:w-auto overflow-hidden text-white border px-12 py-6 h-auto text-base font-medium tracking-wide transition-all shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] group 
                        ${isDark
                           ? 'bg-white text-black border-white/20 hover:bg-gray-200 rounded-none'
                           : 'bg-[#222224] border-white/10 rounded-lg'
                        }
                        ${isComplete 
                            ? (isDark ? 'bg-white/90 border-black/10' : 'bg-[#1A1A1A] border-white/40 shadow-white/5') 
                            : ''
                        }
                      `}
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                    >
                      {/* --- GEOMETRIC TECH OVERLAY --- */}
                      
                      {/* 1. Large Rotating Arc (Right side) */}
                      <div className={`absolute top-1/2 right-[-20%] w-[120%] h-[200%] -translate-y-1/2 rounded-full border border-dashed animate-[spin_10s_linear_infinite] pointer-events-none opacity-40
                          ${isDark ? 'border-black/20' : 'border-white/10'}
                      `}></div>
                      
                      {/* 2. Thin Crosshair Lines */}
                      <div className={`absolute top-0 bottom-0 left-8 w-[1px] pointer-events-none ${isDark ? 'bg-black/10' : 'bg-white/5'}`}></div>
                      <div className={`absolute left-0 right-0 top-1/2 h-[1px] pointer-events-none ${isDark ? 'bg-black/10' : 'bg-white/5'}`}></div>

                      {/* 3. Corner Markers */}
                      <div className={`absolute top-1.5 left-1.5 w-2 h-2 border-l border-t pointer-events-none ${isDark ? 'border-black/30' : 'border-white/30'}`}></div>
                      <div className={`absolute bottom-1.5 right-1.5 w-2 h-2 border-r border-b pointer-events-none ${isDark ? 'border-black/30' : 'border-white/30'}`}></div>

                      {/* 4. Scanning Line (Subtle) */}
                      <div className={`absolute top-0 bottom-0 left-0 w-[2px] blur-[1px] animate-[shimmer_3s_infinite] pointer-events-none ${isDark ? 'bg-black/20' : 'bg-white/20'}`}></div>

                      {/* Content */}
                      {isAnalyzing ? (
                        <span className={`flex items-center gap-2 relative z-10 ${isDark ? 'text-black' : 'text-gray-200'}`}>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {t[language].analyzing}
                        </span>
                      ) : isComplete ? (
                        <span className={`flex items-center gap-2 relative z-10 ${isDark ? 'text-black' : 'text-white'}`}><Check className={`w-5 h-5 ${isDark ? 'text-black' : 'text-white'}`} /> {t[language].complete}</span>
                      ) : (
                        <span className="flex items-center gap-3 relative z-10">
                           {t[language].initiate}
                           <ArrowRight className={`w-4 h-4 ${isDark ? 'text-black/70' : 'text-white/70'}`} />
                        </span>
                      )}
                    </Button>
                    {isComplete && <span className={`text-sm font-bold drop-shadow-sm animate-in fade-in zoom-in ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t[language].completeText}</span>}
                  </div>
                </div>
              </ScrollArea>

              {/* Details Overlay */}
              <AnimatePresence>
                {showDetails && profile && (
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.8 }}
                    className={`absolute inset-x-0 bottom-0 top-0 backdrop-blur-xl z-30 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.15)] overflow-hidden
                        ${isDark 
                            ? 'bg-[#050505] border-t border-white/10 rounded-none' 
                            : 'bg-[#F7F8FA]/95 border-t border-white rounded-t-2xl'
                        }
                    `}
                  >
                    <div className="w-16 h-1.5 bg-gray-300/50 rounded-full mx-auto mt-4 mb-2 shrink-0" />
                    <ScrollArea className="flex-1 h-full w-full">
                      <div className="p-8 pb-24 space-y-8 max-w-xl mx-auto">
                         
                         {/* Header Info */}
                        <div>
                          {isEditing ? (
                            <div className="space-y-4 mb-6">
                              <Input 
                                value={profile.name || ''} 
                                onChange={(e) => setProfile({...profile, name: e.target.value})}
                                className={`text-2xl font-bold h-12 shadow-sm ${isDark ? 'bg-black/40 border-white/10 text-white rounded-none' : 'bg-white border-gray-200 text-black'}`}
                                placeholder="Name"
                              />
                              <Input 
                                value={profile.contact || profile.email || ''} 
                                onChange={(e) => setProfile({...profile, contact: e.target.value})}
                                className={`text-sm font-mono h-10 shadow-sm ${isDark ? 'bg-black/40 border-white/10 text-white rounded-none' : 'bg-white border-gray-200 text-black'}`}
                                placeholder="Contact"
                              />
                            </div>
                          ) : (
                            <>
                              <h1 className={`text-3xl font-black mb-2 tracking-tight ${isDark ? 'text-white' : 'text-[#1A1A1A]'}`}>{profile.name || '未命名'}</h1>
                              <div className={`text-xs font-mono mb-6 flex items-center gap-2 px-3 py-1.5 w-fit
                                 ${isDark ? 'bg-white/10 text-gray-300 rounded-none' : 'bg-gray-100 text-gray-500 rounded-lg'}
                              `}>
                                <span className={`w-2 h-2 rounded-full inline-block animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.2)] ${isDark ? 'bg-white/80' : 'bg-black/80'}`}></span>
                                {profile.contact || profile.email || profile.phone || '无联系方式'}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Section: Intro */}
                        {(profile.intro || profile.summary || isEditing) && (
                          <div className="space-y-3">
                            <h3 className={`font-bold text-sm flex items-center gap-2 uppercase tracking-wider opacity-80 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}></span>
                              {t[language].intro}
                            </h3>
                            {isEditing ? (
                              <Textarea 
                                value={profile.intro || profile.summary || ''}
                                onChange={(e) => setProfile({...profile, intro: e.target.value})}
                                className={`text-sm leading-relaxed min-h-[150px] shadow-sm ${isDark ? 'bg-black/40 border-white/10 text-gray-300 rounded-none' : 'bg-white border-gray-200'}`}
                                placeholder={language === 'zh' ? '个人简介...' : 'Introduction...'}
                              />
                            ) : (
                               <p className={`text-sm leading-relaxed p-4 border shadow-[2px_2px_10px_rgba(0,0,0,0.02)]
                                  ${isDark ? 'text-gray-300 bg-white/5 border-white/10 rounded-none' : 'text-gray-600 bg-white border-gray-100 rounded-xl'}
                               `}>
                                {profile.intro || profile.summary}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Section: Education */}
                        {((profile.education && profile.education.length > 0) || isEditing) && (
                          <div className="space-y-5">
                            <div className="flex items-center justify-between">
                              <h3 className={`font-bold text-sm flex items-center gap-2 uppercase tracking-wider opacity-80 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                 <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}></span>
                                {t[language].education}
                              </h3>
                              {isEditing && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={handleAddEducation}
                                  className={`h-7 px-3 text-xs ${isDark ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-gray-200'}`}
                                >
                                  + {language === 'zh' ? '添加' : 'Add'}
                                </Button>
                              )}
                            </div>
                            {(profile.education || []).map((edu, idx) => (
                              <div key={idx} className={`border-l-[3px] pl-5 py-1 relative ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                {isEditing ? (
                                  <div className={`space-y-3 mb-6 p-4 relative ${isDark ? 'bg-white/5 rounded-none' : 'bg-gray-50 rounded-lg'}`}>
                                    {isEditing && (profile.education || []).length > 1 && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveEducation(idx)}
                                        className="absolute top-2 right-2 h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-100"
                                      >
                                        ✕
                                      </Button>
                                    )}
                                    <Input 
                                      value={edu.school || ''} 
                                      onChange={(e) => {
                                        const newEdu = [...(profile.education || [])];
                                        newEdu[idx] = {...newEdu[idx], school: e.target.value};
                                        setProfile({...profile, education: newEdu});
                                      }}
                                      className={`font-bold text-sm h-9 ${isDark ? 'bg-black/40 border-white/10 text-white rounded-none' : 'bg-white'}`}
                                      placeholder="School"
                                    />
                                    <Input 
                                      value={edu.degree || edu.major || ''} 
                                      onChange={(e) => {
                                        const newEdu = [...(profile.education || [])];
                                        newEdu[idx] = {...newEdu[idx], degree: e.target.value};
                                        setProfile({...profile, education: newEdu});
                                      }}
                                      className={`text-sm h-9 ${isDark ? 'bg-black/40 border-white/10 text-gray-300 rounded-none' : 'bg-white'}`}
                                      placeholder="Degree"
                                    />
                                    <Input 
                                      value={edu.period || `${edu.start || ''} - ${edu.end || ''}`.trim()}
                                      onChange={(e) => {
                                        const newEdu = [...(profile.education || [])];
                                        newEdu[idx] = {...newEdu[idx], period: e.target.value};
                                        setProfile({...profile, education: newEdu});
                                      }}
                                      className={`text-xs h-8 ${isDark ? 'bg-black/40 border-white/10 text-gray-400 rounded-none' : 'bg-white'}`}
                                      placeholder="Period"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <div className={`font-bold text-base ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{edu.school}</div>
                                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1 mb-2">
                                      {edu.period || `${edu.start || ''} - ${edu.end || ''}`.trim() || 'Present'}
                                    </div>
                                    <div className={`text-sm inline-block px-3 py-2 ${isDark ? 'text-gray-300 bg-white/10 rounded-none' : 'text-gray-700 bg-gray-50 rounded-lg'}`}>
                                      {edu.degree || edu.major || 'Degree'}
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Section: Experience */}
                        {((profile.experience && profile.experience.length > 0) || isEditing) && (
                          <div className="space-y-5">
                            <div className="flex items-center justify-between">
                              <h3 className={`font-bold text-sm flex items-center gap-2 uppercase tracking-wider opacity-80 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                 <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}></span>
                                {t[language].experience}
                              </h3>
                              {isEditing && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={handleAddExperience}
                                  className={`h-7 px-3 text-xs ${isDark ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-gray-200'}`}
                                >
                                  + {language === 'zh' ? '添加' : 'Add'}
                                </Button>
                              )}
                            </div>
                            {(profile.experience || []).map((exp, idx) => (
                               <div key={idx} className={`relative p-5 border shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_25px_-10px_rgba(0,0,0,0.08)] transition-all
                                  ${isDark ? 'bg-white/5 border-white/10 rounded-none' : 'bg-white border-gray-100 rounded-2xl'}
                               `}>
                                {isEditing ? (
                                  <div className="space-y-3 relative">
                                    {isEditing && (profile.experience || []).length > 1 && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRemoveExperience(idx)}
                                        className="absolute top-0 right-0 h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-100 z-10"
                                      >
                                        ✕
                                      </Button>
                                    )}
                                    <Input 
                                      value={exp.company || ''} 
                                      onChange={(e) => {
                                        const newExp = [...(profile.experience || [])];
                                        newExp[idx] = {...newExp[idx], company: e.target.value};
                                        setProfile({...profile, experience: newExp});
                                      }}
                                      className={`font-bold text-sm h-9 ${isDark ? 'bg-black/40 border-white/10 text-white rounded-none' : 'bg-gray-50'}`}
                                      placeholder="Company"
                                    />
                                    <Input 
                                      value={exp.role || ''} 
                                      onChange={(e) => {
                                        const newExp = [...(profile.experience || [])];
                                        newExp[idx] = {...newExp[idx], role: e.target.value};
                                        setProfile({...profile, experience: newExp});
                                      }}
                                      className={`text-sm font-medium h-9 ${isDark ? 'bg-black/40 border-white/10 text-gray-300 rounded-none' : 'bg-gray-50'}`}
                                      placeholder="Role"
                                    />
                                    <Input 
                                      value={exp.period || `${exp.start || ''} - ${exp.end || ''}`.trim()}
                                      onChange={(e) => {
                                        const newExp = [...(profile.experience || [])];
                                        newExp[idx] = {...newExp[idx], period: e.target.value};
                                        setProfile({...profile, experience: newExp});
                                      }}
                                      className={`text-xs text-gray-400 h-8 ${isDark ? 'bg-black/40 border-white/10 rounded-none' : 'bg-gray-50'}`}
                                      placeholder="Period"
                                    />
                                    <Textarea
                                      value={(exp.bullets || exp.details || []).join('\n')}
                                      onChange={(e) => {
                                        const newExp = [...(profile.experience || [])];
                                        newExp[idx] = {...newExp[idx], bullets: e.target.value.split('\n').filter(l => l.trim())};
                                        setProfile({...profile, experience: newExp});
                                      }}
                                      className={`text-sm min-h-[100px] ${isDark ? 'bg-black/40 border-white/10 text-gray-400 rounded-none' : 'bg-gray-50 text-gray-600'}`}
                                      placeholder="Details (one per line)"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <div className={`font-bold text-base ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{exp.company}</div>
                                        <div className={`text-sm font-semibold mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{exp.role}</div>
                                      </div>
                                      <div className={`text-[10px] font-bold px-2 py-1 uppercase tracking-wider ${isDark ? 'text-gray-500 bg-white/10 rounded-none' : 'text-gray-400 bg-gray-50 rounded-md'}`}>
                                        {exp.period || `${exp.start || ''} - ${exp.end || ''}`.trim() || 'Present'}
                                      </div>
                                    </div>
                                    
                                    {(exp.bullets || exp.details) && (exp.bullets || exp.details)!.length > 0 && (
                                      <ul className={`list-disc list-inside text-sm space-y-2 ml-1 ${isDark ? 'text-gray-400 marker:text-gray-600' : 'text-gray-600 marker:text-gray-300'}`}>
                                        {(exp.bullets || exp.details || []).map((detail, dIdx) => (
                                          <li key={dIdx}>{detail}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </>
                                )}
                               </div>
                            ))}
                          </div>
                        )}

                         {/* Action Area */}
                         <div className="pt-4 flex justify-end gap-3">
                            <Button 
                              variant="ghost" 
                              onClick={onBack}
                              className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}
                            >
                               Cancel
                            </Button>
                            <Button 
                              onClick={onNext}
                              className={`bg-[#1A1A1A] text-white hover:bg-black px-8
                                 ${isDark ? 'bg-white text-black hover:bg-gray-200 rounded-none' : 'bg-[#1A1A1A] text-white hover:bg-black rounded-lg'}
                              `}
                            >
                               Confirm & Next <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                         </div>
                      </div>
                    </ScrollArea>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </motion.div>

      </div>

    </div>
  );
}

