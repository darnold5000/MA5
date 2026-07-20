type SaunaVideoProps = {
  embedUrl: string;
  title: string;
};

export function SaunaVideo({ embedUrl, title }: SaunaVideoProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden">
      <iframe
        src={embedUrl}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="absolute top-1/2 left-1/2 border-0"
        style={{
          width: "178%",
          height: "178%",
          transform: "translate(-50%, -50%) rotate(-90deg) scale(1.45)",
        }}
      />
    </div>
  );
}
