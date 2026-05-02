import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Loader2, FileAudio, X, AlertTriangle, BookOpen, Search, ChevronRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import combinedLogo from "@/assets/images/ISP-Combined-Logo.png";
import HowItWorks from "@/components/HowItWorks";
import AudioRecorder from "@/components/AudioRecorder";

interface Language {
  id: number;
  name: string;
  code: string;
  script: string;
}

export default function NewProject() {
  const { user, refetchUser } = useAuth();
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [languageCode, setLanguageCode] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<"sending" | "processing" | "">("");

  const { data: languagesList } = useQuery<Language[]>({
    queryKey: ["/api/languages"],
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/projects", { title, languageCode });
      return res.json();
    },
    onSuccess: async (project: any) => {
      await refetchUser();
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (audioFile) {
        setIsUploading(true);
        setUploadProgress(0);
        setUploadPhase("sending");
        const formData = new FormData();
        formData.append("audio", audioFile);

        try {
          const result = await new Promise<{ success: boolean; error?: string }>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", `/api/projects/${project.id}/upload`);

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                setUploadProgress(percent);
                if (percent >= 100) {
                  setUploadPhase("processing");
                }
              }
            };

            xhr.onload = () => {
              try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve({ success: true });
                } else {
                  resolve({ success: false, error: data.error || "Upload failed" });
                }
              } catch {
                resolve({ success: false, error: "Upload failed" });
              }
            };

            xhr.onerror = () => reject(new Error("Network error during upload"));
            xhr.ontimeout = () => reject(new Error("Upload timed out. Please try again."));
            xhr.timeout = 600000; // 10 minutes
            xhr.send(formData);
          });

          if (!result.success) {
            setError(result.error || "Failed to upload audio");
            setIsUploading(false);
            setUploadPhase("");
            return;
          }
        } catch (err: any) {
          setError(err.message || "Failed to upload audio");
          setIsUploading(false);
          setUploadPhase("");
          return;
        }
        setIsUploading(false);
        setUploadPhase("");
      }
      setLocation(`/projects/${project.id}`);
    },
    onError: (err: any) => {
      setError(err.message || "Failed to create project");
    },
  });

  const validateAudioFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const maxSize = 25 * 1024 * 1024;
      if (file.size > maxSize) {
        reject(new Error("File size exceeds 25MB limit"));
        return;
      }
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        if (audio.duration && audio.duration > 1800) {
          reject(new Error("Audio file exceeds maximum duration of 30 minutes"));
        } else {
          resolve();
        }
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.src = url;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await validateAudioFile(file);
        setAudioFile(file);
        setError("");
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleRecordingComplete = (file: File) => {
    setAudioFile(file);
    setError("");
    if (!title) {
      setTitle("Voice Recording");
    }
  };

  const handleRemoveAudio = () => {
    setAudioFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Please enter a project title");
      return;
    }
    if (!languageCode) {
      setError("Please select a language");
      return;
    }
    if (!audioFile) {
      setError("Please upload an audio file or record audio before creating the project");
      return;
    }

    createProjectMutation.mutate();
  };

  const [showCommands, setShowCommands] = useState(false);

  if (!user) return null;

  const hasFeature = (key: string) => user.role === "admin" || (user.planFeatures ?? []).includes(key);
  const canUpload = hasFeature("audio_upload");
  const canRecord = hasFeature("live_recording");
  const canUseCommands = hasFeature("formatting_commands");

  const allowedLanguages = (languagesList ?? []).filter(l => l.isActive);

  const minutesUsed = parseFloat(user.totalMinutesTranscribed || "0");
  const totalMinutes = user.totalMinutes || 0;
  const minutesRemaining = Math.max(0, totalMinutes - minutesUsed);

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-new-project">
      <nav className="h-14 border-b flex items-center px-6 gap-4 bg-card">
        <img src={combinedLogo} alt="IndoScribe Pro" className="h-8" />
        <div className="flex items-center gap-2" data-testid="text-user-name">
          <span className="text-sm text-muted-foreground">{user.fullName}</span>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-xs text-muted-foreground" data-testid="text-plan-header">
            {user.planName} plan &middot; {minutesRemaining.toFixed(1)} min remaining
          </span>
        </div>
        <div className="flex-1" />
        <HowItWorks />
      </nav>

      <div className="flex-1 p-6 max-w-xl mx-auto w-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/dashboard")}
          className="mb-4"
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Dashboard
        </Button>

        <Card className="p-6" data-testid="card-new-project">
          <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-new-project-title">
            New Project
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md" data-testid="text-project-error">
                {error}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs">Project Title</Label>
              <Input
                id="title"
                placeholder="e.g. Meeting Notes Feb 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-project-title"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Language</Label>
              <Select value={languageCode} onValueChange={setLanguageCode}>
                <SelectTrigger data-testid="select-language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {allowedLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} data-testid={`option-lang-${lang.code}`}>
                      {lang.name} ({lang.script})
                    </SelectItem>
                  ))}
                  {allowedLanguages.length === 0 && (
                    <SelectItem value="none" disabled>No languages available on your plan</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Audio</Label>
              {!canUpload && !canRecord && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md" data-testid="text-no-audio-feature">
                  Audio input is not available on your current plan. Please upgrade to create projects.
                </p>
              )}
              {audioFile ? (
                <Card className="p-4" data-testid="card-selected-audio">
                  <div className="flex items-center gap-3">
                    <FileAudio className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" data-testid="text-audio-filename">{audioFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    {!isUploading && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={handleRemoveAudio}
                        data-testid="button-remove-audio"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {audioFile.size > 10 * 1024 * 1024 && !isUploading && (
                    <div className="flex items-center gap-2 mt-3 px-2 py-1.5 bg-amber-500/10 rounded-md" data-testid="text-large-file-warning">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        This is a large file. Uploading may take a few minutes.
                      </p>
                    </div>
                  )}
                  {isUploading && (
                    <div className="mt-3 space-y-1.5" data-testid="upload-progress">
                      <Progress value={uploadPhase === "processing" ? 100 : uploadProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center" data-testid="text-upload-status">
                        {uploadPhase === "processing"
                          ? "Processing audio... This may take a moment for larger files."
                          : `Uploading... ${uploadProgress}%`}
                      </p>
                    </div>
                  )}
                </Card>
              ) : (
                <div className={`grid gap-3 ${canUpload && canRecord ? "grid-cols-2" : "grid-cols-1"}`} data-testid="audio-options">
                  {canUpload && (
                    <div
                      className="border-2 border-dashed rounded-md p-5 text-center cursor-pointer hover-elevate"
                      onClick={() => document.getElementById("audioInput")?.click()}
                      data-testid="dropzone-audio"
                    >
                      <svg className="h-6 w-6 text-muted-foreground mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <p className="text-xs font-medium">Upload File</p>
                      <p className="text-xs text-muted-foreground mt-0.5">MP3, WAV, M4A, WebM</p>
                      <p className="text-xs text-muted-foreground">Max 25MB, 30 min</p>
                      <input
                        id="audioInput"
                        type="file"
                        accept=".mp3,.wav,.m4a,.webm,.ogg,audio/*"
                        className="hidden"
                        onChange={handleFileChange}
                        data-testid="input-audio-file"
                      />
                    </div>
                  )}
                  {canRecord && (
                    <AudioRecorder
                      onRecordingComplete={handleRecordingComplete}
                      isUploading={false}
                      maxDurationMinutes={30}
                    />
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[hsl(30,100%,50%)] border-[hsl(30,100%,42%)] text-white"
              disabled={createProjectMutation.isPending || isUploading}
              data-testid="button-create-project"
            >
              {createProjectMutation.isPending || isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  {isUploading ? "Uploading audio..." : "Creating..."}
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </form>
        </Card>

        {canUseCommands && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={() => setShowCommands(!showCommands)}
            data-testid="button-voice-commands-guide"
          >
            <BookOpen className="h-4 w-4 mr-1.5" />
            {showCommands ? "Hide Voice Commands Guide" : "Voice Commands Guide"}
          </Button>
        )}

        {showCommands && (
          <VoiceCommandsGuide languageCode={languageCode} />
        )}
      </div>
    </div>
  );
}

interface VoiceCommand {
  id: string;
  phrase: string;
  replacement: string;
  language: string;
  description?: string;
}

const categoryOrder = ["Formatting", "Punctuation", "Structure", "Other"];

function categorizeCommand(cmd: VoiceCommand): string {
  const phrase = cmd.phrase.toLowerCase();
  const replacement = cmd.replacement;

  if (replacement.includes("--- PAGE BREAK ---") || replacement.includes("\n") || replacement.includes("\t")) {
    return "Formatting";
  }
  if (replacement.includes("# ") || replacement.includes("**") || replacement.includes("- ")) {
    return "Structure";
  }
  if (/^[.,;:!?"""''()—–\-\/\\@#&]$/.test(replacement.trim()) || phrase.includes("mark") || phrase.includes("stop") || phrase.includes("comma") || phrase.includes("colon") || phrase.includes("semicolon") || phrase.includes("dash") || phrase.includes("quote") || phrase.includes("bracket") || phrase.includes("slash")) {
    return "Punctuation";
  }
  return "Other";
}

function displayReplacement(r: string): string {
  if (r.includes("--- PAGE BREAK ---")) return "Page break";
  if (r === "\n\n") return "New paragraph";
  if (r === "\n") return "New line";
  if (r === "\t") return "Tab";
  if (r.startsWith("# ")) return "Heading 1";
  if (r.startsWith("## ")) return "Heading 2";
  if (r.startsWith("### ")) return "Heading 3";
  if (r.startsWith("**") && r.endsWith("**")) return "Bold text";
  if (r.startsWith("*") && r.endsWith("*")) return "Italic text";
  if (r.startsWith("- ")) return "Bullet point";
  if (r.trim().length <= 3) return `Inserts: ${r.trim()}`;
  return r.replace(/\n/g, " ").trim();
}

function VoiceCommandsGuide({ languageCode }: { languageCode: string }) {
  const [search, setSearch] = useState("");

  const { data: commands, isLoading } = useQuery<VoiceCommand[]>({
    queryKey: ["/api/commands/active", languageCode || "all"],
    queryFn: async () => {
      const url = languageCode
        ? `/api/commands/active?language=${languageCode}`
        : "/api/commands/active";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6 mt-3 text-center" data-testid="card-voice-commands-loading">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </Card>
    );
  }

  const filtered = (commands || []).filter((cmd) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return cmd.phrase.toLowerCase().includes(q) || (cmd.description || "").toLowerCase().includes(q);
  });

  const grouped: Record<string, VoiceCommand[]> = {};
  for (const cmd of filtered) {
    const cat = categorizeCommand(cmd);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(cmd);
  }

  const sortedCategories = categoryOrder.filter((c) => grouped[c]?.length);

  const langLabel: Record<string, string> = { en: "English", hi: "Hindi", mr: "Marathi" };

  return (
    <Card className="p-4 mt-3" data-testid="card-voice-commands-guide">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <h3 className="text-sm font-semibold flex-1">
          Voice Commands Guide
          {languageCode && <span className="text-muted-foreground font-normal ml-1">({langLabel[languageCode] || languageCode})</span>}
        </h3>
        <span className="text-xs text-muted-foreground" data-testid="text-commands-total">{filtered.length} commands</span>
      </div>

      {!languageCode && (
        <p className="text-xs text-muted-foreground mb-3 bg-muted/50 px-3 py-2 rounded-md" data-testid="text-select-lang-hint">
          Select a language above to see commands specific to that language.
        </p>
      )}

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search commands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-8 text-xs"
          data-testid="input-search-voice-commands"
        />
      </div>

      <p className="text-xs text-muted-foreground mb-3" data-testid="text-voice-commands-tip">
        Say these phrases while recording and they will be automatically formatted in your transcription.
      </p>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto" data-testid="list-voice-commands">
        {sortedCategories.map((cat) => (
          <div key={cat}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5" data-testid={`text-category-${cat.toLowerCase()}`}>{cat}</p>
            <div className="space-y-0.5">
              {grouped[cat].map((cmd) => (
                <div
                  key={cmd.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md bg-muted/40"
                  data-testid={`voice-cmd-${cmd.id}`}
                >
                  <Badge variant="secondary" className="text-[10px] w-8 justify-center flex-shrink-0 no-default-hover-elevate no-default-active-elevate">
                    {cmd.language}
                  </Badge>
                  <span className="font-medium min-w-[100px]" data-testid={`text-say-${cmd.id}`}>
                    "{cmd.phrase}"
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground flex-1" data-testid={`text-result-${cmd.id}`}>
                    {displayReplacement(cmd.replacement)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4" data-testid="text-no-voice-commands">No commands found.</p>
        )}
      </div>
    </Card>
  );
}
