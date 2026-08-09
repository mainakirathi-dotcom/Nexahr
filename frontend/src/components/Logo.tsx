import { useId } from "react";

export default function Logo({ size = 36 }: { size?: number }) {
  const gradId = useId();

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="NexaHR logo">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      {/* Outer hexagon structure line */}
      <polygon points="100,10 180,55 180,145 100,190 20,145 20,55" fill="none" stroke="#52525b" strokeWidth="3" />
      {/* Inner hexagon accent line */}
      <polygon points="100,18 172,58 172,142 100,182 28,142 28,58" fill="none" stroke={`url(#${gradId})`} strokeWidth="1.5" opacity="0.6" />
      {/* H */}
      <path d="M55 60 L55 140 M55 100 L105 100 M105 60 L105 140" stroke={`url(#${gradId})`} strokeWidth="10" strokeLinecap="round" fill="none" />
      {/* R */}
      <path d="M125 60 L125 140 M125 60 Q165 60 165 90 Q165 120 125 120 M140 120 L165 140" stroke="#e5e5e5" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.9" />
    </svg>
  );
}
