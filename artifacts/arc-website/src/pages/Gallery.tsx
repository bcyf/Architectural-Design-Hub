import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useListGalleryImages } from "@workspace/api-client-react";
import { X, ZoomIn } from "lucide-react";
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
  { id: 1, title: "Urban Intervention", category: "studio-3rd", imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80", author: "Sarah Chen" },
  { id: 2, title: "Section Detail", category: "drawings", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80", author: "Marcus Kim" },
  { id: 3, title: "Pavilion Model", category: "models", imageUrl: "https://images.unsplash.com/photo-1541888009130-9759d5b0a316?w=800&q=80", author: "Elena R." },
  { id: 4, title: "Concrete Formwork", category: "studio-2nd", imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80", author: "Alex T." },
  { id: 5, title: "Light Study", category: "studio-1st", imageUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80", author: "Jessica W." },
  { id: 6, title: "Library Thesis", category: "thesis", imageUrl: "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=800&q=80", author: "David P." },
];

export default function Gallery() {
  const [filter, setFilter] = useState("all");
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  
  const { data: galleryData, isLoading } = useListGalleryImages();
  const images = galleryData?.length ? galleryData : MOCK_GALLERY;

  const filteredImages = filter === "all" 
    ? images 
    : images.filter((img: any) => img.category === filter);

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

        {/* Masonry Grid (simulated with CSS columns) */}
        {isLoading ? (
          <div className="columns-1 sm:columns-2 md:columns-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-muted animate-pulse mb-6" style={{ height: `${Math.random() * 200 + 200}px` }} />
            ))}
          </div>
        ) : (
          <motion.div layout className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
            <AnimatePresence>
              {filteredImages?.map((img: any) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  key={img.id}
                  className="break-inside-avoid relative group cursor-pointer overflow-hidden"
                  onClick={() => setSelectedImage(img)}
                >
                  <img 
                    src={img.imageUrl} 
                    alt={img.title} 
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-6 text-center text-background">
                    <ZoomIn className="mb-4 text-primary w-8 h-8" />
                    <h3 className="font-display font-bold text-xl mb-1">{img.title}</h3>
                    <p className="text-sm opacity-80">{img.author}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 p-2 text-foreground bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors z-10"
              onClick={() => setSelectedImage(null)}
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
              <img 
                src={selectedImage.imageUrl} 
                alt={selectedImage.title} 
                className="w-full h-auto max-h-[75vh] object-contain bg-secondary/50"
              />
              <div className="bg-foreground text-background p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-display font-bold">{selectedImage.title}</h2>
                    <p className="text-muted text-sm mt-1">By {selectedImage.author}</p>
                  </div>
                  <span className="px-3 py-1 bg-background/20 text-xs uppercase tracking-wider">
                    {CATEGORIES.find(c => c.id === selectedImage.category)?.label || selectedImage.category}
                  </span>
                </div>
                {selectedImage.description && (
                  <p className="mt-4 text-muted/80 text-sm max-w-2xl">{selectedImage.description}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
