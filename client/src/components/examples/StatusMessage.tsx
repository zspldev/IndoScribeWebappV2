import StatusMessage from '../StatusMessage';

export default function StatusMessageExample() {
  return (
    <div className="p-6 space-y-4">
      <StatusMessage 
        type="success"
        message="Document downloaded successfully!"
      />
      <StatusMessage 
        type="error"
        message="File upload failed. Please ensure the file is in MP3 format and does not exceed 10 minutes."
      />
    </div>
  );
}
