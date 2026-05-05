"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import clsx from "clsx";

/**
 * CUSTOM SELECT COMPONENT
 */
type Option = {
  id: string;
  fullName?: string;
  name?: string;
};

type CustomSelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  name?: string;
};

export function CustomSelect({ options, value, onChange, label, placeholder = "Select...", className, name }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);
  const displayValue = selectedOption ? (selectedOption.fullName || selectedOption.name) : "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={clsx("relative space-y-2", className)} ref={dropdownRef}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 block px-1">
          {label}
        </label>
      )}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-900 transition-all",
          isOpen ? "bg-white ring-4 ring-slate-900/5 border-slate-900/10" : "bg-slate-50 hover:bg-slate-100/50"
        )}
      >
        <span className={clsx(!displayValue && "text-slate-400")}>
          {displayValue || placeholder}
        </span>
        <ChevronDown className={clsx("h-4 w-4 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[100] w-full animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl ring-1 ring-black/5 custom-scrollbar">
            {options.length > 0 ? (
              options.map((option) => (
                <div
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    "cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold transition-colors",
                    value === option.id 
                      ? "bg-slate-900 text-white" 
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {option.fullName || option.name}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-slate-400 italic">No options available</div>
            )}
          </div>
        </div>
      )}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

/**
 * CUSTOM DATE PICKER COMPONENT
 */
type CustomDatePickerProps = {
  value: string; // ISO String or YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  name?: string;
};

export function CustomDatePicker({ value, onChange, label, className, name }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(value || new Date()));
  const pickerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysCount = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    
    const days = [];
    
    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    }
    
    // Days of current month
    for (let d = 1; d <= daysCount; d++) {
      const date = new Date(year, month, d);
      const isSelected = selectedDate && 
        selectedDate.getDate() === d && 
        selectedDate.getMonth() === month && 
        selectedDate.getFullYear() === year;
      const isToday = new Date().toDateString() === date.toDateString();

      days.push(
        <button
          key={d}
          type="button"
          onClick={() => {
            const iso = new Date(year, month, d, 12).toISOString().split('T')[0];
            onChange(iso);
            setIsOpen(false);
          }}
          className={clsx(
            "flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all",
            isSelected 
              ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
              : isToday 
                ? "bg-indigo-50 text-indigo-600" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          {d}
        </button>
      );
    }
    
    return days;
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long' });

  return (
    <div className={clsx("relative space-y-2", className)} ref={pickerRef}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 block px-1">
          {label}
        </label>
      )}

      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-900 transition-all",
          isOpen ? "bg-white ring-4 ring-slate-900/5 border-slate-900/10" : "bg-slate-50 hover:bg-slate-100/50"
        )}
      >
        <span>{selectedDate ? selectedDate.toLocaleDateString() : "Select Date"}</span>
        <CalendarIcon className="h-4 w-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[100] w-72 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-2xl ring-1 ring-black/5">
            <div className="mb-4 flex items-center justify-between px-1">
              <h4 className="text-sm font-black tracking-tight text-slate-900">{monthName} {currentMonth.getFullYear()}</h4>
              <div className="flex gap-1">
                <button 
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {renderDays()}
            </div>
          </div>
        </div>
      )}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
