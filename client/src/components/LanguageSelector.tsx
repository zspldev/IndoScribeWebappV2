import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  languages: Array<{ id: number; name: string; code: string }>;
  disabled?: boolean;
}

export default function LanguageSelector({ value, onChange, languages, disabled }: LanguageSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="language-select" className="text-base font-medium">
        Select Language
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger 
          id="language-select" 
          className="w-full md:w-64 h-11"
          data-testid="select-language"
        >
          <SelectValue placeholder="Choose a language" />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.id} value={lang.id.toString()} data-testid={`option-language-${lang.code}`}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
