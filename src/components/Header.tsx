
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Added for navigation
import { Utensils, LogIn, LogOut, UserCircle, PlusCircle } from 'lucide-react'; // Added PlusCircle
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from './ThemeToggle';
import { useToast } from '@/hooks/use-toast'; // Added for toast

export default function Header() {
  const { user, loadingAuthState, signInWithGoogle, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleAddRestaurantClick = () => {
    if (!user && !loadingAuthState) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to add a new restaurant.',
        action: <Button onClick={async () => {
          await signInWithGoogle();
          // User will need to click "Add Restaurant" again after signing in.
          // A more seamless UX would involve redirecting after login.
        }}>Sign In</Button>,
      });
    } else if (user) {
      router.push('/add-restaurant');
    }
  };

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary hover:text-primary/90 transition-colors">
          <Utensils className="h-7 w-7" />
          <span>LocalEats</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
           <Button variant="outline" onClick={handleAddRestaurantClick} aria-label="Add new restaurant">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Restaurant
          </Button>
          {loadingAuthState ? (
            <Button variant="outline" disabled>Loading...</Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback>
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle size={20}/>}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.displayName || 'Authenticated User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" onClick={signInWithGoogle}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign In with Google
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
