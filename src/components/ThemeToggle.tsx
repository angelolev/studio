
'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme(); // Use resolvedTheme
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a disabled button or null during SSR and initial client render to avoid hydration mismatch
    return <Button variant="ghost" size="icon" disabled className="h-10 w-10" />;
  }

  const toggleTheme = () => {
    // Toggle based on the currently resolved theme
    if (resolvedTheme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Cambiar tema">
      {resolvedTheme === 'dark' ? (
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
      )}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}

