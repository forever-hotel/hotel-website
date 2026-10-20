export const services: {
  title: string;
  subtitle: string;
  image?: string;
  illustrative?: boolean;
  alt: string;
}[] = [
  {
    title: 'Spa & Wellness',
    image: 'illustrative-spa.webp',
    illustrative: true,
    subtitle: 'Rejuvenate your senses',
    alt: 'A tranquil spa treatment space',
  },
  {
    title: 'WON Restaurant',
    subtitle: 'Exquisite dining experiences',
    image: 'forever-city-dining.webp',
    alt: 'An elegantly arranged restaurant',
  },
  {
    title: 'Fitness Centre',
    image: 'illustrative-gym.webp',
    illustrative: true,
    subtitle: 'Stay fit, stay you',
    alt: 'A fully equipped fitness centre',
  },
  {
    title: 'Swimming Pool',
    subtitle: 'Escape. Refresh. Repeat.',
    image: 'forever-city-pool.webp',
    alt: 'An outdoor swimming pool beside a hotel',
  },
];

// Presentation content from the supplied design, not bookable inventory.
export const rooms = [
  {
    title: 'Deluxe Room',
    image: 'forever-city-room-enhanced.webp',
    description:
      'Spacious, well-appointed room with modern amenities and elegant decor for the discerning traveller.',
    price: '$180',
  },
  {
    title: 'Junior Suite',
    image: 'forever-city-room-enhanced.webp',
    description:
      'A generous suite with a separate living area, premium linens, and panoramic city views.',
    price: '$280',
  },
  {
    title: 'Presidential Suite',
    image: 'forever-city-room-romantic.webp',
    description:
      'The pinnacle of luxury — a full floor suite with a private butler, dining room, and terrace.',
    price: '$580',
  },
];

export const questions = [
  {
    question: 'What is the check-in and check-out time?',
    answer:
      'Check-in is from 2:00 PM and check-out is by 12:00 PM noon. Early check-in and late check-out are available upon request, subject to availability.',
  },
  {
    question: 'Is breakfast included in the room rate?',
    answer:
      'Breakfast inclusion depends on your selected room package. Please confirm the inclusions when arranging your stay.',
  },
  {
    question: 'What is the cancellation policy?',
    answer:
      'Cancellation terms depend on the rate and package selected. Please review the conditions before confirming your reservation.',
  },
  {
    question: 'Do you offer airport transfers?',
    answer:
      'Please ask our guest services team about transfer options and availability when arranging your stay.',
  },
];
