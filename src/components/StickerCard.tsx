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
  const didLongPress = useRef(false);

  const isOwned = collectionSticker?.status === "owned";
  const duplicateCount = collectionSticker?.duplicate_count ?? 0;
  const hasDuplicates = isOwned && duplicateCount > 0;

  const handlePointerDown = useCallback(() => {
    if (readOnly) return;
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (!isOwned) return;
      if (duplicateCount > 0) {
        onDuplicateChange(sticker.id, duplicateCount - 1);
      } else {
        onToggle(sticker.id, collectionSticker);
      }
    }, 500);
  }, [readOnly, isOwned, duplicateCount, collectionSticker, sticker.id, onToggle, onDuplicateChange]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (readOnly) return;
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (!isOwned) {
      onToggle(sticker.id, collectionSticker);
    } else {
      onDuplicateChange(sticker.id, duplicateCount + 1);
    }
  }, [readOnly, isOwned, duplicateCount, collectionSticker, sticker.id, onToggle, onDuplicateChange]);

  return (
    <button
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
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
        <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none shadow">
          +{duplicateCount}
        </span>
      )}
    </button>
  );
}
