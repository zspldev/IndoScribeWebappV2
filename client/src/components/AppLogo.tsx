interface AppLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
}

export default function AppLogo({ className = "", ...props }: AppLogoProps) {
  return (
    <span className={`font-bold tracking-tight leading-none select-none ${className}`} {...props}>
      <span style={{ color: "#FF9933" }}>Indo</span>
      <span style={{ color: "#6B21A8" }}>Scribe</span>
    </span>
  );
}
