-- Enums métier
CREATE TYPE user_role AS ENUM ('member', 'organizer', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE activity_category AS ENUM (
  'sport', 'culture', 'gastronomie', 'nature',
  'bien_etre', 'art', 'musique', 'autre'
);
CREATE TYPE activity_status AS ENUM ('pending', 'published', 'rejected', 'archived');
