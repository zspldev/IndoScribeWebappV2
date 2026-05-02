import { SpeechClient } from '@google-cloud/speech';

async function checkOperation() {
  const client = new SpeechClient();
  const operationName = '7911938334670953351';
  
  try {
    const operation = await client.checkLongRunningRecognizeProgress(operationName);
    console.log('Operation status:', JSON.stringify({
      done: operation.done,
      hasError: !!operation.error,
      error: operation.error,
      hasResult: !!operation.result
    }, null, 2));
    
    if (operation.done && operation.result) {
      const response = operation.result as any;
      const text = response.results
        ?.map((result: any) => result.alternatives?.[0]?.transcript || '')
        .join(' ')
        .trim() || '';
      console.log('\n--- TRANSCRIBED TEXT ---');
      console.log(text);
      console.log('--- END OF TEXT ---');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkOperation();
