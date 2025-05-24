
import type { Restaurant } from '@/types';

export const restaurants: Restaurant[] = [
  {
    id: '1',
    name: 'El pollo Pechugon',
    imageUrl: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/12/40/f2/e1/pollo-pechugon.jpg?w=500&h=-1&s=1',
    description: 'Experimenta la mejor gastronomía con nuestro exquisito menú de temporada y una extensa carta de vinos.',
    cuisine: 'Pollo a la brasa',
    address: 'Avenida Bolognesi 372',
  },
  {
    id: '2',
    name: 'La Pasta',
    imageUrl: 'https://placehold.co/600x400.png',
    description: 'Auténticos platos de pasta italiana hechos con amor y los ingredientes más frescos. ¡Buen provecho!',
    cuisine: 'Italiano',
    address: 'Av. Pasta 456, Pequeña Italia',
  },
  {
    id: '3',
    name: 'Sushi Central',
    imageUrl: 'https://placehold.co/600x400.png',
    description: 'Sushi fresco y delicioso, sashimi y especialidades japonesas. Omakase disponible.',
    cuisine: 'Japonés',
    address: 'Calle Sakura 789, Barrio Japonés',
  },
  {
    id: '4',
    name: 'Burger Barn',
    imageUrl: 'https://placehold.co/600x400.png',
    description: 'Hamburguesas jugosas, papas fritas crujientes y batidos cremosos. Una experiencia americana clásica.',
    cuisine: 'Americana',
    address: 'Bulevar Burger 101, Centro',
  },
  {
    id: '5',
    name: 'Taco Fiesta',
    imageUrl: 'https://placehold.co/600x400.png',
    description: 'Comida callejera mexicana vibrante y sabrosa. ¡Tacos, burritos, quesadillas y más!',
    cuisine: 'Mexicana',
    address: 'Vía Sombrero 202, Ciudad Fiesta',
  },
  {
    id: '6',
    name: 'Casa de Curry',
    imageUrl: 'https://placehold.co/600x400.png',
    description: 'Curries indios aromáticos y picantes, especialidades tandoori y naan recién horneado.',
    cuisine: 'India',
    address: 'Ruta de las Especias 303, Distrito Curry',
  },
   {
    id: '7',
    name: 'Delicia Vegetal',
    imageUrl: 'https://placehold.co/600x400.png',
    description: 'Platos vegetarianos y veganos creativos y deliciosos que deleitarán tu paladar.',
    cuisine: 'Vegetariana/Vegana',
    address: 'Calle Verde 404, Villa Salud',
  },
  {
    id: '8',
    name: 'Rincón Marino',
    imageUrl: 'https://placehold.co/600x400.png',
    description: 'La pesca más fresca del océano, expertamente preparada. Ostras, pescado a la parrilla y más.',
    cuisine: 'Mariscos',
    address: 'Av. Océano 505, Ciudad Puerto',
  }
];
