import React, { useState, useEffect } from 'react';

export function Typewriter({ text, delay = 15 }: { text: string; delay?: number }) {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, delay, text]);

  return (
    <>
      {currentText.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i !== currentText.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))}
      {currentIndex < text.length && (
        <span className="inline-block w-1.5 h-4 bg-[#3b82f6] animate-pulse ml-1 align-middle" />
      )}
    </>
  );
}
