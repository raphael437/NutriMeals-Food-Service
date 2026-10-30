// One entry per gallery card, in the order they appear left to right.
// Each card has its own `src` line: paste that card's image there.
//
// src can be either:
//   - a Cloudinary URL:  'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/molokhia'
//   - a file in /public: '/images/gallery/molokhia.jpg'  (the file lives at public/images/gallery/molokhia.jpg)
// Leave src as '' and the card shows an empty photo area.
//
// `caption` is shown under the photo and is also the image's alt text,
// so describe what the photo actually shows.

export type GalleryItem = {
  caption: string;
  src: string;
};

export const GALLERY_ITEMS: GalleryItem[] = [
  // Card 1
  { caption: 'teramesu', src: 'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/istockphoto-1198045232-612x612' },

  // Card 2
  { caption: 'Mixed Grill', src: 'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/group-joyful-friends-talking-drinking-wine-dining-restaurant-young-multiethnic-table-299737266' },

  // Card 3
  { caption: 'pasta', src: 'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/1000_F_183733325_BhcLmLcvH9etXSehdtfpSPLbSX9qZiBa' },

  // Card 4
  {
    caption: 'pizza',
    src: 'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/marketing-to-individuals-is-a-thing-of-the-past-harness-brand-communities-like-gymshark-and-abel-cole-inline-0',
  },

  // Card 5
  { caption: 'meat', src: 'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/1000_F_145799721_y8u6KagllmGDoomHpNKLI43Pg3Yok5OY' },

  // Card 6
  { caption: 'chicken', src: 'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/istockphoto-1724101626-612x612' },

  // Card 7
  { caption: 'Lemon Mint', src: 'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/OIP_3' },
];