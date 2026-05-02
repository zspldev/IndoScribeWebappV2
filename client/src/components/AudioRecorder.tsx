import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Square, Pause, Play, Loader2, Trash2, Check } from "lucide-react";

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  isUploading: boolean;
  maxDurationMinutes?: number;
}

type RecordingState = "idle" | "recording" | "paused" | "stopped";

export default function AudioRecorder({
  onRecordingComplete,
  isUploading,
  maxDurationMinutes = 30,
}: AudioRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingStateRef = useRef<RecordingState>("idle");

  const maxDurationSeconds = maxDurationMinutes * 60;

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [cleanup]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current && recordingStateRef.current === "recording") {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average / 255);
      animationRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      (mediaRecorderRef.current.state === "recording" || mediaRecorderRef.current.state === "paused")
    ) {
      mediaRecorderRef.current.stop();
      setRecordingState("stopped");
      recordingStateRef.current = "stopped";

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      setAudioLevel(0);
    }
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start(1000);
      setRecordingState("recording");
      recordingStateRef.current = "recording";
      setElapsedTime(0);

      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDurationSeconds) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

      animationRef.current = requestAnimationFrame(updateAudioLevel);
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone access was denied. Please allow microphone access in your browser settings.");
      } else if (err.name === "NotFoundError") {
        setError("No microphone found. Please connect a microphone and try again.");
      } else {
        setError("Could not start recording: " + (err.message || "Unknown error"));
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.pause();
      setRecordingState("paused");
      recordingStateRef.current = "paused";
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setAudioLevel(0);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === "paused") {
      mediaRecorderRef.current.resume();
      setRecordingState("recording");
      recordingStateRef.current = "recording";

      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDurationSeconds) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

      animationRef.current = requestAnimationFrame(updateAudioLevel);
    }
  };

  const confirmRecording = () => {
    if (recordedBlob) {
      const rawMime = recordedBlob.type;
      const baseMime = rawMime.split(";")[0].trim();
      const ext = baseMime.includes("webm") ? "webm" : baseMime.includes("ogg") ? "ogg" : "m4a";
      const file = new File([recordedBlob], `recording-${Date.now()}.${ext}`, {
        type: baseMime,
      });
      onRecordingComplete(file);
    }
  };

  const discardRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    cleanup();
    setRecordedBlob(null);
    setAudioUrl(null);
    setElapsedTime(0);
    setRecordingState("idle");
    recordingStateRef.current = "idle";
    setAudioLevel(0);
  };

  const remainingTime = maxDurationSeconds - elapsedTime;
  const progressPercent = (elapsedTime / maxDurationSeconds) * 100;
  const isNearLimit = remainingTime <= 60 && remainingTime > 0;

  if (isUploading) {
    return (
      <Card className="p-4 text-center" data-testid="card-recording-uploading">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Uploading recording...</p>
      </Card>
    );
  }

  if (recordingState === "idle") {
    return (
      <div
        className="border-2 border-dashed rounded-md p-5 text-center cursor-pointer hover-elevate h-full flex flex-col items-center justify-center"
        onClick={startRecording}
        data-testid="button-start-recording"
      >
        <Mic className="h-6 w-6 text-red-500 mb-2" />
        <p className="text-xs font-medium">Record Audio</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Up to {maxDurationMinutes} min
        </p>
        {error && (
          <p className="text-xs text-destructive mt-1" data-testid="text-recording-error">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (recordingState === "recording" || recordingState === "paused") {
    return (
      <Card className="p-3 space-y-3" data-testid="card-recording-active">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              recordingState === "recording" ? "bg-red-500 animate-pulse" : "bg-yellow-500"
            }`}
            data-testid="indicator-recording-state"
          />
          <span className="text-xs font-medium" data-testid="text-recording-state">
            {recordingState === "recording" ? "Recording" : "Paused"}
          </span>
        </div>

        <div className="text-center">
          <p
            className={`text-2xl font-mono font-semibold tabular-nums ${isNearLimit ? "text-red-500" : ""}`}
            data-testid="text-recording-timer"
          >
            {formatTime(elapsedTime)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Max {formatTime(maxDurationSeconds)}</p>
        </div>

        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${isNearLimit ? "bg-red-500" : "bg-[hsl(30,100%,50%)]"}`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
            data-testid="progress-recording"
          />
        </div>

        {recordingState === "recording" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Level</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-100"
                style={{ width: `${audioLevel * 100}%` }}
                data-testid="level-meter"
              />
            </div>
          </div>
        )}

        {isNearLimit && (
          <p className="text-xs text-red-500 text-center" data-testid="text-time-warning">
            {remainingTime > 0 ? `${remainingTime}s remaining` : "Time limit reached"}
          </p>
        )}

        <div className="flex gap-2 justify-center">
          {recordingState === "recording" ? (
            <Button size="sm" variant="outline" onClick={pauseRecording} data-testid="button-pause-recording">
              <Pause className="h-3.5 w-3.5 mr-1" />
              Pause
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={resumeRecording} data-testid="button-resume-recording">
              <Play className="h-3.5 w-3.5 mr-1" />
              Resume
            </Button>
          )}
          <Button
            size="sm"
            className="bg-red-600 border-red-700 text-white"
            onClick={stopRecording}
            data-testid="button-stop-recording"
          >
            <Square className="h-3.5 w-3.5 mr-1" />
            Stop
          </Button>
        </div>
      </Card>
    );
  }

  if (recordingState === "stopped" && recordedBlob && audioUrl) {
    return (
      <Card className="p-3 space-y-3" data-testid="card-recording-preview">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Recording Complete</span>
          <span className="text-xs text-muted-foreground">{formatTime(elapsedTime)}</span>
        </div>

        <audio controls src={audioUrl} className="w-full h-8" data-testid="audio-preview" />

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={discardRecording} data-testid="button-discard-recording">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Discard
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-[hsl(30,100%,50%)] border-[hsl(30,100%,42%)] text-white"
            onClick={confirmRecording}
            data-testid="button-use-recording"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Use Recording
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}
