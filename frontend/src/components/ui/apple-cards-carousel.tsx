"use client";

import React, {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui-aeriq/Chip";

export interface CarouselCardData {
  category: string;
  title: string;
  src: string;
  objectPosition?: string;
  content: React.ReactNode;
}

const CarouselContext = createContext<{
  onCardClose: (index: number) => void;
  currentIndex: number;
}>({
  onCardClose: () => {},
  currentIndex: 0,
});

export function Carousel({
  items,
  initialScroll = 0,
}: {
  items: React.ReactNode[];
  initialScroll?: number;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
    }
  };

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  const scrollLeft = () => {
    carouselRef.current?.scrollBy({ left: -340, behavior: "smooth" });
  };

  const scrollRight = () => {
    carouselRef.current?.scrollBy({ left: 340, behavior: "smooth" });
  };

  const handleCardClose = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = window.innerWidth < 768 ? 230 : 384;
      const gap = window.innerWidth < 768 ? 4 : 8;
      carouselRef.current.scrollTo({
        left: (cardWidth + gap) * (index + 1),
        behavior: "smooth",
      });
      setCurrentIndex(index);
    }
  };

  return (
    <CarouselContext.Provider
      value={{ onCardClose: handleCardClose, currentIndex }}
    >
      <div className="relative w-full">
        <div
          className="flex w-full overflow-x-scroll overscroll-x-auto py-8 md:py-12 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none]"
          ref={carouselRef}
          onScroll={checkScrollability}
        >
          <div className="flex flex-row justify-start gap-4 pl-[18px] md:pl-[34px] max-w-7xl mx-auto">
            {items.map((item, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.5,
                    delay: 0.08 * index,
                    ease: "easeOut",
                  },
                }}
                key={`card-${index}`}
                className="last:pr-[5%] md:last:pr-[20%] rounded-[22px]"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 mr-[18px] md:mr-[34px] max-w-7xl mx-auto">
          <button
            type="button"
            className="relative z-40 h-10 w-10 rounded-full bg-[var(--ink)] text-[var(--lime)] flex items-center justify-center disabled:opacity-30 cursor-pointer transition-opacity"
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="relative z-40 h-10 w-10 rounded-full bg-[var(--ink)] text-[var(--lime)] flex items-center justify-center disabled:opacity-30 cursor-pointer transition-opacity"
            onClick={scrollRight}
            disabled={!canScrollRight}
            aria-label="Scroll right"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
}

export function Card({
  card,
  index,
  layout = false,
}: {
  card: CarouselCardData;
  index: number;
  layout?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onCardClose } = useContext(CarouselContext);

  const handleClose = React.useCallback(() => {
    setOpen(false);
    onCardClose(index);
  }, [index, onCardClose]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, handleClose]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 h-screen z-[60] overflow-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-black/70 backdrop-blur-lg h-full w-full fixed inset-0"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              ref={containerRef}
              className="max-w-4xl mx-auto bg-white h-fit z-[70] my-10 p-6 md:p-10 rounded-[22px] font-sans relative text-[var(--ink)]"
              role="dialog"
              aria-modal="true"
              aria-label={card.title}
            >
              <button
                type="button"
                className="sticky top-4 h-9 w-9 ml-auto bg-[var(--ink)] rounded-full flex items-center justify-center text-white cursor-pointer"
                onClick={handleClose}
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
              <Chip>{card.category}</Chip>
              <h3 className="text-[clamp(28px,3.4vw,48px)] font-medium tracking-[-0.04em] leading-[1.05] text-[var(--ink)] mt-4">
                {card.title}
              </h3>
              <div className="py-8">{card.content}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        layoutId={layout ? `card-${card.title}` : undefined}
        onClick={() => setOpen(true)}
        className="rounded-[22px] bg-[#1b3122] h-80 w-56 md:h-[36rem] md:w-96 overflow-hidden flex flex-col items-start justify-start relative z-10 text-left cursor-pointer group focus-visible:outline-2 focus-visible:outline-[var(--lime2)]"
      >
        <div
          className="absolute h-full top-0 inset-x-0 z-20 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,25,15,0.65) 0%, transparent 45%, rgba(10,25,15,0.5) 100%)",
          }}
        />
        <div className="relative z-30 p-6 md:p-8">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-white/80">
            {card.category}
          </p>
          <p className="text-white text-xl md:text-3xl font-medium tracking-[-0.03em] max-w-xs text-left [text-wrap:balance] mt-2 leading-[1.1]">
            {card.title}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.src}
          alt={card.title}
          className={cn(
            "object-cover absolute z-10 inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105"
          )}
          style={{ objectPosition: card.objectPosition ?? "50% 50%" }}
        />
      </motion.button>
    </>
  );
}
