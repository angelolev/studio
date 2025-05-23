
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Restaurant } from '@/types';
import { Loader2 } from 'lucide-react';

const addRestaurantSchema = z.object({
  name: z.string().min(2, { message: 'Restaurant name must be at least 2 characters.' }),
  cuisine: z.string().min(2, { message: 'Cuisine/Category must be at least 2 characters.' }),
  address: z.string().min(5, { message: 'Address must be at least 5 characters.' }),
});

type AddRestaurantFormData = z.infer<typeof addRestaurantSchema>;

export default function AddRestaurantPage() {
  const { user, loadingAuthState } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<AddRestaurantFormData>({
    resolver: zodResolver(addRestaurantSchema),
    defaultValues: {
      name: '',
      cuisine: '',
      address: '',
    },
  });

  useEffect(() => {
    if (!loadingAuthState && !user) {
      toast({
        title: 'Access Denied',
        description: 'You must be logged in to add a restaurant.',
        variant: 'destructive',
      });
      router.replace('/'); // Redirect to home if not logged in
    }
  }, [user, loadingAuthState, router, toast]);

  const onSubmit: SubmitHandler<AddRestaurantFormData> = (data) => {
    if (!user) return; // Should be caught by useEffect, but good practice

    const newRestaurant: Restaurant = {
      id: uuidv4(),
      name: data.name,
      cuisine: data.cuisine,
      address: data.address,
      imageUrl: 'https://placehold.co/600x400.png', // Placeholder image
      description: `A newly added restaurant: ${data.name}, specializing in ${data.cuisine}. Located at ${data.address}.`, // Generic description
    };

    console.log('New Restaurant Data:', newRestaurant);
    // TODO: Implement saving to Firestore and updating global/page state
    // For now, just show a success toast and redirect

    toast({
      title: 'Restaurant Added (Locally)!',
      description: `${newRestaurant.name} has been noted. It won't be saved permanently or visible to others in this version.`,
    });

    form.reset();
    router.push('/'); // Redirect to home page after "submission"
  };

  if (loadingAuthState) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading authentication state...</p>
      </div>
    );
  }

  if (!user) {
     // This state should ideally not be reached due to the useEffect redirect,
     // but it's a fallback.
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <p className="text-lg text-destructive">Access Denied.</p>
        <p className="text-muted-foreground">Please log in to add a restaurant.</p>
        <Button onClick={() => router.push('/')} className="mt-4">Go to Homepage</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Add a New Restaurant</CardTitle>
          <CardDescription>
            Fill in the details below to add a new restaurant to our list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restaurant Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., The Gourmet Place" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cuisine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuisine / Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Italian, Cafe, Bakery" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123 Main St, Anytown" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Restaurant'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
