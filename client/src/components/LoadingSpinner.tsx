interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = "Processing..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12" data-testid="loading-spinner">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
