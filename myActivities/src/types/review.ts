export type Review = {
  id: string;
  rating: number;
  createdAt: string;
  updatedAt: string | null;
  author: {
    id: string;
    pseudo: string;
    avatarUrl: string | null;
  };
};

export type ReviewListResult = {
  avgRating: number | null;
  reviewCount: number;
  data: Review[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};
