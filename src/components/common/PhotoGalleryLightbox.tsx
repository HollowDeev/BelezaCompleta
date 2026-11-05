"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface GalleryPhoto {
  url: string;
  title: string;
  subtitle?: string;
}

interface PhotoGalleryLightboxProps {
  photos: GalleryPhoto[];
  initialIndex?: number;
  onClose: () => void;
}

export function PhotoGalleryLightbox({
  photos,
  initialIndex = 0,
  onClose,
}: PhotoGalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialIndex, photos.length - 1))
  );

  const total = photos.length;
  const currentPhoto = photos[currentIndex];

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
  }, [total]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
  }, [total]);

  // Teclado: Escape para fechar, Setas para navegar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  // Prevenir scroll do body quando o modal estiver aberto
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!currentPhoto) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 animate-fade-in select-none"
    >
      {/* Barra Superior */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between w-full max-w-5xl mx-auto py-2 px-3 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/15 text-white shadow-xl"
      >
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-full bg-[#C59B27] text-stone-950 font-black text-xs">
            {currentIndex + 1} de {total}
          </span>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white tracking-wide">
              {currentPhoto.title}
            </h3>
            {currentPhoto.subtitle && (
              <p className="text-[11px] text-stone-300 hidden sm:block">
                {currentPhoto.subtitle}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
          title="Fechar (Esc)"
        >
          <X className="w-5 h-5" />
          <span className="hidden sm:inline">Fechar</span>
        </button>
      </div>

      {/* Área Central da Imagem com Controles */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex-1 flex items-center justify-center my-3 max-w-6xl mx-auto w-full overflow-hidden"
      >
        {total > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-10 p-3 sm:p-4 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-white transition-all hover:scale-105 shadow-2xl backdrop-blur-xs"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        )}

        <div className="relative max-h-[75vh] sm:max-h-[80vh] max-w-full flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={currentPhoto.url}
            src={currentPhoto.url}
            alt={currentPhoto.title}
            className="max-h-[75vh] sm:max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10 animate-fade-in"
          />
        </div>

        {total > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-10 p-3 sm:p-4 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-white transition-all hover:scale-105 shadow-2xl backdrop-blur-xs"
            aria-label="Próxima foto"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        )}
      </div>

      {/* Miniaturas Inferiores */}
      {total > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-2.5 max-w-3xl mx-auto w-full py-2 px-3 overflow-x-auto scrollbar-none"
        >
          {photos.map((photo, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`relative rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                idx === currentIndex
                  ? "border-[#C59B27] scale-105 ring-2 ring-[#C59B27]/40 opacity-100"
                  : "border-white/20 opacity-50 hover:opacity-80"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.title}
                className="w-14 h-14 sm:w-16 sm:h-16 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
