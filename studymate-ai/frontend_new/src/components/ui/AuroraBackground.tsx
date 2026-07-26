// components/ui/AuroraBackground.tsx
// Pure CSS aurora gradient — no Three.js, < 5 KB, 60 FPS
// Inspired by Linear, Vercel, and Apple WWDC aesthetics.

export default function AuroraBackground() {
  return (
    <div className="aurora-root" aria-hidden="true">
      {/* Base gradient — deep navy → black */}
      <div className="aurora-base" />
      {/* Slow-moving soft blobs */}
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      {/* Very subtle noise/grain overlay for depth */}
      <div className="aurora-grain" />
    </div>
  );
}
