import React, { useRef, useState, useEffect } from 'react';

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isPassword?: boolean;
  onComplete?: (value: string) => void;
}

export default function PinInput({ length = 4, value, onChange, disabled = false, isPassword = false, onComplete }: PinInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const newDigits = value.split('').slice(0, length);
    while (newDigits.length < length) {
      newDigits.push('');
    }
    setDigits(newDigits);
  }, [value, length]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, ''); // only allow digits
    if (!val) return;

    // Take the last character entered
    const digit = val[val.length - 1];
    
    const newDigits = [...digits];
    newDigits[index] = digit;
    
    const newValue = newDigits.join('');
    onChange(newValue);

    // Move to next input
    if (index < length - 1 && digit !== '') {
      inputRefs.current[index + 1]?.focus();
    }

    if (newValue.length === length) {
      onComplete?.(newValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const newDigits = [...digits];
      
      if (digits[index] === '') {
        // If current is empty, move to previous and clear it
        if (index > 0) {
          newDigits[index - 1] = '';
          inputRefs.current[index - 1]?.focus();
        }
      } else {
        // Clear current
        newDigits[index] = '';
      }
      
      onChange(newDigits.join(''));
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < pastedData.length; i++) {
      if (i < length) {
        newDigits[i] = pastedData[i];
      }
    }
    const newValue = newDigits.join('');
    onChange(newValue);
    
    // Focus the next empty input, or the last input
    const nextIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[nextIndex]?.focus();

    if (newValue.length === length) {
      onComplete?.(newValue);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 w-full">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type={isPassword ? "password" : "text"}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={digit}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
        />
      ))}
    </div>
  );
}
