import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { signImage } from "@/lib/farms";

export function FarmImage({
  path,
  alt = "",
  className = "",
}: {
  path?: string | null;
  alt?: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!path) return;
    signImage(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);

  if (!path || !url) {
    return (
      <div className={`grid place-items-center bg-muted text-muted-foreground ${className}`}>
        <ImageIcon className="h-6 w-6" />
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
