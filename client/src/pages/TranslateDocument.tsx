import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import AppLogo from "@/components/AppLogo";
import {
  Upload, FileText, Languages, LogOut, Download,
  Trash2, ArrowLeft, Loader2, X, CheckCircle, AlertTriangle, Zap,
} from "lucide-react";

const SUPPORTED_LANGS = [
  { code: "en-IN", name: "English" },
  { code: "hi-IN", name: "Hindi" },
  { code: "mr-IN", name: "Marathi" },
];

const LANG_NAME: Record<string, string> = {
  "en-IN": "English", "hi-IN": "Hindi", "mr-IN": "Marathi",
};

const MAX_WORDS = 20000;
const MAX_FILE_BYTES_TXT = 500 * 1024;
const MAX_FILE_BYTES_DOCX = 5 * 1024 * 1024;

interface DocTranslation {
  id: number;
  filename: string;
  fileType: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  originalText: string;
  translatedText: string | null;
  wordCount: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

function estimateWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function TranslateDocument() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState("hi-IN");
  const [targetLang, setTargetLang] = useState("en-IN");
  const [result, setResult] = useState<DocTranslation | null>(null);
  const [activeHistory, setActiveHistory] = useState<DocTranslation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUseFeature = user?.role === "admin" || (user?.planFeatures ?? []).includes("document_translation");

  const { data: history, isLoading: historyLoading } = useQuery<DocTranslation[]>({
    queryKey: ["/api/document-translations"],
    enabled: !!user,
  });

  const translateMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const form = new FormData();
      form.append("file", file);
      form.append("sourceLanguageCode", sourceLang);
      form.append("targetLanguageCode", targetLang);
      const res = await fetch("/api/document-translations", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Translation failed" }));
        throw new Error(err.error || "Translation failed");
      }
      return res.json() as Promise<DocTranslation>;
    },
    onSuccess: (data) => {
      setResult(data);
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/document-translations"] });
      toast({ title: "Translation complete", description: "Your document has been translated successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Translation failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/document-translations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-translations"] });
      if (result && activeHistory?.id === result?.id) setResult(null);
      setActiveHistory(null);
      toast({ title: "Deleted", description: "Translation record removed." });
    },
  });

  const handleFileChange = useCallback((chosen: File | null) => {
    if (!chosen) return;
    const ext = chosen.name.split(".").pop()?.toLowerCase();
    if (!["txt", "docx"].includes(ext ?? "")) {
      toast({ title: "Unsupported file", description: "Only .txt and .docx files are accepted.", variant: "destructive" });
      return;
    }
    const limit = ext === "docx" ? MAX_FILE_BYTES_DOCX : MAX_FILE_BYTES_TXT;
    if (chosen.size > limit) {
      toast({ title: "File too large", description: ext === "docx" ? "DOCX files must be under 5 MB." : "TXT files must be under 500 KB.", variant: "destructive" });
      return;
    }
    setFile(chosen);
    setResult(null);
    setActiveHistory(null);
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileChange(e.dataTransfer.files[0] ?? null);
  }, [handleFileChange]);

  const downloadFromServer = async (id: number, field: "original" | "translated") => {
    try {
      const res = await fetch(`/api/document-translations/${id}/download?field=${field}`);
      if (!res.ok) {
        toast({ title: "Download failed", description: "Could not download the file. Please try again.", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `document-${id}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", description: "Network error. Please try again.", variant: "destructive" });
    }
  };

  const displayed = activeHistory ?? result;
  const isTranslating = translateMutation.isPending;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-translate-document">

      {/* Nav */}
      <nav className="h-14 border-b flex items-center px-6 gap-4 bg-card">
        <AppLogo className="text-xl" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/dashboard")}
          className="text-muted-foreground hover:text-foreground gap-1.5"
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="h-4 w-4" /> Projects
        </Button>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground hidden sm:block">{user.fullName}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          className="text-muted-foreground hover:text-destructive"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </nav>

      <div className="flex-1 p-6 max-w-6xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold" data-testid="title-translate-document">Translate Document</h1>
              <Badge className="bg-[#6B21A8] text-white text-xs">Premium</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Upload a .txt or .docx file and translate it between Hindi, Marathi, and English.</p>
          </div>
        </div>

        {/* Upgrade wall */}
        {!canUseFeature && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="p-5 flex gap-4 items-start">
              <Zap className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm">Pro feature</p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  Document translation is available on Pro and Enterprise plans. Upgrade to access this feature.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setLocation("/upgrade")}
                className="bg-[#FF9933] hover:bg-[#e8881f] text-white border-0 flex-shrink-0"
                data-testid="button-upgrade-prompt"
              >
                Upgrade
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left panel — upload + controls */}
          <div className="lg:col-span-1 flex flex-col gap-4">

            {/* Upload zone */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Upload File
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    dragOver ? "border-[#FF9933] bg-orange-50 dark:bg-orange-950/20" :
                    file ? "border-green-400 bg-green-50 dark:bg-green-950/20" :
                    "border-muted-foreground/30 hover:border-muted-foreground/60"
                  } ${!canUseFeature ? "opacity-50 pointer-events-none" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="zone-file-upload"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.docx"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                    data-testid="input-file"
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div className="text-sm font-medium text-foreground truncate max-w-full px-2">{file.name}</div>
                      <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 mt-1"
                        data-testid="button-remove-file"
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileText className="h-8 w-8" />
                      <div className="text-sm">Drag & drop or click to browse</div>
                      <div className="text-xs">Supported: .txt (500 KB) · .docx (5 MB)</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Language pair */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Languages className="h-4 w-4" /> Language Pair
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Source (document language)</Label>
                  <Select value={sourceLang} onValueChange={setSourceLang} disabled={!canUseFeature}>
                    <SelectTrigger data-testid="select-source-lang">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGS.map(l => (
                        <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Target (translate into)</Label>
                  <Select value={targetLang} onValueChange={setTargetLang} disabled={!canUseFeature}>
                    <SelectTrigger data-testid="select-target-lang">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGS.filter(l => l.code !== sourceLang).map(l => (
                        <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {sourceLang === targetLang && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Source and target must differ
                  </p>
                )}

                <Button
                  onClick={() => translateMutation.mutate()}
                  disabled={!file || !canUseFeature || sourceLang === targetLang || isTranslating}
                  className="w-full bg-[#FF9933] hover:bg-[#e8881f] text-white border-0 mt-1"
                  data-testid="button-translate"
                >
                  {isTranslating ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Translating…</>
                  ) : (
                    "Translate Document"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Max {MAX_WORDS.toLocaleString()} words per document
                </p>
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Recent Translations</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {historyLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !history?.length ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No translations yet</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {history.map(h => (
                      <div
                        key={h.id}
                        onClick={() => setActiveHistory(activeHistory?.id === h.id ? null : h)}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-xs ${
                          activeHistory?.id === h.id ? "bg-muted" : "hover:bg-muted/50"
                        }`}
                        data-testid={`history-item-${h.id}`}
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-foreground">{h.filename}</div>
                          <div className="text-muted-foreground">
                            {LANG_NAME[h.sourceLanguageCode]} → {LANG_NAME[h.targetLanguageCode]} · {formatDate(h.createdAt)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(h.id); }}
                          className="text-muted-foreground hover:text-destructive flex-shrink-0"
                          data-testid={`button-delete-history-${h.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right panel — results */}
          <div className="lg:col-span-2">
            {isTranslating ? (
              <Card className="h-full min-h-[400px] flex items-center justify-center">
                <CardContent className="flex flex-col items-center gap-4 py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-[#FF9933]" />
                  <div className="text-center">
                    <p className="font-semibold">Translating your document…</p>
                    <p className="text-sm text-muted-foreground mt-1">This may take a moment for larger files</p>
                  </div>
                </CardContent>
              </Card>
            ) : displayed ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold">{displayed.filename}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {LANG_NAME[displayed.sourceLanguageCode]} → {LANG_NAME[displayed.targetLanguageCode]}
                        {displayed.wordCount ? ` · ${displayed.wordCount.toLocaleString()} words` : ""}
                        {" · "}{formatDate(displayed.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadFromServer(displayed.id, "original")}
                        className="gap-1.5 text-xs"
                        data-testid="button-download-original"
                      >
                        <Download className="h-3.5 w-3.5" /> Original (.{displayed.fileType})
                      </Button>
                      {displayed.translatedText && (
                        <Button
                          size="sm"
                          onClick={() => downloadFromServer(displayed.id, "translated")}
                          className="gap-1.5 text-xs bg-[#FF9933] hover:bg-[#e8881f] text-white border-0"
                          data-testid="button-download-translated"
                        >
                          <Download className="h-3.5 w-3.5" /> Translated (.{displayed.fileType})
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                        {LANG_NAME[displayed.sourceLanguageCode]} (Original)
                      </div>
                      <div
                        className="bg-muted/40 rounded-lg p-3 text-sm leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap font-sans"
                        data-testid="text-original"
                      >
                        {displayed.originalText}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FF9933] inline-block" />
                        {LANG_NAME[displayed.targetLanguageCode]} (Translated)
                      </div>
                      {displayed.translatedText ? (
                        <div
                          className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-lg p-3 text-sm leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap font-sans"
                          data-testid="text-translated"
                        >
                          {displayed.translatedText}
                        </div>
                      ) : (
                        <div className="bg-muted/40 rounded-lg p-3 text-sm text-muted-foreground flex items-center justify-center min-h-[100px]">
                          {displayed.status === "error" ? (
                            <span className="text-destructive">{displayed.errorMessage || "Translation failed"}</span>
                          ) : (
                            "No translation available"
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full min-h-[400px] flex items-center justify-center border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                  <Languages className="h-12 w-12 text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground">Upload a document and click Translate</p>
                  <p className="text-sm text-muted-foreground/70 max-w-xs">
                    The original and translated text will appear here side by side
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
