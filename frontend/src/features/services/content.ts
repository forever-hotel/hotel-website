export type Facility = {
  name: string;
  description: string;
  image?: string;
  illustrative?: boolean;
  imageAlt: string;
  symbol: string;
};

// Facility descriptions follow the supplied design. Hours are omitted until provided.
export const facilities: Facility[] = [
  {
    name: 'Spa & Wellness Centre',
    image: 'illustrative-spa.webp',
    illustrative: true,
    description:
      'Take a moment to unwind in a calm setting dedicated to rest and relaxation.',
    imageAlt: 'A peaceful spa interior',
    symbol: '✦',
  },
  {
    name: 'WON Restaurant',
    description:
      'Come together over thoughtfully prepared food in an inviting dining space.',
    image: 'forever-city-dining.webp',
    imageAlt: 'An elegant restaurant dining area',
    symbol: '◇',
  },
  {
    name: 'Meeting Rooms',
    image: 'illustrative-meeting.webp',
    illustrative: true,
    description:
      'A professional setting for conversations, presentations and bringing your team together.',
    imageAlt: 'An event space arranged for a gathering',
    symbol: '□',
  },
  {
    name: 'Infinity Swimming Pool',
    description:
      'Refresh, relax and take a break by the pool during your stay.',
    image: 'forever-city-pool.webp',
    imageAlt: 'An outdoor hotel swimming pool at dusk',
    symbol: '≈',
  },
  {
    name: 'State-of-the-Art Gym',
    image: 'illustrative-gym.webp',
    illustrative: true,
    description:
      'Make time for movement and keep your fitness routine part of your visit.',
    imageAlt: 'A fitness centre with exercise equipment',
    symbol: '△',
  },
  {
    name: 'Mini Function Hall',
    image: 'illustrative-function.webp',
    illustrative: true,
    description:
      'A welcoming space to bring people together for celebrations and special occasions.',
    imageAlt: 'A decorated function space',
    symbol: '◆',
  },
  {
    name: 'Karaoke Rooms',
    image: 'illustrative-karaoke.webp',
    illustrative: true,
    description:
      'Share a song and enjoy time together with friends and family.',
    imageAlt: 'Karaoke room',
    symbol: '♪',
  },
];
