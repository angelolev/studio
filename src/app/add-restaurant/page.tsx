
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
import type { Restaurant } from '@/types';
import { addRestaurantToFirestore } from '@/lib/firestoreService';
import { cuisines } from '@/data/cuisines'; 
import { Loader2 } from 'lucide-react';

const addRestaurantSchema = z.object({
  name: z.string().min(2, { message: 'El nombre del restaurante debe tener al menos 2 caracteres.' }),
  cuisine: z.string().min(1, { message: 'Por favor, selecciona una cocina/categoría.' }),
  address: z.string().min(5, { message: 'La dirección debe tener al menos 5 caracteres.' }),
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

  useEffect(() => {
    if (!loadingAuthState && !user) {
      toast({
        title: 'Acceso Denegado',
        description: 'Debes iniciar sesión para agregar un restaurante.',
        variant: 'destructive',
      });
      router.replace('/');
    }
  }, [user, loadingAuthState, router, toast]);

  const mutation = useMutation({
    mutationFn: (newRestaurantData: Omit<Restaurant, 'id' | 'imageUrl' | 'description'>) => addRestaurantToFirestore(newRestaurantData),
    onSuccess: (data) => {
      toast({
        title: '¡Restaurante Agregado!',
        description: `${data.name} ha sido agregado exitosamente a la lista.`,
      });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      form.reset();
      router.push('/');
    },
    onError: (error) => {
      toast({
        title: 'Error al Agregar Restaurante',
        description: error.message || 'No se pudo agregar el restaurante. Por favor, intenta de nuevo.',
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
        <p className="ml-3 text-lg">Cargando estado de autenticación...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <p className="text-lg text-destructive">Acceso Denegado.</p>
        <p className="text-muted-foreground">Por favor, inicia sesión para agregar un restaurante.</p>
        <Button onClick={() => router.push('/')} className="mt-4">Ir a la Página Principal</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Agregar un Nuevo Restaurante</CardTitle>
          <CardDescription>
            Completa los detalles a continuación para agregar un nuevo restaurante a nuestra lista.
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
                    <FormLabel>Nombre del Restaurante</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: El Lugar Gourmet" {...field} />
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
                    <FormLabel>Cocina / Categoría</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={"Selecciona una cocina"} />
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
                          <SelectItem value="disabled" disabled>No hay cocinas disponibles</SelectItem>
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
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Calle Principal 123, Cualquier Ciudad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  'Agregar Restaurante'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
