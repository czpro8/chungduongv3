
import React, { useState } from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';

interface CopyableCodeProps {
  code: string;
  label?: string;
  className?: string;
  onCopy?: () => void;
}

const CopyableCode: React.FC<CopyableCodeProps> = ({ code, label, className = "", onCopy }) => {
  const [copied, setCopied] = useState(false);
  const [showCopyIcon, setShowCopyIcon] = useState(false); // New state

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(code.toUpperCase());
    setCopied(true);
    if (onCopy) onCopy();
    setTimeout(() => {
      setCopied(false);
      setShowCopyIcon(false); // Hide icon after copy feedback
    }, 2000);
  };

  const displayValue = label || code;

  return (
    <button
      type="button"
      onClick={handleCopy}
      onMouseEnter={() => setShowCopyIcon(true)} // Show icon on mouse enter
      onMouseLeave={() => !copied && setShowCopyIcon(false)} // Hide if not copied
      className={`group relative flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${className}`}
      title={`Bấm để sao chép: ${displayValue}`}
    >
      {displayValue}
      {copied ? (
        <CheckCircle2 size={12} className="text-emerald-400 animate-in zoom-in" />
      ) : (
        showCopyIcon && <Copy size={12} className="transition-opacity text-indigo-400" /> // Conditionally render
      )}
    </button>
  );
};

export default CopyableCode;
