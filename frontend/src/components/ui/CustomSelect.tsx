"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  ariaLabel?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccione una opción",
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
  disabled = false,
  size = "md",
  ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Manejo de teclado (Escape para cerrar, flechas para navegar)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          return;
        }

        const currentIndex = options.findIndex((opt) => opt.value === value);
        let nextIndex = currentIndex;

        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        }

        if (options[nextIndex]) {
          onChange(options[nextIndex].value);
        }
      } else if (e.key === "Enter" || e.key === " ") {
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
    },
    [disabled, isOpen, options, value, onChange]
  );

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5 min-h-[36px]",
    md: "px-4 py-2.5 text-sm rounded-xl gap-2 min-h-[44px]",
    lg: "px-4 py-3 text-sm sm:text-base rounded-2xl gap-2.5 min-h-[48px] font-bold",
  }[size];

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative inline-block w-full text-left select-none ${className}`}
    >
      {/* Botón Disparador del Menú Desplegable */}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        className={`w-full flex items-center justify-between font-semibold text-[#172B4D] bg-white border border-[#AFC8D0] shadow-xs hover:border-[#1995AD] focus:border-[#1995AD] focus:ring-2 focus:ring-[#1995AD]/20 focus:outline-hidden transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${buttonClassName} ${
          isOpen ? "border-[#1995AD] ring-2 ring-[#1995AD]/20 shadow-md" : ""
        }`}
      >
        <span className="flex items-center gap-2 truncate text-left">
          {selectedOption?.icon}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        {/* Flecha con micro-transición suave de rotación */}
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#1995AD] transition-transform duration-200 ease-out ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/* Contenedor del Menú Desplegable con z-[100] y visible */}
      <div
        className={`absolute left-0 top-full mt-1.5 w-full min-w-[280px] bg-white rounded-2xl border-2 border-[#1995AD] shadow-2xl z-[100] overflow-hidden transform transition-all duration-200 ease-out origin-top ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto visible"
            : "opacity-0 scale-95 -translate-y-1.5 pointer-events-none invisible"
        } ${dropdownClassName}`}
      >
        <ul
          ref={listboxRef}
          role="listbox"
          tabIndex={-1}
          className="max-h-72 overflow-y-auto p-1.5 divide-y divide-[#F1F1F2]/60 focus:outline-hidden scrollbar-thin scrollbar-thumb-[#AFC8D0]"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`group flex items-center justify-between px-4 py-3 text-sm sm:text-base font-semibold rounded-xl transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-[#1995AD]/15 text-[#1995AD] font-bold shadow-2xs"
                    : "text-[#172B4D] hover:bg-[#F1F1F2] hover:text-[#1995AD]"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate mr-3">
                  {opt.icon}
                  <div className="truncate">
                    <p className="truncate leading-tight">{opt.label}</p>
                    {opt.description && (
                      <p className="text-xs font-normal text-[#172B4D]/60 mt-0.5 truncate">
                        {opt.description}
                      </p>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="h-5 w-5 shrink-0 text-[#1995AD] stroke-[2.5]" />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
