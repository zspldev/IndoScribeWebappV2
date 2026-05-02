import { useState } from 'react';
import TranscriptionEditor from '../TranscriptionEditor';

export default function TranscriptionEditorExample() {
  const [englishText, setEnglishText] = useState(
    "This is a sample transcription in English. You can edit this text to fix any transcription errors."
  );
  
  const [hindiText, setHindiText] = useState(
    "यह हिंदी में एक नमूना प्रतिलेखन है। आप किसी भी प्रतिलेखन त्रुटि को ठीक करने के लिए इस पाठ को संपादित कर सकते हैं।"
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-2">English</h3>
        <TranscriptionEditor 
          value={englishText}
          onChange={setEnglishText}
          language="en-US"
        />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Hindi (Devanagari)</h3>
        <TranscriptionEditor 
          value={hindiText}
          onChange={setHindiText}
          language="hi-IN"
        />
      </div>
    </div>
  );
}
