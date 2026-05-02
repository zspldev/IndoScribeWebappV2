import { useQuery } from "@tanstack/react-query";

interface Language {
  id: number;
  name: string;
  code: string;
  script: string;
  isActive: boolean;
}

export function useLanguages() {
  const { data: languages } = useQuery<Language[]>({
    queryKey: ["/api/languages"],
  });

  const getLanguageName = (code: string): string => {
    if (!languages) return code;
    const lang = languages.find((l) => l.code === code);
    return lang ? lang.name : code;
  };

  const getLanguageScript = (code: string): string => {
    if (!languages) return "Latin";
    const lang = languages.find((l) => l.code === code);
    return lang ? lang.script : "Latin";
  };

  return { languages, getLanguageName, getLanguageScript };
}
