
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Restaurant, Cuisine } from '@/types';
import { addRestaurantToFirestore } from '@/lib/firestoreService';
import { cuisines } from '@/data/cuisines'; // Import local cuisines
import { Loader2 } from 'lucide-react';

const addRestaurantSchema = z.object({
  name: z.string().min(2, { message: 'Restaurant name must be at least 2 characters.' }),
  cuisine: z.string().min(1, { message: 'Please select a cuisine/category.' }),
  address: z.string().min(5, { message: 'Address must be at least 5 characters.' }),
});

type AddRestaurantFormData = z.infer<typeof addRestaurantSchema>;

export default function AddRestaurantPage() {
  const { user, loadingAuthState } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddRestaurantFormData>({
    resolver: zodResolver(addRestaurantSchema),
    defaultValues: {
      name: '',
      cuisine: '',
      address: '',
    },
  });

  // No longer fetching cuisines from Firestore, using local data instead
  // const { data: cuisines, isLoading: isLoadingCuisines, error: cuisinesError } = useQuery<Cuisine[], Error>({
  //   queryKey: ['cuisines'],
  //   queryFn: getCuisinesFromFirestore, // This function will be removed
  //   staleTime: 5 * 60 * 1000, // 5 minutes
  // });

  useEffect(() => {
    if (!loadingAuthState && !user) {
      toast({
        title: 'Access Denied',
        description: 'You must be logged in to add a restaurant.',
        variant: 'destructive',
      });
      router.replace('/');
    }
  }, [user, loadingAuthState, router, toast]);

  // useEffect(() => {
  //   if (cuisinesError) { // No longer applicable
  //     toast({
  //       title: 'Error Loading Cuisines',
  //       description: 'Could not load cuisine options. Please try refreshing.',
  //       variant: 'destructive',
  //     });
  //   }
  // }, [cuisinesError, toast]);

  const mutation = useMutation({
    mutationFn: (newRestaurantData: Omit<Restaurant, 'id' | 'imageUrl' | 'description'>) => addRestaurantToFirestore(newRestaurantData),
    onSuccess: (data) => {
      toast({
        title: 'Restaurant Added!',
        description: `${data.name} has been successfully added to the list.`,
      });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      form.reset();
      router.push('/');
    },
    onError: (error) => {
      toast({
        title: 'Error Adding Restaurant',
        description: error.message || 'Could not add the restaurant. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit: SubmitHandler<AddRestaurantFormData> = (data) => {
    if (!user) return;
    mutation.mutate(data);
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={"Select a cuisine"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cuisines && cuisines.length > 0 ? (
                          cuisines.map((cuisineItem) => (
                            <SelectItem key={cuisineItem.id} value={cuisineItem.id}>
                              {cuisineItem.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="disabled" disabled>No cuisines available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
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
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? (
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
