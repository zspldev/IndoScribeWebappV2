import LoadingSpinner from '../LoadingSpinner';

export default function LoadingSpinnerExample() {
  return (
    <div className="p-6 space-y-8">
      <LoadingSpinner message="Transcribing your audio..." />
      <LoadingSpinner message="Generating document..." />
      <LoadingSpinner />
    </div>
  );
}
