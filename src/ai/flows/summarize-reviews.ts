
// SummarizeReviews.ts
'use server';

/**
 * @fileOverview Resume las opiniones de los usuarios para un restaurante.
 *
 * - summarizeReviews - Una función que resume las opiniones para un restaurante dado.
 * - SummarizeReviewsInput - El tipo de entrada para la función summarizeReviews.
 * - SummarizeReviewsOutput - El tipo de retorno para la función summarizeReviews.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeReviewsInputSchema = z.object({
  restaurantName: z.string().describe('El nombre del restaurante.'),
  reviews: z.array(z.string()).describe('Un arreglo de opiniones de usuarios para el restaurante.'),
});
export type SummarizeReviewsInput = z.infer<typeof SummarizeReviewsInputSchema>;

const SummarizeReviewsOutputSchema = z.object({
  summary: z.string().describe('Un sentimiento resumido de las opiniones anteriores, en español.'),
});
export type SummarizeReviewsOutput = z.infer<typeof SummarizeReviewsOutputSchema>;

export async function summarizeReviews(input: SummarizeReviewsInput): Promise<SummarizeReviewsOutput> {
  return summarizeReviewsFlow(input);
}

const summarizeReviewsPrompt = ai.definePrompt({
  name: 'summarizeReviewsPrompt',
  input: {schema: SummarizeReviewsInputSchema},
  output: {schema: SummarizeReviewsOutputSchema},
  prompt: `Resume las siguientes opiniones de usuarios para el restaurante "{{restaurantName}}" en español. Extrae palabras clave y sentimientos comunes de cada opinión, y muestra los sentimientos más relevantes para nuevos usuarios. El resumen debe estar en español.\n\nOpiniones:\n{{#each reviews}}- {{{this}}}\n{{/each}}\n\nResumen en español: `,
});

const summarizeReviewsFlow = ai.defineFlow(
  {
    name: 'summarizeReviewsFlow',
    inputSchema: SummarizeReviewsInputSchema,
    outputSchema: SummarizeReviewsOutputSchema,
  },
  async input => {
    const {output} = await summarizeReviewsPrompt(input);
    return output!;
  }
);
