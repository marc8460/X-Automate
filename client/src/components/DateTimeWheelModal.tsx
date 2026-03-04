import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Clock, Zap } from "lucide-react";

const ITEM_H = 44;
const VISIBLE = 5; // number of visible items in each column

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, monthIdx: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

function getInitialState() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 5);
  return {
    monthIdx: d.getMonth(),
    dayIdx: d.getDate() - 1,
    yearOffset: 0,
    hourIdx: d.getHours(),
    minIdx: d.getMinutes(),
  };
}

// --- WheelColumn ---

interface WheelColumnProps {
  items: string[];
  selectedIndex: number;
  onChange: (idx: number) => void;
  label?: string;
  narrow?: boolean;
}

function WheelColumn({ items, selectedIndex, onChange, label, narrow }: WheelColumnProps) {
  const y = useMotionValue(-selectedIndex * ITEM_H);
  const containerH = VISIBLE * ITEM_H;
  const paddingTop = Math.floor(VISIBLE / 2) * ITEM_H;

  // Sync y when selectedIndex changes externally
  const prevIdx = useRef(selectedIndex);
  useEffect(() => {
    if (prevIdx.current !== selectedIndex) {
      prevIdx.current = selectedIndex;
      animate(y, -selectedIndex * ITEM_H, { type: "spring", stiffness: 340, damping: 36 });
    }
  }, [selectedIndex, y]);

  const snapToNearest = useCallback(() => {
    const raw = y.get();
    const clamped = Math.max(-(items.length - 1) * ITEM_H, Math.min(0, raw));
    const idx = Math.round(-clamped / ITEM_H);
    const snapped = -idx * ITEM_H;
    animate(y, snapped, { type: "spring", stiffness: 340, damping: 36 });
    if (idx !== prevIdx.current) {
      prevIdx.current = idx;
      onChange(idx);
    }
  }, [items.length, y, onChange]);

  const handleItemClick = (idx: number) => {
    prevIdx.current = idx;
    animate(y, -idx * ITEM_H, { type: "spring", stiffness: 340, damping: 36 });
    onChange(idx);
  };

  return (
    <div className={`flex flex-col items-center gap-1 ${narrow ? "w-14" : "w-24"}`}>
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">
          {label}
        </span>
      )}
      <div
        className="relative overflow-hidden rounded-lg"
        style={{ height: containerH }}
      >
        {/* Top/bottom fade mask */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 30%, transparent 70%, hsl(var(--background)) 100%)",
          }}
        />
        {/* Center highlight */}
        <div
          className="absolute left-0 right-0 pointer-events-none z-10 border-y border-primary/20 bg-primary/5"
          style={{ top: paddingTop, height: ITEM_H }}
        />
        {/* Draggable list */}
        <motion.div
          drag="y"
          dragConstraints={{ top: -(items.length - 1) * ITEM_H, bottom: 0 }}
          dragElastic={0.12}
          style={{ y, paddingTop }}
          onDragEnd={snapToNearest}
          className="cursor-grab active:cursor-grabbing will-change-transform"
        >
          {items.map((item, i) => {
            const dist = Math.abs(i - selectedIndex);
            const opacity = dist === 0 ? 1 : dist === 1 ? 0.55 : 0.25;
            const scale = dist === 0 ? 1 : 0.9;
            return (
              <div
                key={i}
                onClick={() => handleItemClick(i)}
                className={`flex items-center justify-center select-none transition-all duration-150 ${narrow ? "text-sm" : "text-base"} font-medium`}
                style={{ height: ITEM_H, opacity, transform: `scale(${scale})` }}
              >
                {item}
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

// --- DateTimeWheelModal ---

interface DateTimeWheelModalProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (isoString: string) => void;
  onPostNow: () => void;
  initialISO?: string;
}

export function DateTimeWheelModal({
  open,
  onClose,
  onSchedule,
  onPostNow,
  initialISO,
}: DateTimeWheelModalProps) {
  const currentYear = new Date().getFullYear();
  const YEARS = [String(currentYear), String(currentYear + 1), String(currentYear + 2)];

  const init = getInitialState();

  const [monthIdx, setMonthIdx] = useState(init.monthIdx);
  const [dayIdx, setDayIdx] = useState(init.dayIdx);
  const [yearOffset, setYearOffset] = useState(init.yearOffset); // 0,1,2
  const [hourIdx, setHourIdx] = useState(init.hourIdx);
  const [minIdx, setMinIdx] = useState(init.minIdx);

  // Re-initialize when modal opens
  useEffect(() => {
    if (!open) return;
    if (initialISO) {
      const d = new Date(initialISO);
      if (!isNaN(d.getTime())) {
        const yr = d.getFullYear();
        const offset = Math.max(0, Math.min(2, yr - currentYear));
        setMonthIdx(d.getMonth());
        setDayIdx(d.getDate() - 1);
        setYearOffset(offset);
        setHourIdx(d.getHours());
        setMinIdx(d.getMinutes());
        return;
      }
    }
    const s = getInitialState();
    setMonthIdx(s.monthIdx);
    setDayIdx(s.dayIdx);
    setYearOffset(s.yearOffset);
    setHourIdx(s.hourIdx);
    setMinIdx(s.minIdx);
  }, [open, initialISO]);

  const selectedYear = currentYear + yearOffset;
  const daysInMonth = getDaysInMonth(selectedYear, monthIdx);
  const DAYS = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  // Clamp dayIdx when month/year changes
  useEffect(() => {
    if (dayIdx >= daysInMonth) {
      setDayIdx(daysInMonth - 1);
    }
  }, [monthIdx, yearOffset, daysInMonth]);

  function getSelectedDate(): Date {
    return new Date(
      selectedYear,
      monthIdx,
      dayIdx + 1,
      hourIdx,
      minIdx,
      0,
    );
  }

  function getSelectedISO(): string {
    const d = getSelectedDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function isPast(): boolean {
    return getSelectedDate() < new Date();
  }

  const handleSchedule = () => {
    if (isPast()) return;
    onSchedule(getSelectedISO());
    onClose();
  };

  const handlePostNow = () => {
    onPostNow();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-panel border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-primary" />
                  <span className="font-semibold text-sm">Set Post Time</span>
                </div>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors rounded p-0.5"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Wheels */}
              <div className="px-4 py-4">
                <div className="flex items-start justify-center gap-1">
                  <WheelColumn
                    label="Month"
                    items={MONTHS}
                    selectedIndex={monthIdx}
                    onChange={setMonthIdx}
                  />
                  <WheelColumn
                    label="Day"
                    items={DAYS}
                    selectedIndex={Math.min(dayIdx, DAYS.length - 1)}
                    onChange={setDayIdx}
                    narrow
                  />
                  <WheelColumn
                    label="Year"
                    items={YEARS}
                    selectedIndex={yearOffset}
                    onChange={setYearOffset}
                    narrow
                  />
                  <div className="flex items-center gap-0.5 mt-6">
                    <WheelColumn
                      label="Hour"
                      items={HOURS}
                      selectedIndex={hourIdx}
                      onChange={setHourIdx}
                      narrow
                    />
                    <span className="text-lg font-bold text-muted-foreground/60 mt-6 pb-1 self-end">:</span>
                    <WheelColumn
                      label="Min"
                      items={MINUTES}
                      selectedIndex={minIdx}
                      onChange={setMinIdx}
                      narrow
                    />
                  </div>
                </div>

                {/* Selected datetime preview */}
                <p className={`text-center text-xs mt-3 ${isPast() ? "text-red-400" : "text-muted-foreground"}`}>
                  {isPast()
                    ? "⚠ Selected time is in the past"
                    : getSelectedDate().toLocaleString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-4 pb-4 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-muted-foreground"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-accent/40 text-accent hover:bg-accent/10 gap-1.5"
                  onClick={handlePostNow}
                >
                  <Zap size={13} />
                  Post Now
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-primary/20 text-primary hover:bg-primary/30 gap-1.5"
                  disabled={isPast()}
                  onClick={handleSchedule}
                >
                  <Clock size={13} />
                  Schedule
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
