"use client";

import { useState } from "react";
import { AddKidModal } from "@/app/components/add-kid-modal";
import { notifyKidsUpdated } from "@/app/lib/kid-storage";

// Header button of /kids: opens the mockup modal as an overlay instead of
// navigating away. Saving notifies the grid and closes the modal.
export function AddKidButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-none items-center gap-2 rounded-[14px] px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,0.7)]"
        style={{ background: "linear-gradient(180deg, #F4977E, #EE8164)" }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Agregar niño
      </button>

      {open && (
        <AddKidModal
          onClose={() => setOpen(false)}
          onSaved={() => {
            notifyKidsUpdated();
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
