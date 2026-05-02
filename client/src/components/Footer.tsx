import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Footer() {
  return (
    <footer className="border-t py-3 text-center" data-testid="footer">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-muted-foreground cursor-default" data-testid="text-copyright">
            &copy; 2026, Zapurzaa Systems
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">IndoScribe Pro Beta v. 0.1 by Zapurzaa Systems</p>
        </TooltipContent>
      </Tooltip>
    </footer>
  );
}
