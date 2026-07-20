export type Service = {
  slug: string;
  title: string;
  summary: string;
  href: string;
  bookingType?: string;
  imageSrc: string;
  imageAlt: string;
};

export const services: Service[] = [
  {
    slug: "semi-private-training",
    title: "Semi-Private Training",
    summary:
      "Customized coaching built from your assessment results and goals, with certified coaches focused on your progress.",
    href: "/training",
    bookingType: "assessment",
    imageSrc: "/images/services/semi-private-training.png",
    imageAlt: "Coach guiding a client through a barbell lift at MA5 Performance",
  },
  {
    slug: "small-group-training",
    title: "Small Group Training",
    summary:
      "Shared workouts with a max of 10 people for variety, accountability, and more form coaching.",
    href: "/training",
    bookingType: "small-group",
    imageSrc: "/images/services/training.jpg",
    imageAlt: "Small group training at MA5 Performance",
  },
  {
    slug: "sports-performance",
    title: "Sports Performance",
    summary:
      "Sport-specific training to improve speed, agility, movement patterns, athleticism, and injury resilience.",
    href: "/sports-performance",
    bookingType: "sports-performance",
    imageSrc: "/images/services/sports-performance.png",
    imageAlt: "Athlete balancing in a squat on a stability ball during sports performance training",
  },
  {
    slug: "open-gym",
    title: "Private Open Gym",
    summary:
      "24/7 key-fob access, programmed workouts in the MA5 app, and essential strength and cardio equipment.",
    href: "/open-gym",
    bookingType: "open-gym",
    imageSrc: "/images/facility/open-gym.jpg",
    imageAlt: "Private open gym at MA5 Performance",
  },
  {
    slug: "nutrition",
    title: "Nutrition Coaching",
    summary:
      "Sustainable meal planning built on moderation and portion control — without cutting out the foods you love.",
    href: "/nutrition",
    imageSrc: "/images/services/nutrition.png",
    imageAlt: "Colorful balanced meal bowls with salmon, chicken, and plant-based options",
  },
  {
    slug: "recovery",
    title: "InBody and Infrared Sauna",
    summary:
      "Track body composition with InBody scans and recover in a private infrared sauna room.",
    href: "/services/infrared-sauna",
    bookingType: "sauna",
    imageSrc: "/images/services/inbody.jpg",
    imageAlt: "InBody scan and recovery services at MA5",
  },
];

export const fitnessPillars = [
  {
    title: "Muscular Strength",
    description:
      "Build the force you need for everyday life and athletic performance.",
  },
  {
    title: "Muscular Endurance",
    description:
      "Train to sustain effort longer with better control and capacity.",
  },
  {
    title: "Flexibility",
    description:
      "Move freely and reduce restriction so training stays sustainable.",
  },
  {
    title: "Cardiovascular Fitness",
    description: "Improve heart health, stamina, and work capacity.",
  },
  {
    title: "Body Composition",
    description:
      "Track meaningful change with coaching and objective measurement.",
  },
] as const;

export const coachCopy = {
  headline: "Meet Your Coach",
  name: "Mike Anderson",
  title:
    "Founder & CEO of MA5 Performance | NASM Certified Personal Trainer & Nutrition Coach",
  body: [
    "I help busy adults, athletes, and individuals of all fitness levels build strength, lose body fat, improve performance, and create healthier lifestyles—without spending hours in the gym or following restrictive diets.",
    "A Sports Management graduate from Saint Joseph's College, I founded MA5 Performance with a mission to provide expert coaching, accountability, and a supportive community that helps people achieve lasting results.",
    "As a NASM Certified Personal Trainer and NASM Certified Nutrition Coach, my coaching philosophy is centered around functional strength training while developing all five key components of fitness: muscular strength, muscular endurance, cardiovascular endurance, flexibility, and body composition. I believe lasting results come from consistent, individualized programming that fits your lifestyle—not one-size-fits-all workouts or quick fixes.",
    "Whether your goal is to lose weight, build muscle, improve athletic performance, or simply become the healthiest version of yourself, my mission is to help you move better, perform better, and build confidence that extends far beyond the gym.",
  ],
  imageSrc: "/images/team/trainer.JPG",
  imageAlt: "Mike Anderson, founder of MA5 Performance",
} as const;

export const communityCopy = {
  headline: "More Than a Gym. A Community.",
  body: "At MA5 Performance, we believe lasting results are built through more than great training—they're built through meaningful relationships. From workouts and competitions to social events and member appreciation gatherings, we're committed to creating an environment where everyone feels welcomed, supported, and challenged to become their best.",
  imageSrc: "/images/facility/community.png",
  imageAlt: "MA5 Performance members celebrating together at the gym",
} as const;

export const aboutCopy = {
  headline: "Knowledgeable Training Expertise",
  body: [
    "Adapting new fitness and nutrition habits can feel like a roller coaster. MA5 Performance helps you change your view of fitness so it becomes part of who you are and how you live.",
    "Our goal is to deliver a well-balanced workout routine that improves physical performance, supports mental health, and enhances overall quality of life. To do that, we focus on the five key components of fitness and how excelling in each maximizes overall performance.",
    "Let's start a lifestyle change built for longevity.",
  ],
} as const;

export const trainingCopy = {
  semiPrivate: {
    title: "Semi-Private Training",
    points: [
      "Customized one-on-one training for all fitness levels",
      "Programs based on your fitness assessment results and goals",
      "Certified coaches committed to setting you up for success",
    ],
  },
  smallGroup: {
    title: "Small Group Training",
    intro:
      "If you want variety and the camaraderie of others, small-group training may be the right fit.",
    points: [
      "Focus on permanently increasing metabolic rate",
      "Circuit-style training to improve strength and conditioning",
      "Emphasis on proper technique",
      "Accountability and fun",
      "Classes capped at 10 people for more personal coaching",
    ],
  },
  assessment: {
    title: "Start with an Assessment",
    body: "We start with an InBody scan plus body measurements, weight, height, cardiovascular and muscular strength/endurance testing, and observation of postural deviations, muscular weaknesses, tightness, imbalances, and other faulty movement patterns. That baseline helps us design a customized program for your needs.",
  },
} as const;

export const sportsCopy = {
  intro:
    "Our Sports Performance program starts with a comprehensive movement analysis to identify mobility limitations, flexibility deficits, muscle imbalances, and faulty movement patterns that can hinder athletic development. Using those findings, we create individualized, sport-specific training programs focused on improving mobility, flexibility, strength, speed, agility, power, and overall athletic performance. By building a solid movement foundation first, athletes can maximize performance, reduce injury risk, and gain a competitive edge both on and off the field.",
  sections: [
    {
      title: "Mobility / Flexibility",
      body: "Mobility and flexibility are essential because they maximize athletic potential and prevent injury. Flexibility (muscle length) allows joints to achieve a full range of motion while mobility (strength and control) enables athletes to use that range dynamically under external load. Together, they improve movement efficiency, prevent compensatory injuries, and promote faster recovery.",
    },
    {
      title: "Speed and Agility",
      body: "Speed and agility work improves acceleration, deceleration, foot speed, quickness, and change of direction so athletes can move faster and raise their game.",
    },
    {
      title: "Strength and Core Development",
      body: "Core stability and strength help athletes control body position, generate power, and transfer force through the kinetic chain — especially in rotational movements required across nearly every sport.",
    },
    {
      title: "Sport-Specific Training",
      body: "Sport-specific programs use muscle-memory drills and conditioning formats designed around the demands of each sport, helping athletes respond to and recover from competition more effectively.",
    },
  ],
} as const;

export const openGymCopy = {
  intro:
    "Tired of overcrowded gyms? MA5 offers private open-gym access designed for focused training.",
  perks: [
    "24/7 key-fob access",
    "Private open-gym time around scheduled training",
    "Access to the MA5 app with programmed open-gym workouts, progress tracking, and member chat",
    "Essential equipment including free weights, full-body machines, and cardio machines",
  ],
  images: [
    {
      src: "/images/facility/open-gym-machines.png",
      alt: "Selectorized machines and cardio equipment in the MA5 gym",
    },
    {
      src: "/images/facility/open-gym-turf.png",
      alt: "Strength racks, turf lane, and functional training area at MA5",
    },
  ],
} as const;

export const nutritionCopy = {
  intro:
    "Nutrition is pivotal to health and fitness results. Our main objective is sustainability — built on moderation and portion control — so you can eat foods you enjoy, avoid feeling restricted, and still make progress.",
  points: [
    "Individualized meal plans based on personal goals",
    "Guidance and accountability when nutrition feels overwhelming",
    "A balanced approach that supports health, wellness, and longevity",
  ],
} as const;

export const inbodyPricing = [
  {
    name: "InBody Scan Only",
    price: "$25",
    description:
      "Measure body-fat percentage, basal metabolic rate, weight, water retention, and muscle mass in your arms, legs, and trunk so you can plan from real biometrics.",
  },
  {
    name: "InBody Scan + Results Consultation",
    price: "$65",
    description:
      "After your scan, we review your results in depth and lay a foundation for next steps based on your goals.",
  },
  {
    name: "InBody Scan + Nutrition / Goal Planning",
    price: "$100",
    description:
      "Scan review plus personalized goal planning and nutrition guidance.",
  },
] as const;

export const saunaCopy = {
  headline: "Private Infrared Sauna Room",
  tagline: "Relax, Restore, Renew",
  intro:
    "Infrared saunas use light waves (far, mid, or near infrared) that penetrate the skin to heat the body from the inside out, allowing effective sessions at lower, more comfortable temperatures. Traditional saunas heat the air around you first, which usually requires much higher temperatures to feel similar effects.",
  video: {
    // From https://ma5performance.com/infrared-suana
    embedUrl:
      "https://player.vimeo.com/video/1087849433?badge=0&byline=0&h=407c3556ce&portrait=0&title=0&autoplay=0&loop=0&muted=0&controls=1",
    title: "MA5 private infrared sauna room",
  },
  benefits: [
    {
      title: "Detoxification",
      body: "Infrared heat supports sweating and circulation as part of a recovery-focused session, helping you feel restored after training.",
      imageSrc: "/images/services/sauna-detox.png",
      imageAlt: "Detoxification and recovery benefits of infrared sauna",
    },
    {
      title: "Heart Health Support",
      body: "Infrared sauna sessions can support circulation and feel similar to moderate exercise for many people. Regular use is often included in recovery routines focused on heart health and overall wellness.",
      imageSrc: "/images/services/sauna-heart.webp",
      imageAlt: "Heart health support from infrared sauna use",
    },
    {
      title: "Stress Management",
      body: "Infrared sauna time helps calm the nervous system, support relaxation, and encourage better recovery habits that can lower everyday stress load.",
      imageSrc: "/images/services/sauna-stress.jpeg",
      imageAlt: "Stress management and relaxation in the infrared sauna",
    },
    {
      title: "Recovery",
      body: "Infrared rays warm tissues, muscles, and joints and promote increased blood flow, which can help with comfort, inflammation support, and post-training recovery.",
      imageSrc: "/images/services/sauna-recovery.jpeg",
      imageAlt: "Muscle and joint recovery with infrared heat",
    },
    {
      title: "Weight Control Support",
      body: "Sessions can raise heart rate and metabolism in a way comparable to light-to-moderate cardio. A 30–45 minute infrared sauna session may burn roughly 200–600 calories depending on intensity and body weight — similar to a brisk walk or light jog.",
      imageSrc: "/images/services/sauna-weight.png",
      imageAlt: "Stepping onto a scale as part of weight and wellness tracking",
    },
    {
      title: "Immune Function Support",
      body: "Raising core body temperature can support circulation and recovery-oriented immune response. Many clients use infrared sauna as part of a consistent wellness routine.",
      imageSrc: "/images/services/sauna-immunity.png",
      imageAlt: "Illustration representing immune system support",
    },
  ],
} as const;
