import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  className?: string;
  disabled?: boolean;
}

const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  error = false,
  className = "",
  disabled = false,
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<SelectOption | null>(
    options.find(option => option.value === value) || null
  );
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const selected = options.find(option => option.value === value);
    setSelectedOption(selected || null);
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    
    if (!isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: buttonRect.bottom + 4,
        left: buttonRect.left,
        width: buttonRect.width
      });
    }
    
    setIsOpen(!isOpen);
  };

  const handleOptionSelect = (option: SelectOption) => {
    setSelectedOption(option);
    onChange(option.value);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Select Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full px-3 py-3 bg-white border rounded-lg text-sm text-left transition-all duration-200 ${
          error 
            ? 'border-red-300 text-red-600' 
            : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        } ${
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer focus:outline-none focus:ring-0 focus:border-gray-400'
        } ${
          isOpen ? 'border-gray-400 shadow-lg' : 'shadow-sm'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby="select-label"
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown 
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div 
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width
          }}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionSelect(option)}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors ${
                option.value === value 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-700'
              } ${
                index !== options.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{option.label}</span>
                {option.value === value && (
                  <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
