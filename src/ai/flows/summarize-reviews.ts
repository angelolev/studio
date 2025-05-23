// SummarizeReviews.ts
'use server';

/**
 * @fileOverview Summarizes user reviews for a restaurant.
 *
 * - summarizeReviews - A function that summarizes reviews for a given restaurant.
 * - SummarizeReviewsInput - The input type for the summarizeReviews function.
 * - SummarizeReviewsOutput - The return type for the summarizeReviews function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeReviewsInputSchema = z.object({
  restaurantName: z.string().describe('The name of the restaurant.'),
  reviews: z.array(z.string()).describe('An array of user reviews for the restaurant.'),
});
export type SummarizeReviewsInput = z.infer<typeof SummarizeReviewsInputSchema>;

const SummarizeReviewsOutputSchema = z.object({
  summary: z.string().describe('A summarized sentiment of previous reviews.'),
});
export type SummarizeReviewsOutput = z.infer<typeof SummarizeReviewsOutputSchema>;

export async function summarizeReviews(input: SummarizeReviewsInput): Promise<SummarizeReviewsOutput> {
  return summarizeReviewsFlow(input);
}

const summarizeReviewsPrompt = ai.definePrompt({
  name: 'summarizeReviewsPrompt',
  input: {schema: SummarizeReviewsInputSchema},
  output: {schema: SummarizeReviewsOutputSchema},
  prompt: `Summarize the following user reviews for {{restaurantName}}. Extract keywords and common sentiments from each review, and display the most relevant sentiments to new users.\n\nReviews:\n{{#each reviews}}- {{{this}}}\n{{/each}}\n\nSummary: `,
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
