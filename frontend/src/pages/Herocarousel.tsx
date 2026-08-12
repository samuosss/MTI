import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";

interface HeroSlide {
  id: number;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  link_url: string | null;
}

const FALLBACK: HeroSlide[] = [
  { id: -1, image_url: "", sort_order: 0, is_active: true, link_url: null },
];

async function fetchSlides(): Promise<HeroSlide[]> {
  const res = await fetch("/api/hero-slides");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

function resolveUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `/uploads/${url.replace(/^\/+/, "")}`;
}

export default function HeroCarousel() {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSlides()
      .then((data) => {
        const active = data
          .filter((s) => s.is_active)
          .sort((a, b) => a.sort_order - b.sort_order);
        setSlides(active.length > 0 ? active : FALLBACK);
      })
      .catch(() => setSlides(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  const prev = useCallback(
    () => setCurrent((c) => (c === 0 ? slides.length - 1 : c - 1)),
    [slides.length]
  );
  const next = useCallback(
    () => setCurrent((c) => (c === slides.length - 1 ? 0 : c + 1)),
    [slides.length]
  );

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(next, 4500);
    return () => clearInterval(id);
  }, [slides.length, next]);

  if (loading) return <div className="w-full h-64 bg-secondary animate-pulse" />;

  const hasRealSlides = slides[0]?.id !== -1;
  const activeSlide = slides[current];

  function handleClick() {
    alert("clicked! slide index: " + current + " | link: " + activeSlide?.link_url);
    if (activeSlide?.link_url) {
      navigate(activeSlide.link_url);
    }
  }

  return (
    <div
      className="relative w-full h-64 sm:h-72 overflow-hidden bg-secondary select-none"
      style={{ cursor: activeSlide?.link_url ? "pointer" : "default" }}
      onClick={handleClick}
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
        >
          {s.image_url ? (
            <img
              src={resolveUrl(s.image_url)}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-secondary to-accent/10 flex items-center justify-center">
              <span className="text-muted-foreground text-sm font-medium">
                No banner images yet — add some from the admin panel
              </span>
            </div>
          )}
        </div>
      ))}

      {hasRealSlides && slides.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors"
            aria-label="Next"
          >
            <ChevronRight size={16} />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`rounded-full transition-all ${
                  i === current ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}