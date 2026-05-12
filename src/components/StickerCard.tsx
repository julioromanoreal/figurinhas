"use client";

import { useCallback, useRef } from "react";
import type { Sticker, CollectionSticker } from "@/lib/types";

interface Props {
  sticker: Sticker;
  collectionSticker?: CollectionSticker;
  onToggle: (stickerId: string, current?: CollectionSticker) => void;
  onDuplicateChange: (stickerId: string, count: number) => void;
  readOnly?: boolean;
}

export default function StickerCard({ sticker, collectionSticker, onToggle, onDuplicateChange, readOnly }: Props) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOwned = collectionSticker?.status === "owned";
  const duplicateCount = collectionSticker?.duplicate_count ?? 0;
  const hasDuplicates = isOwned && duplicateCount > 0;

  const handlePointerDown = useCallback(() => {
    if (readOnly || !isOwned) return;
    longPressTimer.current = setTimeout(() => {
      const current = collectionSticker?.duplicate_count ?? 0;
      const next = current > 0 ? 0 : 1;
      onDuplicateChange(sticker.id, next);
    }, 500);
  }, [readOnly, isOwned, collectionSticker, sticker.id, onDuplicateChange]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (readOnly) return;
    onToggle(sticker.id, collectionSticker);
  }, [readOnly, onToggle, sticker.id, collectionSticker]);

  const handleDuplicateClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly || !isOwned) return;
    const current = collectionSticker?.duplicate_count ?? 0;
    onDuplicateChange(sticker.id, current + 1);
  }, [readOnly, isOwned, collectionSticker, sticker.id, onDuplicateChange]);

  const handleDuplicateRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly || !isOwned) return;
    const current = collectionSticker?.duplicate_count ?? 0;
    onDuplicateChange(sticker.id, Math.max(0, current - 1));
  }, [readOnly, isOwned, collectionSticker, sticker.id, onDuplicateChange]);

  return (
    <button
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`
        relative flex flex-col items-center justify-center rounded-xl border-2 transition-all
        select-none touch-manipulation
        ${readOnly ? "cursor-default" : "cursor-pointer active:scale-95"}
        ${isOwned
          ? hasDuplicates
            ? "bg-amber-50 border-amber-400 text-amber-700"
            : "bg-green-50 border-green-400 text-green-700"
          : "bg-gray-50 border-gray-200 text-gray-400"
        }
        w-full aspect-square p-1
      `}
      title={sticker.name}
    >
      <span className={`text-xs font-bold leading-tight text-center ${isOwned ? "" : "opacity-50"}`}>
        {sticker.code}
      </span>

      {hasDuplicates && (
        <span
          onClick={handleDuplicateClick}
          onContextMenu={handleDuplicateRightClick}
          className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none shadow"
        >
          +{duplicateCount}
        </span>
      )}
    </button>
  );
}
