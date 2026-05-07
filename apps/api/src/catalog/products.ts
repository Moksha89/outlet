export type CatalogProduct = {
  product_name: string;
  brand: string;
  category: string;
  size_ml: number;
  bottle_image_url: string | null;
};

export const catalogProducts: CatalogProduct[] = [
  { product_name: 'Budweiser Beer', brand: 'Budweiser', category: 'Beer', size_ml: 330, bottle_image_url: '/uploads/catalog/budweiser-beer.svg' },
  { product_name: 'Corona Extra Beer', brand: 'Corona Extra', category: 'Beer', size_ml: 330, bottle_image_url: '/uploads/catalog/corona-extra-beer.svg' },
  { product_name: 'Kingfisher Beer', brand: 'Kingfisher', category: 'Beer', size_ml: 650, bottle_image_url: '/uploads/catalog/kingfisher-beer.svg' },
  { product_name: 'Heineken Beer', brand: 'Heineken', category: 'Beer', size_ml: 330, bottle_image_url: '/uploads/catalog/heineken-beer.svg' },
  { product_name: 'Ice Beer', brand: 'Ice', category: 'Beer', size_ml: 650, bottle_image_url: '/uploads/catalog/ice-beer.svg' },
  { product_name: 'Bacardi Breezer', brand: 'Bacardi Breezer', category: 'Ready To Drink', size_ml: 275, bottle_image_url: '/uploads/catalog/bacardi-breezer.svg' },
  { product_name: 'Jack Daniel’s Tennessee Whiskey', brand: 'Jack Daniel’s', category: 'Whiskey', size_ml: 750, bottle_image_url: '/uploads/catalog/jack-daniels-tennessee-whiskey.svg' },
  { product_name: 'Baileys Irish Cream', brand: 'Baileys', category: 'Liqueur', size_ml: 750, bottle_image_url: '/uploads/catalog/baileys-irish-cream.svg' },
  { product_name: 'Jameson Irish Whiskey', brand: 'Jameson', category: 'Whiskey', size_ml: 750, bottle_image_url: '/uploads/catalog/jameson-irish-whiskey.svg' },
  { product_name: 'Absolut Citron Vodka', brand: 'Absolut', category: 'Vodka', size_ml: 750, bottle_image_url: '/uploads/catalog/absolut-citron-vodka.svg' },
  { product_name: 'Bacardi White Rum', brand: 'Bacardi', category: 'Rum', size_ml: 750, bottle_image_url: '/uploads/catalog/bacardi-white-rum.svg' },
  { product_name: 'Old Monk Rum', brand: 'Old Monk', category: 'Rum', size_ml: 750, bottle_image_url: '/uploads/catalog/old-monk-rum.svg' },
  { product_name: 'Ballantine’s Finest Scotch Whisky', brand: 'Ballantine’s', category: 'Whisky', size_ml: 750, bottle_image_url: '/uploads/catalog/ballantines-finest-scotch-whisky.svg' },
  { product_name: 'Absolut Vodka', brand: 'Absolut', category: 'Vodka', size_ml: 750, bottle_image_url: '/uploads/catalog/absolut-vodka.svg' },
  { product_name: 'Appleton Estate 12 Year Old Rum', brand: 'Appleton Estate', category: 'Rum', size_ml: 750, bottle_image_url: '/uploads/catalog/appleton-estate-12-year-old-rum.svg' },
  { product_name: 'Chivas Regal 12 Year Old Scotch Whisky', brand: 'Chivas Regal', category: 'Whisky', size_ml: 750, bottle_image_url: '/uploads/catalog/chivas-regal-12-year-old-scotch-whisky.svg' },
  { product_name: 'Chivas Regal 18 Year Old Scotch Whisky', brand: 'Chivas Regal', category: 'Whisky', size_ml: 750, bottle_image_url: '/uploads/catalog/chivas-regal-18-year-old-scotch-whisky.svg' },
  { product_name: 'Johnnie Walker Black Label Scotch Whisky', brand: 'Johnnie Walker', category: 'Whisky', size_ml: 750, bottle_image_url: '/uploads/catalog/johnnie-walker-black-label-scotch-whisky.svg' },
  { product_name: 'Johnnie Walker Red Label Scotch Whisky', brand: 'Johnnie Walker', category: 'Whisky', size_ml: 750, bottle_image_url: '/uploads/catalog/johnnie-walker-red-label-scotch-whisky.svg' },
  { product_name: 'Johnnie Walker Double Black Scotch Whisky', brand: 'Johnnie Walker', category: 'Whisky', size_ml: 750, bottle_image_url: '/uploads/catalog/johnnie-walker-double-black-scotch-whisky.svg' },
  { product_name: 'Kahlúa Coffee Liqueur', brand: 'Kahlúa', category: 'Liqueur', size_ml: 750, bottle_image_url: '/uploads/catalog/kahlua-coffee-liqueur.svg' },
  { product_name: 'Bombay Sapphire Gin', brand: 'Bombay Sapphire', category: 'Gin', size_ml: 750, bottle_image_url: '/uploads/catalog/bombay-sapphire-gin.svg' },
  { product_name: 'Jose Cuervo Especial Silver Tequila', brand: 'Jose Cuervo', category: 'Tequila', size_ml: 750, bottle_image_url: '/uploads/catalog/jose-cuervo-especial-silver-tequila.svg' },
  { product_name: 'Glenfiddich Single Malt Scotch Whisky', brand: 'Glenfiddich', category: 'Whisky', size_ml: 750, bottle_image_url: '/uploads/catalog/glenfiddich-single-malt-scotch-whisky.svg' },
  { product_name: 'Nemiroff Vodka', brand: 'Nemiroff', category: 'Vodka', size_ml: 750, bottle_image_url: '/uploads/catalog/nemiroff-vodka.svg' },
  { product_name: 'The Glenlivet Single Malt Scotch Whisky', brand: 'The Glenlivet', category: 'Whisky', size_ml: 750, bottle_image_url: '/uploads/catalog/the-glenlivet-single-malt-scotch-whisky.svg' },
  { product_name: 'Patrón Silver Tequila', brand: 'Patrón', category: 'Tequila', size_ml: 750, bottle_image_url: '/uploads/catalog/patron-silver-tequila.svg' },
  { product_name: 'Jacob’s Creek Red Wine', brand: 'Jacob’s Creek', category: 'Wine', size_ml: 750, bottle_image_url: '/uploads/catalog/jacobs-creek-red-wine.svg' },
  { product_name: 'Red Wine', brand: 'House Red Wine', category: 'Wine', size_ml: 750, bottle_image_url: '/uploads/catalog/red-wine.svg' },
  { product_name: 'White Wine', brand: 'House White Wine', category: 'Wine', size_ml: 750, bottle_image_url: '/uploads/catalog/white-wine.svg' },
  { product_name: 'Jägermeister Herbal Liqueur', brand: 'Jägermeister', category: 'Liqueur', size_ml: 700, bottle_image_url: '/uploads/catalog/jagermeister-herbal-liqueur.svg' },
  { product_name: 'J&B Rare Scotch Whisky', brand: 'J&B', category: 'Whisky', size_ml: 750, bottle_image_url: '/uploads/catalog/jb-rare-scotch-whisky.svg' },
  { product_name: 'St-Rémy VSOP Brandy', brand: 'St-Rémy', category: 'Brandy', size_ml: 750, bottle_image_url: '/uploads/catalog/st-remy-vsop-brandy.svg' },
  { product_name: 'Monkey Shoulder Blended Malt Scotch Whisky', brand: 'Monkey Shoulder', category: 'Whisky', size_ml: 750, bottle_image_url: '/uploads/catalog/monkey-shoulder-blended-malt-scotch-whisky.svg' },
  { product_name: 'Hennessy VSOP Cognac', brand: 'Hennessy', category: 'Cognac', size_ml: 750, bottle_image_url: '/uploads/catalog/hennessy-vsop-cognac.svg' },
  { product_name: 'Magic Moments Vodka', brand: 'Magic Moments', category: 'Vodka', size_ml: 750, bottle_image_url: '/uploads/catalog/magic-moments-vodka.svg' },
  { product_name: 'Beefeater London Dry Gin', brand: 'Beefeater', category: 'Gin', size_ml: 750, bottle_image_url: '/uploads/catalog/beefeater-london-dry-gin.svg' },
  { product_name: 'Indri Single Malt Indian Whisky', brand: 'Indri', category: 'Whisky', size_ml: 750, bottle_image_url: '/uploads/catalog/indri-single-malt-indian-whisky.svg' },
];
