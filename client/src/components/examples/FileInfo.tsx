import FileInfo from '../FileInfo';

export default function FileInfoExample() {
  return (
    <div className="p-6 space-y-4">
      <FileInfo 
        filename="my-audio-recording.mp3"
        duration={125}
        onRemove={() => console.log('Remove clicked')}
      />
      <FileInfo 
        filename="very-long-filename-that-should-be-truncated-properly.mp3"
        duration={540}
      />
    </div>
  );
}
