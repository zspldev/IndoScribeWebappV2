import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface StatusMessageProps {
  type: 'success' | 'error';
  message: string;
}

export default function StatusMessage({ type, message }: StatusMessageProps) {
  const isSuccess = type === 'success';
  
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border-l-4 ${
        isSuccess
          ? 'bg-green-50 border-green-500 text-green-800'
          : 'bg-red-50 border-red-500 text-red-800'
      }`}
      data-testid={`status-${type}`}
    >
      {isSuccess ? (
        <CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      ) : (
        <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      )}
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
