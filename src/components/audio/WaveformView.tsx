interface WaveformViewProps {
  containerRef: React.RefObject<HTMLDivElement>;
  isReady: boolean;
}

export function WaveformView({ containerRef, isReady }: WaveformViewProps) {
  return (
    <div className="relative">
      <div ref={containerRef} className="w-full" />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 text-ink-dim text-xs readout">
            <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
            DECODING WAVEFORM
          </div>
        </div>
      )}
    </div>
  );
}
