
'use client';

import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


export default function FloatingAddButton() {
  const { user, loadingAuthState, signInWithGoogle } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleAddRestaurantClick = () => {
    if (!user && !loadingAuthState) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to add a new restaurant.',
        action: <Button onClick={async () => {
          try {
            await signInWithGoogle();
            // User will be redirected if they were trying to access /add-restaurant
            // or they can click the button again.
            // For a more seamless UX, could store intended path before login.
          } catch (error) {
            // signInWithGoogle in AuthContext should handle its own errors
          }
        }}>Sign In</Button>,
      });
    } else if (user) {
      router.push('/add-restaurant');
    }
    // If loadingAuthState, button might be disabled or show a spinner, handled by its disabled state
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 flex items-center justify-center
                       bg-primary hover:bg-primary/90 text-primary-foreground
                       transition-transform hover:scale-110 active:scale-95"
            onClick={handleAddRestaurantClick}
            aria-label="Add new restaurant"
            disabled={loadingAuthState}
          >
            <PlusCircle className="h-7 w-7" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-primary text-primary-foreground">
          <p>Add Restaurant</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
