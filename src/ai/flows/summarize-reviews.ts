
// SummarizeReviews.ts
'use server';

/**
 * @fileOverview Resume las opiniones de los usuarios para un restaurante de forma conversacional.
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
  summary: z.string().describe('Una frase corta y directa que resuma el sentimiento general de las opiniones sobre el restaurante, en español.'),
});
export type SummarizeReviewsOutput = z.infer<typeof SummarizeReviewsOutputSchema>;

export async function summarizeReviews(input: SummarizeReviewsInput): Promise<SummarizeReviewsOutput> {
  return summarizeReviewsFlow(input);
}

const summarizeReviewsPrompt = ai.definePrompt({
  name: 'summarizeReviewsPrompt',
  input: {schema: SummarizeReviewsInputSchema},
  output: {schema: SummarizeReviewsOutputSchema},
  prompt: `Para el restaurante "{{restaurantName}}", analiza las siguientes opiniones de clientes. Tu tarea es generar una **única frase corta y directa** en español que capture la esencia de lo que la gente dice. Debe ser muy concisa.

**Importante:** Si alguna opinión tiene palabras raras, inventadas, que claramente no son del español y no se entienden en el contexto, o si la opinión entera parece no tener sentido o ser spam, por favor ignora esas partes o incluso la opinión completa. Queremos un resumen útil y claro, basado en comentarios entendibles y genuinos en español.

Opiniones:
{{#each reviews}}
- {{{this}}}
{{/each}}

En una frase corta y directa en español, ¿qué dice la gente sobre "{{restaurantName}}"?`,
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

