import { useState, useCallback, useEffect } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useListGalleryImages } from "@workspace/api-client-react";
import { X, ZoomIn, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const CATEGORIES = [
  { id: "all", label: "All Projects" },
  { id: "studio-1st", label: "1st Year Studio" },
  { id: "studio-2nd", label: "2nd Year Studio" },
  { id: "studio-3rd", label: "3rd Year Studio" },
  { id: "thesis", label: "Thesis" },
  { id: "models", label: "Physical Models" },
  { id: "drawings", label: "Drawings & Sketches" },
];

const MOCK_GALLERY = [
  { id: 1, title: "Urban Intervention", category: "studio-3rd", imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80", additionalImages: [], author: "Sarah Chen", description: "" },
  { id: 2, title: "Section Detail", category: "drawings", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80", additionalImages: [], author: "Marcus Kim", description: "" },
  { id: 3, title: "Pavilion Model", category: "models", imageUrl: "https://images.unsplash.com/photo-1541888009130-9759d5b0a316?w=800&q=80", additionalImages: [], author: "Elena R.", description: "" },
  { id: 4, title: "Concrete Formwork", category: "studio-2nd", imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80", additionalImages: [], author: "Alex T.", description: "" },
  { id: 5, title: "Light Study", category: "studio-1st", imageUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80", additionalImages: [], author: "Jessica W.", description: "" },
  { id: 6, title: "Library Thesis", category: "thesis", imageUrl: "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=800&q=80", additionalImages: [], author: "David P.", description: "" },
];

function getImages(item: any): string[] {
  const extras = (item.additionalImages as string[] | null)?.filter(Boolean) ?? [];
  return [item.imageUrl, ...extras];
}

export default function Gallery() {
  const [filter, setFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  const { data: galleryData, isLoading } = useListGalleryImages();
  const images = galleryData?.length ? galleryData : MOCK_GALLERY;

  const filteredImages = filter === "all"
    ? images
    : images.filter((img: any) => img.category === filter);

  const openLightbox = (item: any) => {
    setSelectedItem(item);
    setSlideIndex(0);
  };

  const closeLightbox = () => setSelectedItem(null);

  const slides = selectedItem ? getImages(selectedItem) : [];
  const totalSlides = slides.length;

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideIndex((i) => (i - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideIndex((i) => (i + 1) % totalSlides);
  }, [totalSlides]);

  useEffect(() => {
    if (!selectedItem) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") setSlideIndex((i) => (i - 1 + totalSlides) % totalSlides);
      if (e.key === "ArrowRight") setSlideIndex((i) => (i + 1) % totalSlides);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedItem, totalSlides]);

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <SectionHeader title="Student Portfolio" subtitle="Gallery" centered />

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
                filter === cat.id
                  ? "bg-foreground text-background"
                  : "bg-secondary text-secondary-foreground hover:bg-border"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Masonry Grid */}
        {isLoading ? (
          <div className="columns-1 sm:columns-2 md:columns-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-muted animate-pulse mb-6" style={{ height: `${Math.random() * 200 + 200}px` }} />
            ))}
          </div>
        ) : (
          <motion.div layout className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
            <AnimatePresence>
              {filteredImages?.map((img: any) => {
                const extraCount = (img.additionalImages as string[] | null)?.filter(Boolean).length ?? 0;
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    key={img.id}
                    className="break-inside-avoid relative group cursor-pointer overflow-hidden"
                    onClick={() => openLightbox(img)}
                  >
                    <img
                      src={img.imageUrl}
                      alt={img.title}
                      className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {extraCount > 0 && (
                      <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 flex items-center gap-1 rounded">
                        <Images className="w-3 h-3" />
                        {1 + extraCount} photos
                      </div>
                    )}
                    <div className="absolute inset-0 bg-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-6 text-center text-background">
                      <ZoomIn className="mb-4 text-primary w-8 h-8" />
                      <h3 className="font-display font-bold text-xl mb-1">{img.title}</h3>
                      <p className="text-sm opacity-80">{img.author}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
            onClick={closeLightbox}
          >
            {/* Close */}
            <button
              className="absolute top-6 right-6 p-2 text-foreground bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors z-10"
              onClick={closeLightbox}
            >
              <X size={24} />
            </button>

            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-w-5xl w-full max-h-[85vh] relative flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image area */}
              <div className="relative bg-secondary/50 flex items-center justify-center overflow-hidden" style={{ maxHeight: "75vh" }}>
                <AnimatePresence mode="wait">
                  <motion.img
                    key={slideIndex}
                    src={slides[slideIndex]}
                    alt={`${selectedItem.title} — photo ${slideIndex + 1}`}
                    className="w-full h-auto max-h-[75vh] object-contain"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.25 }}
                  />
                </AnimatePresence>

                {/* Prev / Next arrows — only when multiple images */}
                {totalSlides > 1 && (
                  <>
                    <button
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 hover:bg-background text-foreground flex items-center justify-center transition-colors"
                      onClick={prev}
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 hover:bg-background text-foreground flex items-center justify-center transition-colors"
                      onClick={next}
                    >
                      <ChevronRight size={22} />
                    </button>
                  </>
                )}
              </div>

              {/* Info bar */}
              <div className="bg-foreground text-background p-5">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-display font-bold">{selectedItem.title}</h2>
                    <p className="text-muted text-sm mt-1">By {selectedItem.author}</p>
                    {selectedItem.description && (
                      <p className="mt-3 text-muted/80 text-sm max-w-2xl">{selectedItem.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="px-3 py-1 bg-background/20 text-xs uppercase tracking-wider">
                      {CATEGORIES.find(c => c.id === selectedItem.category)?.label || selectedItem.category}
                    </span>
                    {totalSlides > 1 && (
                      <span className="text-xs text-muted/70">{slideIndex + 1} / {totalSlides}</span>
                    )}
                  </div>
                </div>

                {/* Dot indicators */}
                {totalSlides > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSlideIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all duration-200 ${
                          i === slideIndex ? "bg-primary w-4" : "bg-background/40 hover:bg-background/70"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
