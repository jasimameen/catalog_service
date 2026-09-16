export type StockPhoto = {
  id: string;
  url: string;
  thumb: string;
  label: string;
  keywords: string[];
};

/** Curated Unsplash CDN photos — no API key. Attribution appreciated. */
export const STOCK_PHOTOS: StockPhoto[] = [
  {
    id: "salad",
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
    thumb: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=60",
    label: "Salad",
    keywords: ["salad", "food", "healthy", "bowl", "lunch"],
  },
  {
    id: "pizza",
    url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80",
    thumb: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=200&q=60",
    label: "Pizza",
    keywords: ["pizza", "food", "dinner", "italian"],
  },
  {
    id: "coffee",
    url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
    thumb: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=200&q=60",
    label: "Coffee",
    keywords: ["coffee", "cafe", "drink", "tea", "latte"],
  },
  {
    id: "drink",
    url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
    thumb: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=200&q=60",
    label: "Drinks",
    keywords: ["drink", "cocktail", "juice", "tea", "beverage"],
  },
  {
    id: "plated",
    url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
    thumb: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=60",
    label: "Plated food",
    keywords: ["food", "dinner", "restaurant", "meal", "plate"],
  },
  {
    id: "bowl",
    url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80",
    thumb: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=200&q=60",
    label: "Bowl",
    keywords: ["bowl", "food", "healthy", "salad", "lunch"],
  },
  {
    id: "bakery",
    url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
    thumb: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&q=60",
    label: "Bakery",
    keywords: ["bread", "bakery", "pastry", "food"],
  },
  {
    id: "product",
    url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    thumb: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=60",
    label: "Product",
    keywords: ["product", "goods", "retail", "pack"],
  },
];

export function pickPlaceholder(keyword: string, index: number): string {
  const key = keyword.trim().toLowerCase();
  const pool = key
    ? STOCK_PHOTOS.filter((photo) =>
        photo.keywords.some((word) => word.includes(key) || key.includes(word)),
      )
    : STOCK_PHOTOS;
  const list = pool.length > 0 ? pool : STOCK_PHOTOS;
  return list[index % list.length]!.url;
}

export function isStockPhotoUrl(url: string): boolean {
  const trimmed = url.trim();
  return STOCK_PHOTOS.some((photo) => trimmed.startsWith(photo.url.split("?")[0]!));
}
