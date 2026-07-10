export type Testimonial = {
  id: string;
  quote: string;
  attribution: string;
  // TODO: Only publish testimonials with documented client permission.
};

/**
 * Intentionally empty until MA5 provides approved client quotes.
 * Do not invent testimonials.
 */
export const testimonials: Testimonial[] = [];
