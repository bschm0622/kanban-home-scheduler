import { useState, useEffect } from "react";

interface TimePickerProps {
  value: string; // "HH:MM" 24h format or ""
  onChange: (value: string) => void;
  onClear?: () => void;
}

function to12h(h24: number): { hour: number; period: "AM" | "PM" } {
  const period = h24 >= 12 ? "PM" : "AM";
  const hour = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return { hour, period };
}

function to24h(hour: number, period: "AM" | "PM"): number {
  if (period === "AM") return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export default function TimePicker({ value, onChange, onClear }: TimePickerProps) {
  const parsed = value ? value.split(":").map(Number) : null;
  const current12 = parsed ? to12h(parsed[0]) : null;

  const [hour, setHour] = useState(current12?.hour ?? 9);
  const [minute, setMinute] = useState(parsed ? parsed[1] : 0);
  const [period, setPeriod] = useState<"AM" | "PM">(current12?.period ?? "AM");
  const [isOpen, setIsOpen] = useState(!!value);

  useEffect(() => {
    if (parsed) {
      const h12 = to12h(parsed[0]);
      setHour(h12.hour);
      setMinute(parsed[1]);
      setPeriod(h12.period);
    }
  }, [value]);

  const applyCustomTime = (h: number, m: number, p: "AM" | "PM") => {
    const h24 = to24h(h, p);
    onChange(`${pad(h24)}:${pad(m)}`);
  };

  const cycleHour = (dir: 1 | -1) => {
    const next = hour + dir;
    const newHour = next > 12 ? 1 : next < 1 ? 12 : next;
    setHour(newHour);
    applyCustomTime(newHour, minute, period);
  };

  const cycleMinute = (dir: 1 | -1) => {
    const step = 5;
    let next = minute + dir * step;
    if (next >= 60) next = 0;
    if (next < 0) next = 55;
    setMinute(next);
    applyCustomTime(hour, next, period);
  };

  const togglePeriod = () => {
    const newPeriod = period === "AM" ? "PM" : "AM";
    setPeriod(newPeriod);
    applyCustomTime(hour, minute, newPeriod);
  };

  const handleEnable = () => {
    setIsOpen(true);
    applyCustomTime(hour, minute, period);
  };

  const handleClear = () => {
    setIsOpen(false);
    onClear?.();
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleEnable}
        className="text-sm text-primary font-medium touch-manipulation"
      >
        + Add reminder time
      </button>
    );
  }

  const Chevron = ({ up }: { up: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {up ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
    </svg>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-1">
        {/* Hour */}
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => cycleHour(1)} className="w-12 h-8 flex items-center justify-center text-tertiary hover:text-foreground rounded-lg transition-colors touch-manipulation">
            <Chevron up />
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={hour}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              if (raw === "") return;
              let n = parseInt(raw, 10);
              if (n > 12) n = 12;
              if (n < 1) n = 1;
              setHour(n);
              applyCustomTime(n, minute, period);
            }}
            onFocus={(e) => e.target.select()}
            className="w-12 h-10 text-center text-xl font-semibold text-foreground bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="button" onClick={() => cycleHour(-1)} className="w-12 h-8 flex items-center justify-center text-tertiary hover:text-foreground rounded-lg transition-colors touch-manipulation">
            <Chevron up={false} />
          </button>
        </div>

        <span className="text-xl font-bold text-tertiary">:</span>

        {/* Minute */}
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => cycleMinute(1)} className="w-12 h-8 flex items-center justify-center text-tertiary hover:text-foreground rounded-lg transition-colors touch-manipulation">
            <Chevron up />
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={pad(minute)}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              if (raw === "") return;
              let n = parseInt(raw, 10);
              if (n > 59) n = 59;
              if (n < 0) n = 0;
              setMinute(n);
              applyCustomTime(hour, n, period);
            }}
            onFocus={(e) => e.target.select()}
            className="w-12 h-10 text-center text-xl font-semibold text-foreground bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="button" onClick={() => cycleMinute(-1)} className="w-12 h-8 flex items-center justify-center text-tertiary hover:text-foreground rounded-lg transition-colors touch-manipulation">
            <Chevron up={false} />
          </button>
        </div>

        {/* AM/PM */}
        <div className="flex flex-col items-center gap-1 ml-1.5">
          <button
            type="button"
            onClick={togglePeriod}
            className={`w-11 h-9 rounded-lg text-xs font-bold transition-all touch-manipulation ${
              period === "AM" ? "bg-primary text-white" : "bg-secondary text-tertiary"
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={togglePeriod}
            className={`w-11 h-9 rounded-lg text-xs font-bold transition-all touch-manipulation ${
              period === "PM" ? "bg-primary text-white" : "bg-secondary text-tertiary"
            }`}
          >
            PM
          </button>
        </div>

        {/* Clear */}
        {onClear && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg px-2 py-1 touch-manipulation transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
