export type Faq = {
  question: string;
  answer: string;
};

export const bookingFaqs: Faq[] = [
  {
    question: "What should I book first?",
    answer:
      "Most new clients start with a fitness assessment. MA5 begins with an InBody scan plus measurements and movement screening to build your program.",
  },
  {
    question: "Do I need an account to book?",
    answer:
      "Yes. Scheduling is powered by Mindbody (MA5 Fitness LLC). New clients can create an account during booking; existing clients can sign in with their current credentials.",
  },
  {
    question: "Where is MA5 located?",
    answer: "8441 Kingston St, Avon, IN 46123.",
  },
  {
    question: "Is open gym really 24/7?",
    answer:
      "Members with open-gym access receive 24/7 key-fob entry, plus access to programmed workouts in the MA5 app.",
  },
  {
    question: "What if the calendar does not load?",
    answer:
      "Use the secure Mindbody booking fallback link on this page, or email ma.fitness99@gmail.com and MA5 will help you schedule.",
  },
];
