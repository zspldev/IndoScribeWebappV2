import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Play,
  Pause,
  FileAudio,
  Download,
  Loader2,
  Mic,
  FileText,
  RotateCcw,
  RotateCw,
  Search,
  WrapText,
  Minus,
  Plus,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  SeparatorHorizontal,
  Save,
  X,
  Languages,
  RefreshCw,
  PanelRightClose,
  PanelRightOpen,
  CalendarClock,
} from "lucide-react";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { useLanguages } from "@/lib/useLanguages";
import { transliterateWord } from "@/lib/transliterate";
import AppLogo from "@/components/AppLogo";
import HowItWorks from "@/components/HowItWorks";

interface ProjectData {
  id: number;
  title: string;
  languageCode: string;
  status: string;
  audioFilename: string | null;
  audioDurationSeconds: number | null;
  rawTranscript: string | null;
  formattedTranscript: string | null;
  editedContent: string | null;
  sttProvider: string | null;
  sttJobId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TranslationData {
  id: number;
  projectId: number;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  translatedContent: string | null;
  editedContent: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const TRANSLATION_LANGS = [
  { code: "en-IN", name: "English" },
  { code: "hi-IN", name: "Hindi" },
  { code: "mr-IN", name: "Marathi" },
];

export default function ProjectEditor() {
  const { user, logout } = useAuth();
  const hasFeature = (key: string) => user?.role === "admin" || (user?.planFeatures ?? []).includes(key);
  const canTranslate = hasFeature("translation");
  const canExportDocx = hasFeature("docx_export");
  const canExportPdf = hasFeature("pdf_watermark") || hasFeature("pdf_no_watermark");
  const canUseRichText = hasFeature("rich_text_editor");
  const { getLanguageName, getLanguageScript } = useLanguages();
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const queryClient = qc;

  const [editedText, setEditedText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const initialLoadDoneRef = useRef(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(true);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [transliterationEnabled, setTransliterationEnabled] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [activeTranslationLang, setActiveTranslationLang] = useState<string>("");
  const [translatedText, setTranslatedText] = useState("");
  const [translationSaveStatus, setTranslationSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [exportMode, setExportMode] = useState<"source" | "translation" | "both">("source");
  const [transUndoStack, setTransUndoStack] = useState<string[]>([]);
  const [transRedoStack, setTransRedoStack] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const transTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translationSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const { data: project, isLoading } = useQuery<ProjectData>({
    queryKey: ["/api/projects", projectId],
    enabled: projectId > 0,
  });

  const lastProjectStatusRef = useRef<string>("");

  useEffect(() => {
    if (project) {
      const text = project.editedContent || project.formattedTranscript || project.rawTranscript || "";
      const statusChanged = lastProjectStatusRef.current !== "" && lastProjectStatusRef.current !== project.status;
      lastProjectStatusRef.current = project.status;

      if (!initialLoadDoneRef.current || statusChanged) {
        setEditedText(text);
        setOriginalText(text);
        initialLoadDoneRef.current = true;
      }
    }
  }, [project]);

  useEffect(() => {
    if (project) {
      const script = getLanguageScript(project.languageCode);
      if (script === "Devanagari") {
        setTransliterationEnabled(true);
      }
    }
  }, [project?.languageCode]);

  const handleTransliterateKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!transliterationEnabled) return;
    if (e.key !== ' ' && e.key !== 'Enter') return;
    if (e.nativeEvent.isComposing || (e.nativeEvent as any).keyCode === 229) return;

    const ta = textareaRef.current;
    if (!ta) return;

    if (ta.selectionStart !== ta.selectionEnd) return;

    const cursorPos = ta.selectionStart;
    const text = editedText;

    let wordStart = cursorPos;
    while (wordStart > 0 && /[a-zA-Z~]/.test(text[wordStart - 1])) {
      wordStart--;
    }

    if (wordStart >= cursorPos) return;

    const latinWord = text.substring(wordStart, cursorPos);
    if (!/[a-zA-Z]/.test(latinWord)) return;

    const devanagariWord = transliterateWord(latinWord);
    if (devanagariWord === latinWord) return;

    e.preventDefault();
    const separator = e.key === 'Enter' ? '\n' : ' ';
    const newText = text.substring(0, wordStart) + devanagariWord + separator + text.substring(cursorPos);
    const newPos = wordStart + devanagariWord.length + 1;
    handleTextChange(newText);

    requestAnimationFrame(() => {
      ta.setSelectionRange(newPos, newPos);
    });
  }, [transliterationEnabled, editedText]);

  const isManualSaveRef = useRef(false);

  const saveMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("PUT", `/api/projects/${projectId}`, { editedContent: text });
      return { ...(await res.json()), savedText: text };
    },
    onSuccess: (data: any) => {
      setSaveStatus("saved");
      if (isManualSaveRef.current) {
        setOriginalText(data.savedText);
        isManualSaveRef.current = false;
      }
    },
    onError: () => {
      setSaveStatus("unsaved");
      isManualSaveRef.current = false;
    },
  });

  const autoSave = useCallback((text: string) => {
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus("saving");
      isManualSaveRef.current = false;
      saveMutation.mutate(text);
    }, 2000);
  }, [saveMutation]);

  const handleTextChange = (newText: string) => {
    setUndoStack(prev => [...prev.slice(-50), editedText]);
    setRedoStack([]);
    setEditedText(newText);
    autoSave(newText);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, editedText]);
    setUndoStack(u => u.slice(0, -1));
    setEditedText(prev);
    autoSave(prev);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, editedText]);
    setRedoStack(r => r.slice(0, -1));
    setEditedText(next);
    autoSave(next);
  };

  const handleManualSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    isManualSaveRef.current = true;
    saveMutation.mutate(editedText);
  };

  const handleCancelEdits = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setEditedText(originalText);
    setUndoStack([]);
    setRedoStack([]);
    setSaveStatus("saving");
    isManualSaveRef.current = true;
    saveMutation.mutate(originalText);
  };

  const hasUnsavedChanges = editedText !== originalText;

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = editedText.substring(start, end);
    const newText = editedText.substring(0, start) + prefix + selected + suffix + editedText.substring(end);
    handleTextChange(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const insertPageBreak = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const newText = editedText.substring(0, pos) + "\n---PAGE BREAK---\n" + editedText.substring(pos);
    handleTextChange(newText);
  };

  const handleFindReplace = () => {
    if (!findText) return;
    const newText = editedText.replaceAll(findText, replaceText);
    if (newText !== editedText) {
      handleTextChange(newText);
    }
  };

  const { data: translations = [] } = useQuery<TranslationData[]>({
    queryKey: ["/api/projects", projectId, "translations"],
    enabled: projectId > 0 && !!(project?.rawTranscript || project?.editedContent),
  });

  useEffect(() => {
    if (activeTranslationLang && translations.length > 0) {
      const t = translations.find(tr => tr.targetLanguageCode === activeTranslationLang);
      if (t) {
        setTranslatedText(t.editedContent || t.translatedContent || "");
      }
    }
  }, [translations, activeTranslationLang]);

  const translateMutation = useMutation({
    mutationFn: async (targetLanguageCode: string) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/translations`, { targetLanguageCode });
      return res.json();
    },
    onSuccess: (data: TranslationData) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "translations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setActiveTranslationLang(data.targetLanguageCode);
      setTranslatedText(data.editedContent || data.translatedContent || "");
      setTransUndoStack([]);
      setTransRedoStack([]);
      setShowTranslation(true);
    },
    onError: (err: any) => {
      setError(err.message || "Translation failed");
    },
  });

  const saveTranslationMutation = useMutation({
    mutationFn: async ({ id, text }: { id: number; text: string }) => {
      const res = await apiRequest("PUT", `/api/translations/${id}`, { editedContent: text });
      return res.json();
    },
    onSuccess: () => {
      setTranslationSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "translations"] });
    },
    onError: () => {
      setTranslationSaveStatus("unsaved");
    },
  });

  const autoSaveTranslation = useCallback((text: string) => {
    const t = translations.find(tr => tr.targetLanguageCode === activeTranslationLang);
    if (!t) return;
    setTranslationSaveStatus("unsaved");
    if (translationSaveTimerRef.current) clearTimeout(translationSaveTimerRef.current);
    translationSaveTimerRef.current = setTimeout(() => {
      setTranslationSaveStatus("saving");
      saveTranslationMutation.mutate({ id: t.id, text });
    }, 2000);
  }, [translations, activeTranslationLang, saveTranslationMutation]);

  const handleTranslatedTextChange = (newText: string) => {
    setTransUndoStack(prev => [...prev.slice(-50), translatedText]);
    setTransRedoStack([]);
    setTranslatedText(newText);
    autoSaveTranslation(newText);
  };

  const transUndo = () => {
    if (transUndoStack.length === 0) return;
    const prev = transUndoStack[transUndoStack.length - 1];
    setTransRedoStack(r => [...r, translatedText]);
    setTransUndoStack(u => u.slice(0, -1));
    setTranslatedText(prev);
    autoSaveTranslation(prev);
  };

  const transRedo = () => {
    if (transRedoStack.length === 0) return;
    const next = transRedoStack[transRedoStack.length - 1];
    setTransUndoStack(u => [...u, translatedText]);
    setTransRedoStack(r => r.slice(0, -1));
    setTranslatedText(next);
    autoSaveTranslation(next);
  };

  const insertTransMarkdown = (prefix: string, suffix: string = "") => {
    const ta = transTextareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = translatedText.substring(start, end);
    const newText = translatedText.substring(0, start) + prefix + selected + suffix + translatedText.substring(end);
    handleTranslatedTextChange(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const insertTransPageBreak = () => {
    const ta = transTextareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const newText = translatedText.substring(0, pos) + "\n---PAGE BREAK---\n" + translatedText.substring(pos);
    handleTranslatedTextChange(newText);
  };

  const handleTranslate = (langCode: string) => {
    setActiveTranslationLang(langCode);
    translateMutation.mutate(langCode);
  };

  const selectExistingTranslation = (langCode: string) => {
    const t = translations.find(tr => tr.targetLanguageCode === langCode);
    if (t) {
      setActiveTranslationLang(langCode);
      setTranslatedText(t.editedContent || t.translatedContent || "");
      setTransUndoStack([]);
      setTransRedoStack([]);
      setShowTranslation(true);
    }
  };

  const availableTargetLangs = TRANSLATION_LANGS.filter(l => l.code !== project?.languageCode);

  const transcribeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/transcribe`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
    onError: (err: any) => {
      setError(err.message || "Transcription failed");
    },
  });

  const { data: transcriptionStatus } = useQuery({
    queryKey: ["/api/projects", projectId, "status"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      return res.json();
    },
    enabled: project?.status === "transcribing",
    refetchInterval: project?.status === "transcribing" ? 5000 : false,
  });

  useEffect(() => {
    if (transcriptionStatus?.status === "completed" || transcriptionStatus?.status === "editing") {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    }
  }, [transcriptionStatus?.status]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const duration = audioRef.current.duration || 0;
    setAudioCurrentTime(current);
    setAudioProgress(duration > 0 ? (current / duration) * 100 : 0);
  };

  const handleAudioLoaded = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration || 0);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    audioRef.current.currentTime = percent * (audioRef.current.duration || 0);
  };

  const formatAudioTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getWordCount = () => editedText.trim().split(/\s+/).filter(Boolean).length;
  const getCharCount = () => editedText.length;
  const getLineCount = () => editedText.split("\n").length;
  const getPageBreakCount = () => (editedText.match(/---PAGE BREAK---/g) || []).length;

  const handleDownloadDocx = async () => {
    if (!editedText.trim() || isExporting) return;
    setIsExporting(true);
    try {
      let docxUrl = `/api/projects/${projectId}/docx?mode=${exportMode}`;
      if ((exportMode === "translation" || exportMode === "both") && activeTranslationLang) {
        docxUrl += `&translationLang=${activeTranslationLang}`;
      }
      const response = await fetch(docxUrl, {
        credentials: "include",
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Download failed" }));
        throw new Error(errData.error || "Download failed");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      let filename = `transcription-${projectId}.docx`;
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to download document");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!editedText.trim() || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      let pdfUrl = `/api/projects/${projectId}/pdf?mode=${exportMode}`;
      if ((exportMode === "translation" || exportMode === "both") && activeTranslationLang) {
        pdfUrl += `&translationLang=${activeTranslationLang}`;
      }
      const response = await fetch(pdfUrl, { credentials: "include" });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Download failed" }));
        throw new Error(errData.error || "Download failed");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      let filename = `transcription-${projectId}.pdf`;
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to download PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-editor">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-project-editor">
      <nav className="h-14 border-b flex items-center px-4 gap-3 bg-card sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <AppLogo className="text-xl flex-shrink-0" />
        <span className="text-sm text-muted-foreground" data-testid="text-user-name">{user.fullName}</span>
        <HowItWorks />
        <div className="flex-1" />
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-medium truncate max-w-[200px]" data-testid="text-project-title">{project.title}</span>
          <Badge variant="secondary" className="text-xs" data-testid="badge-language">
            {getLanguageName(project.languageCode)}
          </Badge>
          <Badge
            variant={project.status === "completed" ? "secondary" : "outline"}
            className={`text-xs ${project.status === "translated" ? "bg-[hsl(270,50%,40%)] text-white" : ""}`}
            data-testid="badge-status"
          >
            {project.status === "translated" ? "Translated" : project.status}
          </Badge>
          <span className="text-xs text-muted-foreground" data-testid="text-save-status">
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Unsaved"}
          </span>
        </div>
      </nav>

      {user?.isTrialExpired && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs flex items-center gap-2" data-testid="banner-trial-expired">
          <CalendarClock className="h-3.5 w-3.5 flex-shrink-0" />
          Trial expired. Transcription and translation are disabled. You can still edit and export your existing work.
        </div>
      )}

      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs" data-testid="text-editor-error">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">dismiss</button>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="lg:w-80 border-b lg:border-b-0 lg:border-r p-4 space-y-4 overflow-y-auto flex-shrink-0">
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Audio</h3>
            {project.audioFilename ? (
              <Card className="p-3 space-y-2.5" data-testid="card-audio-player">
                <div className="flex items-center gap-2">
                  <FileAudio className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs truncate flex-1" data-testid="text-audio-filename">{project.audioFilename}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={toggleAudio} data-testid="button-play-audio">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <div className="flex-1 space-y-1">
                    <div
                      ref={progressBarRef}
                      className="h-1.5 bg-muted rounded-full cursor-pointer overflow-hidden"
                      onClick={handleProgressClick}
                      data-testid="progress-audio"
                    >
                      <div
                        className="h-full bg-[hsl(30,100%,50%)] rounded-full transition-all duration-200"
                        style={{ width: `${audioProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                      <span data-testid="text-audio-current">{formatAudioTime(audioCurrentTime)}</span>
                      <span data-testid="text-audio-duration">{formatAudioTime(audioDuration)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <a href={`/api/projects/${projectId}/audio`} download>
                    <Button size="sm" variant="outline" data-testid="button-download-audio">
                      <Download className="h-3 w-3 mr-1" />
                      <span className="text-xs">Download</span>
                    </Button>
                  </a>
                </div>

                <audio
                  ref={audioRef}
                  src={`/api/projects/${projectId}/audio`}
                  onEnded={() => { setIsPlaying(false); setAudioProgress(0); setAudioCurrentTime(0); }}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onLoadedMetadata={handleAudioLoaded}
                />
              </Card>
            ) : (
              <Card className="p-3 text-center" data-testid="card-no-audio">
                <FileAudio className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">No audio available</p>
              </Card>
            )}
          </div>

          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Transcription</h3>
            {project.status === "transcribing" ? (
              <Card className="p-4 space-y-3" data-testid="card-transcribing">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-[hsl(30,100%,50%)]" />
                  <span className="text-sm font-medium">Transcribing...</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-[hsl(30,100%,50%)] rounded-full animate-pulse" style={{ width: "60%" }} />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Converting speech to text. This may take a few minutes depending on audio length.
                </p>
              </Card>
            ) : project.audioFilename && !project.rawTranscript ? (
              <Button
                className="w-full bg-[hsl(30,100%,50%)] border-[hsl(30,100%,42%)] text-white"
                onClick={() => transcribeMutation.mutate()}
                disabled={transcribeMutation.isPending || user?.isTrialExpired}
                data-testid="button-start-transcription"
              >
                {transcribeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-1.5" />
                    Start Transcription
                  </>
                )}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                {project.rawTranscript ? "Transcription complete" : "No audio available"}
              </p>
            )}
          </div>

          {(project.rawTranscript || project.editedContent) && canTranslate && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Translation</h3>
              <Card className="p-3 space-y-2.5" data-testid="card-translation">
                <div className="space-y-1.5">
                  {availableTargetLangs.map(lang => {
                    const existing = translations.find(t => t.targetLanguageCode === lang.code);
                    return (
                      <div key={lang.code} className="flex items-center gap-2" data-testid={`translation-row-${lang.code}`}>
                        <span className="text-xs flex-1">{lang.name}</span>
                        {existing ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => selectExistingTranslation(lang.code)}
                              data-testid={`button-view-translation-${lang.code}`}
                            >
                              <span className="text-xs">View</span>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleTranslate(lang.code)}
                              disabled={translateMutation.isPending || user?.isTrialExpired}
                              title={user?.isTrialExpired ? "Trial expired" : "Retranslate"}
                              data-testid={`button-retranslate-${lang.code}`}
                            >
                              <RefreshCw className={`h-3 w-3 ${translateMutation.isPending && activeTranslationLang === lang.code ? "animate-spin" : ""}`} />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-[hsl(30,100%,50%)] border-[hsl(30,100%,42%)] text-white"
                            onClick={() => handleTranslate(lang.code)}
                            disabled={translateMutation.isPending || user?.isTrialExpired}
                            data-testid={`button-translate-${lang.code}`}
                          >
                            {translateMutation.isPending && activeTranslationLang === lang.code ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Languages className="h-3 w-3 mr-1" />
                            )}
                            <span className="text-xs">Translate</span>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {showTranslation && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowTranslation(false)}
                    data-testid="button-hide-translation"
                  >
                    <PanelRightClose className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Hide Translation</span>
                  </Button>
                )}
              </Card>
            </div>
          )}

          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Export</h3>
            <Card className="p-3 space-y-2.5" data-testid="card-export">
              {!canExportDocx && (
                <p className="text-xs text-muted-foreground" data-testid="text-no-export-feature">DOCX export requires Basic plan or higher.</p>
              )}
              {canExportDocx && translations.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Export content:</span>
                  <div className="flex flex-col gap-1">
                    {(["source", "translation", "both"] as const).map(mode => (
                      <label key={mode} className="flex items-center gap-2 text-xs cursor-pointer" data-testid={`radio-export-${mode}`}>
                        <input
                          type="radio"
                          name="exportMode"
                          value={mode}
                          checked={exportMode === mode}
                          onChange={() => setExportMode(mode)}
                          className="accent-[hsl(30,100%,50%)]"
                        />
                        {mode === "source" ? "Original only" : mode === "translation" ? "Translation only" : "Both (bilingual)"}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {!canExportDocx && !canExportPdf && (
                <p className="text-xs text-muted-foreground" data-testid="text-no-pdf-feature">Export not available on your plan.</p>
              )}
              <Button
                variant="outline"
                className="w-full"
                disabled={!canExportDocx || !editedText.trim() || isExporting || ((exportMode === "translation" || exportMode === "both") && (!activeTranslationLang || !translations.find(t => t.targetLanguageCode === activeTranslationLang)))}
                onClick={handleDownloadDocx}
                data-testid="button-export-docx"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1.5" />
                )}
                {isExporting ? "Preparing..." : "Download DOCX"}
              </Button>
              {canExportPdf && (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!editedText.trim() || isExportingPdf || ((exportMode === "translation" || exportMode === "both") && (!activeTranslationLang || !translations.find(t => t.targetLanguageCode === activeTranslationLang)))}
                  onClick={handleDownloadPdf}
                  data-testid="button-export-pdf"
                >
                  {isExportingPdf ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-1.5" />
                  )}
                  {isExportingPdf ? "Preparing PDF..." : "Download PDF"}
                </Button>
              )}
            </Card>
          </div>

          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Statistics</h3>
            <div className="grid grid-cols-2 gap-2 text-xs" data-testid="stats-panel">
              <div className="bg-muted rounded-md p-2">
                <p className="text-muted-foreground">Lines</p>
                <p className="font-medium">{getLineCount()}</p>
              </div>
              <div className="bg-muted rounded-md p-2">
                <p className="text-muted-foreground">Words</p>
                <p className="font-medium">{getWordCount()}</p>
              </div>
              <div className="bg-muted rounded-md p-2">
                <p className="text-muted-foreground">Characters</p>
                <p className="font-medium">{getCharCount()}</p>
              </div>
              <div className="bg-muted rounded-md p-2">
                <p className="text-muted-foreground">Page Breaks</p>
                <p className="font-medium">{getPageBreakCount()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden p-3">
          <div className={`flex gap-3 flex-1 overflow-hidden ${showTranslation ? "flex-row" : "flex-col"}`}>
          <div className={`border rounded-md flex flex-col ${showTranslation ? "flex-1" : "flex-1"} overflow-hidden bg-card`}>
          <div className="px-3 py-1.5 flex items-center gap-1 flex-wrap border-b flex-shrink-0" data-testid="toolbar">
            <Button size="icon" variant="ghost" onClick={undo} disabled={undoStack.length === 0} data-testid="button-undo">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={redo} disabled={redoStack.length === 0} data-testid="button-redo">
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
            {canUseRichText && (
              <>
                <div className="w-px h-5 bg-border mx-1" />
                <Button size="icon" variant="ghost" onClick={() => insertMarkdown("**", "**")} data-testid="button-bold">
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => insertMarkdown("*", "*")} data-testid="button-italic">
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => insertMarkdown("__", "__")} data-testid="button-underline">
                  <Underline className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => insertMarkdown("~~", "~~")} data-testid="button-strikethrough">
                  <Strikethrough className="h-3.5 w-3.5" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
                <Button size="icon" variant="ghost" onClick={() => insertMarkdown("# ")} data-testid="button-h1">
                  <Heading1 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => insertMarkdown("## ")} data-testid="button-h2">
                  <Heading2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => insertMarkdown("### ")} data-testid="button-h3">
                  <Heading3 className="h-3.5 w-3.5" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
                <Button size="icon" variant="ghost" onClick={insertPageBreak} data-testid="button-page-break">
                  <SeparatorHorizontal className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <div className="w-px h-5 bg-border mx-1" />
            <Button size="icon" variant="ghost" onClick={() => setFontSize(s => Math.max(10, s - 1))} data-testid="button-font-minus">
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-6 text-center" data-testid="text-font-size">{fontSize}</span>
            <Button size="icon" variant="ghost" onClick={() => setFontSize(s => Math.min(24, s + 1))} data-testid="button-font-plus">
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              size="icon"
              variant="ghost"
              className={`toggle-elevate ${wordWrap ? "toggle-elevated" : ""}`}
              onClick={() => setWordWrap(!wordWrap)}
              data-testid="button-word-wrap"
            >
              <WrapText className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={`toggle-elevate ${showFindReplace ? "toggle-elevated" : ""}`}
              onClick={() => setShowFindReplace(!showFindReplace)}
              data-testid="button-find-replace"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
            {project && getLanguageScript(project.languageCode) !== "Latin" && (
              <>
                <div className="w-px h-5 bg-border mx-1" />
                <Button
                  size="icon"
                  variant="ghost"
                  className={`toggle-elevate ${transliterationEnabled ? "toggle-elevated" : ""}`}
                  onClick={() => setTransliterationEnabled(!transliterationEnabled)}
                  title={transliterationEnabled ? "Phonetic typing ON — type in English, get Devanagari" : "Phonetic typing OFF — direct keyboard input"}
                  data-testid="button-transliterate"
                >
                  <span className="text-xs font-bold">{transliterationEnabled ? "अ" : "A"}</span>
                </Button>
              </>
            )}
            <div className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelEdits}
              disabled={!hasUnsavedChanges}
              data-testid="button-cancel-edits"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[hsl(30,100%,50%)] border-[hsl(30,100%,42%)] text-white"
              onClick={handleManualSave}
              disabled={(!hasUnsavedChanges && saveStatus === "saved") || saveMutation.isPending}
              data-testid="button-save"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1" />
              )}
              Save
            </Button>
          </div>

          {showFindReplace && (
            <div className="border-b px-3 py-2 flex items-center gap-2 flex-wrap bg-card" data-testid="find-replace-bar">
              <input
                className="text-xs border rounded-md px-2 py-1 bg-background w-36"
                placeholder="Find..."
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                data-testid="input-find"
              />
              <input
                className="text-xs border rounded-md px-2 py-1 bg-background w-36"
                placeholder="Replace..."
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                data-testid="input-replace"
              />
              <Button size="sm" variant="outline" onClick={handleFindReplace} data-testid="button-replace-all">
                Replace All
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <Textarea
              ref={textareaRef}
              value={editedText}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleTransliterateKeyDown}
              lang={project?.languageCode?.substring(0, 2) || "en"}
              className={`h-full min-h-[300px] resize-none border-0 focus-visible:ring-0 rounded-none ${
                project && getLanguageScript(project.languageCode) === "Devanagari" ? "font-devanagari" : "font-mono"
              }`}
              style={{
                fontSize: `${fontSize}px`,
                whiteSpace: wordWrap ? "pre-wrap" : "pre",
                overflowWrap: wordWrap ? "break-word" : "normal",
                overflowX: wordWrap ? "hidden" : "auto",
              }}
              placeholder="Enter or paste text here, or upload audio to transcribe..."
              data-testid="textarea-editor"
            />
          </div>
          </div>

          {showTranslation && activeTranslationLang && (
            <div className="border rounded-md flex flex-col flex-1 overflow-hidden bg-card" data-testid="panel-translation">
              <div className="px-3 py-1.5 flex items-center gap-1 flex-wrap border-b flex-shrink-0" data-testid="toolbar-translation">
                <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium mr-1">
                  {TRANSLATION_LANGS.find(l => l.code === activeTranslationLang)?.name || activeTranslationLang}
                </span>
                <div className="w-px h-5 bg-border mx-1" />
                <Button size="icon" variant="ghost" onClick={transUndo} disabled={transUndoStack.length === 0} data-testid="button-trans-undo">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={transRedo} disabled={transRedoStack.length === 0} data-testid="button-trans-redo">
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
                <Button size="icon" variant="ghost" onClick={() => insertTransMarkdown("**", "**")} data-testid="button-trans-bold">
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => insertTransMarkdown("*", "*")} data-testid="button-trans-italic">
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => insertTransMarkdown("__", "__")} data-testid="button-trans-underline">
                  <Underline className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => insertTransMarkdown("~~", "~~")} data-testid="button-trans-strikethrough">
                  <Strikethrough className="h-3.5 w-3.5" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
                <Button size="icon" variant="ghost" onClick={() => insertTransMarkdown("# ")} data-testid="button-trans-h1">
                  <Heading1 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => insertTransMarkdown("## ")} data-testid="button-trans-h2">
                  <Heading2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => insertTransMarkdown("### ")} data-testid="button-trans-h3">
                  <Heading3 className="h-3.5 w-3.5" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
                <Button size="icon" variant="ghost" onClick={insertTransPageBreak} data-testid="button-trans-page-break">
                  <SeparatorHorizontal className="h-3.5 w-3.5" />
                </Button>
                <div className="flex-1" />
                <Badge variant="secondary" className="text-xs" data-testid="badge-translation-status">
                  {translationSaveStatus === "saving" ? "Saving..." : translationSaveStatus === "saved" ? "Saved" : "Unsaved"}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleTranslate(activeTranslationLang)}
                  disabled={translateMutation.isPending || user?.isTrialExpired}
                  title={user?.isTrialExpired ? "Trial expired" : "Retranslate from latest source"}
                  data-testid="button-retranslate-panel"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${translateMutation.isPending ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowTranslation(false)}
                  data-testid="button-close-translation"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {translateMutation.isPending ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin text-[hsl(30,100%,50%)] mx-auto" />
                    <p className="text-sm text-muted-foreground">Translating...</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <Textarea
                    ref={transTextareaRef}
                    value={translatedText}
                    onChange={(e) => handleTranslatedTextChange(e.target.value)}
                    lang={activeTranslationLang?.substring(0, 2) || "en"}
                    className={`h-full min-h-[300px] resize-none border-0 focus-visible:ring-0 rounded-none ${
                      (activeTranslationLang === "hi-IN" || activeTranslationLang === "mr-IN") ? "font-devanagari" : "font-mono"
                    }`}
                    style={{
                      fontSize: `${fontSize}px`,
                      whiteSpace: wordWrap ? "pre-wrap" : "pre",
                      overflowWrap: wordWrap ? "break-word" : "normal",
                      overflowX: wordWrap ? "hidden" : "auto",
                    }}
                    placeholder="Translation will appear here..."
                    data-testid="textarea-translation"
                  />
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
