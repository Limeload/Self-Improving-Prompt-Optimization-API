"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface JSONEditorProps {
  value: Record<string, any> | string;
  onChange?: (value: Record<string, any>) => void;
  readOnly?: boolean;
  label?: string;
  className?: string;
}

export function JSONEditor({
  value,
  onChange,
  readOnly = false,
  label,
  className,
}: JSONEditorProps) {
  const [text, setText] = useState(
    typeof value === "string" ? value : JSON.stringify(value, null, 2)
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (newText: string) => {
    setText(newText);
    setError(null);

    if (onChange && !readOnly) {
      try {
        const parsed = JSON.parse(newText);
        onChange(parsed);
      } catch (e) {
        setError("Invalid JSON");
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Ignore
    }
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, 2);
      setText(formatted);
      setError(null);
      if (onChange) {
        onChange(parsed);
      }
    } catch (e) {
      setError("Cannot format invalid JSON");
    }
  };

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-white">{label}</label>
          <div className="flex gap-2">
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={formatJSON}
                className="text-xs h-7"
              >
                Format
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-xs h-7"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}
      <Card className="bg-zinc-950 border-zinc-800">
        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          readOnly={readOnly}
          className={`w-full h-64 p-4 font-mono text-sm text-zinc-300 bg-transparent resize-none focus:outline-none ${
            readOnly ? "cursor-default" : ""
          }`}
          spellCheck={false}
        />
      </Card>
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
      {!error && !readOnly && (
        <p className="mt-2 text-xs text-zinc-500">Valid JSON</p>
      )}
    </div>
  );
}

