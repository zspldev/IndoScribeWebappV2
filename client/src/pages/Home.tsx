import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Header from '@/components/Header';
import LanguageSelector from '@/components/LanguageSelector';
import FileUploadZone from '@/components/FileUploadZone';
import FileInfo from '@/components/FileInfo';
import RichTextEditor from '@/components/RichTextEditor';
import AudioRecorder from '@/components/AudioRecorder';
import AudioPlayer from '@/components/AudioPlayer';
import InputMethodSelector from '@/components/InputMethodSelector';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatusMessage from '@/components/StatusMessage';
import WorkflowStepper from '@/components/WorkflowStepper';

type Language = {
  id: number;
  name: string;
  code: string;
  script: string;
};

type InputMethod = 'select' | 'record' | 'upload';
type WorkflowState = 'input' | 'uploading' | 'upload' | 'transcribing' | 'editing' | 'downloading' | 'success' | 'error';

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export default function Home() {
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [inputMethod, setInputMethod] = useState<InputMethod>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [fileDuration, setFileDuration] = useState<number | undefined>();
  const [transcriptionId, setTranscriptionId] = useState<number | null>(null);
  const [transcribedText, setTranscribedText] = useState("");
  const [editedText, setEditedText] = useState("");
  const [workflowState, setWorkflowState] = useState<WorkflowState>('input');
  const [errorMessage, setErrorMessage] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pendingSave, setPendingSave] = useState(false);

  // Refs
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const editedTextRef = useRef(editedText);
  const pendingSaveRef = useRef(pendingSave);
  const transcriptionIdRef = useRef(transcriptionId);

  // Keep refs in sync with state
  useEffect(() => {
    editedTextRef.current = editedText;
  }, [editedText]);
  
  useEffect(() => {
    pendingSaveRef.current = pendingSave;
  }, [pendingSave]);

  useEffect(() => {
    transcriptionIdRef.current = transcriptionId;
  }, [transcriptionId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Fetch languages
  const { data: languages = [] } = useQuery<Language[]>({
    queryKey: ['/api/languages'],
  });

  // Set default language when languages load
  useEffect(() => {
    if (languages.length > 0 && !selectedLanguage) {
      setSelectedLanguage(languages[0].id.toString());
    }
  }, [languages, selectedLanguage]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; languageId: number }) => {
      const formData = new FormData();
      formData.append('audio', data.file);
      formData.append('languageId', data.languageId.toString());

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setTranscriptionId(data.id);
      setFileDuration(data.duration);
      setWorkflowState('upload');
      setErrorMessage("");
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setWorkflowState('error');
    },
  });

  // Helper function to clear polling
  const clearPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  // Transcribe mutation
  const transcribeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/transcribe/${id}`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transcription failed');
      }
      return response.json();
    },
    onSuccess: async (data, id) => {
      clearPolling();
      console.log(`[Transcription] Started polling for transcription ID: ${id}`);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/transcriptions/${id}/status`);
          if (!statusResponse.ok) {
            console.error('[Transcription] Status check failed:', statusResponse.status);
            clearPolling();
            setErrorMessage('Failed to check transcription status');
            setWorkflowState('error');
            return;
          }

          const statusData = await statusResponse.json();
          console.log('[Transcription] Status update:', statusData.status);

          if (statusData.status === 'completed') {
            const transcribedText = statusData.transcribedText ?? '';
            console.log('[Transcription] Completed! Text length:', transcribedText.length);
            clearPolling();
            setTranscribedText(transcribedText);
            setEditedText(transcribedText);
            setWorkflowState('editing');
            startAutoSave();
          } else if (statusData.status === 'failed') {
            console.error('[Transcription] Failed');
            clearPolling();
            setErrorMessage('Transcription failed. Please try again.');
            setWorkflowState('error');
          }
        } catch (error) {
          console.error('[Transcription] Polling error:', error);
          clearPolling();
          setErrorMessage('Failed to check transcription status');
          setWorkflowState('error');
        }
      }, 3000);

      pollTimeoutRef.current = setTimeout(() => {
        console.error('[Transcription] Timed out after 15 minutes');
        clearPolling();
        setErrorMessage('Transcription timed out. Please try again.');
        setWorkflowState('error');
      }, 900000);
    },
    onError: (error: Error) => {
      console.error('[Transcription] Mutation error:', error);
      clearPolling();
      setErrorMessage(error.message || 'Transcription failed');
      setWorkflowState('error');
    },
  });

  // Update text mutation
  const updateTextMutation = useMutation({
    mutationFn: async ({ id, text }: { id: number; text: string }) => {
      const response = await fetch(`/api/transcriptions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ editedText: text }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to update text');
      return response.json();
    },
    onSuccess: () => {
      setLastSaved(new Date());
      setPendingSave(false);
    },
  });

  // Clear auto-save interval
  const stopAutoSave = useCallback(() => {
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }
  }, []);

  // Auto-save functionality using refs for latest values
  const startAutoSave = useCallback(() => {
    stopAutoSave();

    autoSaveIntervalRef.current = setInterval(() => {
      if (transcriptionIdRef.current && pendingSaveRef.current) {
        updateTextMutation.mutate({
          id: transcriptionIdRef.current,
          text: editedTextRef.current,
        });
      }
    }, AUTO_SAVE_INTERVAL);
  }, [stopAutoSave]);

  // Manual save
  const handleManualSave = useCallback(() => {
    if (transcriptionId) {
      updateTextMutation.mutate({
        id: transcriptionId,
        text: editedText,
      });
    }
  }, [transcriptionId, editedText]);

  // Handle input method selection
  const handleInputMethodSelect = (method: 'record' | 'upload') => {
    setInputMethod(method);
  };

  // Handle recording complete
  const handleRecordingComplete = (blob: Blob, duration: number) => {
    setRecordedBlob(blob);
    setRecordedDuration(duration);
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    
    // Create a File object from the blob
    const file = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
    setSelectedFile(file);
    setWorkflowState('uploading');
    setErrorMessage("");

    uploadMutation.mutate({
      file,
      languageId: parseInt(selectedLanguage),
    });
  };

  const handleFileSelect = (file: File) => {
    if (!selectedLanguage) {
      setErrorMessage("Please select a language first");
      setWorkflowState('error');
      return;
    }

    setSelectedFile(file);
    setWorkflowState('uploading');
    setErrorMessage("");

    uploadMutation.mutate({
      file,
      languageId: parseInt(selectedLanguage),
    });
  };

  const handleRemoveFile = useCallback(() => {
    // Stop auto-save first
    stopAutoSave();
    clearPolling();
    
    setSelectedFile(null);
    setRecordedBlob(null);
    setRecordedDuration(0);
    setTranscriptionId(null);
    setFileDuration(undefined);
    setWorkflowState('input');
    setInputMethod('select');
    setTranscribedText("");
    setEditedText("");
    setLastSaved(null);
    setPendingSave(false);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }, [stopAutoSave, audioUrl]);

  const handleStartTranscription = () => {
    if (!transcriptionId) return;
    
    setWorkflowState('transcribing');
    transcribeMutation.mutate(transcriptionId);
  };

  const handleTextChange = (text: string) => {
    setEditedText(text);
    setPendingSave(true);
  };

  const handleDownload = async () => {
    if (!transcriptionId) return;

    // Stop auto-save when starting download
    stopAutoSave();

    // Save before downloading
    if (pendingSave) {
      await updateTextMutation.mutateAsync({
        id: transcriptionId,
        text: editedText,
      });
    }

    setWorkflowState('downloading');

    try {
      // Download DOCX
      const docxResponse = await fetch(`/api/download/docx/${transcriptionId}`);
      if (!docxResponse.ok) throw new Error('Failed to download DOCX');
      
      const docxBlob = await docxResponse.blob();
      const docxUrl = window.URL.createObjectURL(docxBlob);
      const docxLink = document.createElement('a');
      docxLink.href = docxUrl;
      docxLink.download = docxResponse.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'transcription.docx';
      document.body.appendChild(docxLink);
      docxLink.click();
      document.body.removeChild(docxLink);
      window.URL.revokeObjectURL(docxUrl);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Download audio
      const audioResponse = await fetch(`/api/download/audio/${transcriptionId}`);
      if (!audioResponse.ok) throw new Error('Failed to download audio');
      
      const audioBlob = await audioResponse.blob();
      const audioDownloadUrl = window.URL.createObjectURL(audioBlob);
      const audioLink = document.createElement('a');
      audioLink.href = audioDownloadUrl;
      audioLink.download = audioResponse.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'audio.mp3';
      document.body.appendChild(audioLink);
      audioLink.click();
      document.body.removeChild(audioLink);
      window.URL.revokeObjectURL(audioDownloadUrl);

      setWorkflowState('success');
      
      setTimeout(() => {
        handleRemoveFile();
      }, 3000);
    } catch (error) {
      setErrorMessage((error as Error).message);
      setWorkflowState('error');
    }
  };

  const selectedLang = languages.find(l => l.id.toString() === selectedLanguage);
  const displayDuration = recordedDuration || fileDuration;

  // Calculate step statuses for the workflow stepper
  const steps = useMemo(() => {
    type StepStatus = 'pending' | 'current' | 'completed';
    
    const getStepStatus = (stepNum: number): StepStatus => {
      // Handle error state - show last reached step as current
      if (workflowState === 'error') {
        if (stepNum === 1) return selectedLanguage ? 'completed' : 'current';
        if (stepNum === 2) return selectedFile ? 'completed' : 'current';
        if (stepNum === 3) return transcribedText ? 'completed' : (selectedFile ? 'current' : 'pending');
        if (stepNum === 4) return 'pending';
        return 'pending';
      }
      
      // Step 1: Language - always completed once selected
      if (stepNum === 1) {
        return selectedLanguage ? 'completed' : 'current';
      }
      
      // Step 2: Audio Input
      if (stepNum === 2) {
        if (!selectedLanguage) return 'pending';
        if (workflowState === 'input') return 'current';
        if (workflowState === 'uploading') return 'current';
        return 'completed';
      }
      
      // Step 3: Transcription
      if (stepNum === 3) {
        if (workflowState === 'input' || workflowState === 'uploading') return 'pending';
        if (workflowState === 'upload') return 'current';
        if (workflowState === 'transcribing') return 'current';
        return 'completed';
      }
      
      // Step 4: Edit & Download
      if (stepNum === 4) {
        if (['input', 'uploading', 'upload', 'transcribing'].includes(workflowState)) return 'pending';
        if (workflowState === 'editing' || workflowState === 'downloading') return 'current';
        if (workflowState === 'success') return 'completed';
        return 'pending';
      }
      
      return 'pending';
    };
    
    return [
      { number: 1, title: 'Language', status: getStepStatus(1) },
      { number: 2, title: 'Audio', status: getStepStatus(2) },
      { number: 3, title: 'Transcribe', status: getStepStatus(3) },
      { number: 4, title: 'Edit & Export', status: getStepStatus(4) },
    ];
  }, [selectedLanguage, workflowState, selectedFile, transcribedText]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="bg-card border rounded-lg p-6 md:p-8 space-y-6">
          {/* Workflow Progress Stepper */}
          <WorkflowStepper steps={steps} />

          {/* Step 1: Language Selection - Always visible */}
          <div className="space-y-2">
            <LanguageSelector
              value={selectedLanguage}
              onChange={setSelectedLanguage}
              languages={languages}
              disabled={workflowState !== 'input'}
            />
          </div>

          {/* Step 2: Audio Input Section */}
          <div className="space-y-4">
            {/* Input Method Selection */}
            {workflowState === 'input' && inputMethod === 'select' && (
              <InputMethodSelector 
                onSelect={handleInputMethodSelect}
                disabled={!selectedLanguage}
              />
            )}

            {/* Recording UI */}
            {workflowState === 'input' && inputMethod === 'record' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-base font-medium">Record Audio</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInputMethod('select')}
                  >
                    Back
                  </Button>
                </div>
                <AudioRecorder
                  onRecordingComplete={handleRecordingComplete}
                  disabled={!selectedLanguage}
                  maxDurationMinutes={30}
                />
              </div>
            )}

            {/* File Upload UI */}
            {workflowState === 'input' && inputMethod === 'upload' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-base font-medium">Upload Audio File</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInputMethod('select')}
                  >
                    Back
                  </Button>
                </div>
                <FileUploadZone 
                  onFileSelect={handleFileSelect} 
                  disabled={!selectedLanguage}
                />
              </div>
            )}

            {/* Uploading State */}
            {workflowState === 'uploading' && (
              <LoadingSpinner message="Uploading audio file..." />
            )}

            {/* File Info - shown after upload until editing */}
            {selectedFile && ['upload', 'transcribing', 'editing', 'downloading'].includes(workflowState) && (
              <FileInfo
                filename={selectedFile.name}
                duration={displayDuration}
                onRemove={workflowState === 'upload' ? handleRemoveFile : undefined}
              />
            )}
          </div>

          {/* Step 3: Transcription Section */}
          {workflowState === 'upload' && (
            <div className="space-y-2">
              <label className="text-base font-medium">Transcribe Audio</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleStartTranscription}
                  data-testid="button-start-transcription"
                >
                  Start Transcription
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRemoveFile}
                  data-testid="button-cancel-upload"
                >
                  <XMarkIcon className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Transcribing State */}
          {workflowState === 'transcribing' && (
            <LoadingSpinner message="Transcribing your audio..." />
          )}

          {/* Step 4: Edit & Export Section */}
          {workflowState === 'editing' && selectedLang && (
            <div className="space-y-4">
              {/* Audio Player for playback during editing */}
              {transcriptionId && (
                <AudioPlayer
                  src={`/api/download/audio/${transcriptionId}`}
                  title={selectedFile?.name || 'Recording'}
                />
              )}

              <RichTextEditor
                value={editedText}
                onChange={handleTextChange}
                language={selectedLang.code}
                onSave={handleManualSave}
                lastSaved={lastSaved}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleDownload}
                  data-testid="button-download-docx"
                >
                  <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                  Download DOCX + Audio
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRemoveFile}
                  data-testid="button-cancel-edit"
                >
                  <XMarkIcon className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Downloading State */}
          {workflowState === 'downloading' && (
            <LoadingSpinner message="Generating documents..." />
          )}

          {/* Success Message */}
          {workflowState === 'success' && (
            <StatusMessage
              type="success"
              message="Document and audio file downloaded successfully!"
            />
          )}

          {/* Error Message */}
          {workflowState === 'error' && (
            <div className="space-y-4">
              <StatusMessage
                type="error"
                message={errorMessage}
              />
              <Button
                variant="outline"
                onClick={handleRemoveFile}
                data-testid="button-start-over"
              >
                Start Over
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
