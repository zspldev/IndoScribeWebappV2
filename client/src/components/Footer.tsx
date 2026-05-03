import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mail, Globe, Info } from "lucide-react";
import about from "@/config/about.json";

export default function Footer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <footer className="border-t py-3 flex items-center justify-center gap-3" data-testid="footer">
        <span className="text-xs text-muted-foreground" data-testid="text-copyright">
          &copy; {about.legal.copyrightYear}, {about.company.name}
        </span>
        <span className="text-muted-foreground/40 text-xs">·</span>
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          data-testid="button-about"
        >
          <Info className="h-3 w-3" />
          About
        </button>
      </footer>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-about">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {about.appName}
              <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {about.stage}
              </span>
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground -mt-1">{about.tagline}</p>

          <div className="divide-y text-sm">
            <Row label="Version" value={`v${about.version}`} />
            <Row label="Release Date" value={new Date(about.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
            <Row label="Platform" value={about.platform} />
            <Row label="Languages" value={about.languages.join(", ")} />

            <div className="py-3 flex justify-between items-center">
              <span className="text-muted-foreground">Company</span>
              <a
                href={about.company.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline font-medium"
                data-testid="link-company-url"
              >
                <Globe className="h-3.5 w-3.5" />
                {about.company.name}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>

            <div className="py-3 flex justify-between items-center">
              <span className="text-muted-foreground">Support</span>
              <a
                href={`mailto:${about.support.email}`}
                className="flex items-center gap-1 text-primary hover:underline font-medium"
                data-testid="link-support-email"
              >
                <Mail className="h-3.5 w-3.5" />
                {about.support.email}
              </a>
            </div>

            <Row label="Support Hours" value={about.support.hours} />

            <div className="py-3 flex justify-between items-center">
              <span className="text-muted-foreground">Privacy & EULA</span>
              <a
                href={about.legal.privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline font-medium"
                data-testid="link-privacy-about"
              >
                View Document
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>
          </div>

          <div className="pt-1 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} data-testid="button-close-about">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 flex justify-between items-center gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
