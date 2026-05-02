import { useState } from 'react';
import LanguageSelector from '../LanguageSelector';

export default function LanguageSelectorExample() {
  const [selectedLanguage, setSelectedLanguage] = useState("1");
  
  const mockLanguages = [
    { id: 1, name: "English", code: "en-US" },
    { id: 2, name: "Hindi", code: "hi-IN" },
    { id: 3, name: "Marathi", code: "mr-IN" },
  ];

  return (
    <div className="p-6">
      <LanguageSelector 
        value={selectedLanguage}
        onChange={setSelectedLanguage}
        languages={mockLanguages}
      />
    </div>
  );
}
