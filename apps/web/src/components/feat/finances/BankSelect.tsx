import { useState, useRef, useEffect } from 'react';
import { filterBanks, findBank, type ThaiBank } from '@/utils/thai-banks';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BankSelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  /** Compact mode for modal/smaller layouts */
  compact?: boolean;
}

/**
 * Autocomplete bank select that shows a filtered dropdown of Thai banks.
 * Stores the `niceName` as the value (e.g. "Kasikornbank").
 * Shows bank color dot + name + Thai name in the dropdown.
 */
export function BankSelect({
  value,
  onChange,
  id,
  placeholder = 'Search or select a bank…',
  className,
  compact,
}: BankSelectProps) {
  const { t, i18n } = useTranslation();
  
  const actualPlaceholder = placeholder === 'Search or select a bank…' 
    ? t('finances.searchOrSelectBank') 
    : placeholder;

  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = filterBanks(query);
  const selectedBank = findBank(value);

  const displayValue = selectedBank
    ? (i18n.language.startsWith('th') ? selectedBank.thaiName : selectedBank.niceName)
    : value || '';

  // Sync external value changes
  useEffect(() => {
    if (!isOpen) {
      setQuery(value);
    }
  }, [value, isOpen]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Reset query to current value if user clicked away without selecting
        setQuery(value);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const selectBank = (bank: ThaiBank) => {
    onChange(bank.niceName);
    setQuery(bank.niceName);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightedIndex]) {
          selectBank(filtered[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery(value);
        break;
    }
  };

  const inputHeight = compact ? 'h-9 text-xs' : 'h-10 text-sm';

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      {/* Input with optional color dot */}
      <div className="relative">
        {selectedBank && !isOpen && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white/50 shadow-sm"
            style={{ backgroundColor: selectedBank.color }}
          />
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="bank-listbox"
          autoComplete="off"
          value={isOpen ? query : displayValue}
          placeholder={actualPlaceholder}
          className={`flex w-full rounded-xl border border-border bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8 ${inputHeight} ${
            selectedBank && !isOpen ? 'pl-8' : 'pl-3'
          }`}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
            setHighlightedIndex(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
        />
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform duration-200 pointer-events-none ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <ul
          ref={listRef}
          id="bank-listbox"
          role="listbox"
          className="absolute z-50 top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-150"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-xs text-muted-foreground text-center">
              {t('finances.noBanksFoundFor', { query })}
            </li>
          ) : (
            filtered.map((bank, i) => (
              <li
                key={bank.key}
                role="option"
                aria-selected={highlightedIndex === i}
                onMouseEnter={() => setHighlightedIndex(i)}
                onClick={() => selectBank(bank)}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                  highlightedIndex === i
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                } ${value === bank.niceName ? 'font-semibold' : ''}`}
              >
                {/* Color dot */}
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-sm shrink-0"
                  style={{ backgroundColor: bank.color }}
                />
                <div className="flex flex-col min-w-0">
                  <span className={`truncate leading-tight ${compact ? 'text-xs' : 'text-sm'}`}>
                    {bank.niceName}
                    <span className="text-muted-foreground ml-1.5 font-normal uppercase text-[10px]">
                      {bank.key}
                    </span>
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate leading-tight">
                    {bank.thaiName}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
