import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";

const steps = [
  "Register as a new user or sign in using your current username/email and password.",
  "On My Projects page, click on New Project button.",
  "Enter the project name and language. At present, this app supports Hindi, Marathi and English languages.",
  "You can either upload an audio file (Make sure your file is in acceptable formats) or record a live audio up to 30 minutes.",
  "Click on Create Project. If the audio file is larger than 10 MB, it will take more time to upload.",
  "Once the file is uploaded, you will land on the editor screen. On the left side panel, you can see the name of the audio file and a Play/Pause button to listen to the audio.",
  "Click on Start Transcription button to transcribe the audio into an appropriate script associated with the selected language.",
  'The Transcribed text appears in the editor window and toolbar is available for editing. Next to the Search button (a lens icon), a phonetic typing toggle button is shown. If it shows the English character, the phonetic typing is off. To add more text or fix text in Devanagari, toggle the button by clicking on it. When phonetic typing is on, you can type Marathi or Hindi words with their Latin spelling and then press space. It will convert the Latin characters in Devanagari characters.',
  "The edited text gets auto-saved every 30 seconds.",
  "You can translate the transcribed text by clicking on appropriate language button on the left panel. The translated text will appear in a separate editor window on the right side of the screen. If you want, you can make changes to the original text and translate it again by clicking on two-circular-arrows icon.",
  "Once you are done with editing, the transcribed and translated text can be exported in MS-Word file (.docx) format. You can download only the transcribed text, or only the translated text in separate files, or both transcribed and translated text in a single file.",
  "Once the project is created by uploading an audio, the transcription, editing and download steps can be done later whenever you want. After you finish your free quota for project, you can still work on existing projects.",
];

const contactEmail = "operations@zapurzaasystems.com";

export default function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="button-how-it-works"
      >
        <HelpCircle className="h-4 w-4 mr-1.5" />
        How it works
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto" data-testid="dialog-how-it-works">
          <DialogHeader>
            <DialogTitle data-testid="text-how-it-works-title">IndoScribe: How it works</DialogTitle>
          </DialogHeader>

          <ol className="space-y-3 list-none">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed" data-testid={`step-${i + 1}`}>
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[hsl(30,100%,50%)] text-white text-xs flex items-center justify-center font-semibold">
                  {i + 1}
                </span>
                <span className="text-muted-foreground pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          <div className="border-t pt-3 mt-2">
            <p className="text-xs text-muted-foreground">
              For any questions, comments or help, send an email to{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="text-[hsl(270,61%,40%)] underline"
                data-testid="link-help-email"
              >
                {contactEmail}
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
