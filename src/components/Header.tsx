import Link from 'next/link';
import { Utensils } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary hover:text-primary/90 transition-colors">
          <Utensils className="h-7 w-7" />
          <span>LocalEats</span>
        </Link>
        {/* Add navigation links here if needed in the future */}
      </div>
    </header>
  );
}
