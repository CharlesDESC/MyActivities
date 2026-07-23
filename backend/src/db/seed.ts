import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { hashPassword } from '../lib/password';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ORGANIZER = {
  email: 'demo.organisateur@myactivities.app',
  pseudo: 'LyonExplore',
  password: 'Organizer1!',
};

type SeedActivity = {
  name: string;
  category: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  priceMin: number;
  priceMax: number;
  openingHours: Record<string, string>;
  pmr?: boolean;
  stroller?: boolean;
  websiteUrl?: string;
};

const ACTIVITIES: SeedActivity[] = [
  {
    name: 'Escalade en salle — ClimbUp Lyon',
    category: 'sport',
    description:
      "Salle d'escalade de bloc et de voie au cœur de Lyon : 1 500 m² de murs, espaces débutants et zones expertes, prêt de matériel inclus. Encadrement possible par des moniteurs diplômés pour une première séance en toute confiance.",
    address: '12 Rue de la République, 69001 Lyon',
    latitude: 45.7672,
    longitude: 4.8358,
    priceMin: 8,
    priceMax: 15,
    openingHours: {
      lundi: '10:00 – 23:00',
      mardi: '10:00 – 23:00',
      mercredi: '10:00 – 23:00',
      jeudi: '10:00 – 23:00',
      vendredi: '10:00 – 23:00',
      samedi: '09:00 – 20:00',
      dimanche: '09:00 – 20:00',
    },
    pmr: true,
    websiteUrl: 'https://climb-up.fr',
  },
  {
    name: 'Musée des Beaux-Arts de Lyon',
    category: 'culture',
    description:
      "L'un des plus grands musées de France, installé dans une ancienne abbaye bénédictine sur la place des Terreaux. Peintures, sculptures et antiquités de l'Égypte ancienne à l'art moderne. Gratuit pour les moins de 18 ans.",
    address: '20 Place des Terreaux, 69001 Lyon',
    latitude: 45.767,
    longitude: 4.8336,
    priceMin: 0,
    priceMax: 8,
    openingHours: {
      lundi: '10:00 – 18:00',
      mercredi: '10:00 – 18:00',
      jeudi: '10:00 – 18:00',
      vendredi: '10:30 – 18:00',
      samedi: '10:00 – 18:00',
      dimanche: '10:00 – 18:00',
    },
    pmr: true,
    stroller: true,
    websiteUrl: 'https://www.mba-lyon.fr',
  },
  {
    name: 'Atelier poterie — Terres Vives',
    category: 'art',
    description:
      "Initiation au tournage et au modelage dans un atelier chaleureux des pentes de la Croix-Rousse. Terre, outils et cuisson compris ; repartez avec votre création. Petits groupes de 6 personnes maximum, débutants bienvenus.",
    address: '5 Rue Hippolyte Flandrin, 69001 Lyon',
    latitude: 45.7684,
    longitude: 4.832,
    priceMin: 25,
    priceMax: 35,
    openingHours: {
      mercredi: '14:00 – 19:00',
      jeudi: '14:00 – 19:00',
      vendredi: '14:00 – 21:00',
      samedi: '10:00 – 18:00',
    },
    stroller: true,
  },
  {
    name: 'Randonnée Monts du Lyonnais',
    category: 'nature',
    description:
      "Boucle de 14 km au départ de Saint-Martin-en-Haut, entre forêts, crêtes et points de vue sur la vallée du Rhône et les Alpes par temps clair. Balisage jaune, dénivelé 450 m, environ 4 h 30 de marche. Accès libre toute l'année.",
    address: 'Départ depuis Saint-Martin-en-Haut',
    latitude: 45.658,
    longitude: 4.561,
    priceMin: 0,
    priceMax: 0,
    openingHours: {
      lundi: 'Accès libre',
      mardi: 'Accès libre',
      mercredi: 'Accès libre',
      jeudi: 'Accès libre',
      vendredi: 'Accès libre',
      samedi: 'Accès libre',
      dimanche: 'Accès libre',
    },
  },
  {
    name: 'Yoga flow — Studio Zenith',
    category: 'bien_etre',
    description:
      'Cours de vinyasa flow tous niveaux dans un studio lumineux du quartier Ainay. Tapis fournis, vestiaires avec douches. Séance découverte à 12 €, cartes de 10 séances disponibles. Réservation en ligne conseillée.',
    address: '8 Rue Sainte-Hélène, 69002 Lyon',
    latitude: 45.7524,
    longitude: 4.829,
    priceMin: 12,
    priceMax: 18,
    openingHours: {
      lundi: '07:30 – 20:30',
      mardi: '07:30 – 20:30',
      mercredi: '12:00 – 20:30',
      jeudi: '07:30 – 20:30',
      vendredi: '07:30 – 19:00',
      samedi: '09:00 – 13:00',
    },
    stroller: true,
  },
  {
    name: 'Dégustation vins du Beaujolais',
    category: 'gastronomie',
    description:
      "Dégustation commentée de 6 crus du Beaujolais accompagnée d'une planche de produits locaux, dans une cave voûtée de la rue Mercière. Animée par un sommelier, 1 h 30 environ. Sur réservation, à partir de 2 personnes.",
    address: '15 Rue Mercière, 69002 Lyon',
    latitude: 45.7626,
    longitude: 4.833,
    priceMin: 20,
    priceMax: 45,
    openingHours: {
      mardi: '17:00 – 22:00',
      mercredi: '17:00 – 22:00',
      jeudi: '17:00 – 23:00',
      vendredi: '17:00 – 23:00',
      samedi: '15:00 – 23:00',
    },
  },
  {
    name: 'Concert jazz — Le Périscope',
    category: 'musique',
    description:
      'Scène emblématique du jazz et des musiques improvisées à Lyon. Programmation éclectique du mardi au samedi : jeunes talents, artistes internationaux et jam sessions. Bar sur place, salle intimiste de 200 places.',
    address: '11 Rue Dalgabio, 69001 Lyon',
    latitude: 45.7686,
    longitude: 4.8412,
    priceMin: 10,
    priceMax: 20,
    openingHours: {
      mardi: '19:00 – 01:00',
      mercredi: '19:00 – 01:00',
      jeudi: '19:00 – 01:00',
      vendredi: '19:00 – 02:00',
      samedi: '19:00 – 02:00',
    },
    websiteUrl: 'https://periscope-lyon.com',
  },
  {
    name: 'Piscine olympique — Aquatic Center',
    category: 'sport',
    description:
      'Bassin olympique de 50 m, bassin ludique et espace bien-être (sauna, hammam) au bord du Rhône. Créneaux nage libre tous les jours, cours de natation enfants et adultes. Bonnet de bain obligatoire.',
    address: '240 Rue Marcel Mérieux, 69007 Lyon',
    latitude: 45.73,
    longitude: 4.826,
    priceMin: 4,
    priceMax: 8,
    openingHours: {
      lundi: '07:00 – 21:00',
      mardi: '07:00 – 21:00',
      mercredi: '07:00 – 21:00',
      jeudi: '07:00 – 21:00',
      vendredi: '07:00 – 21:00',
      samedi: '09:00 – 19:00',
      dimanche: '09:00 – 19:00',
    },
    pmr: true,
    stroller: true,
  },
];

// Créneaux : horaires et capacité par activité (la randonnée n'en a pas → date libre)
const SLOT_CONFIG: Record<string, { times: [number, number][]; capacity: number }> = {
  'Escalade en salle — ClimbUp Lyon':     { times: [[10, 0], [14, 0], [18, 0]], capacity: 20 },
  'Musée des Beaux-Arts de Lyon':         { times: [[10, 0], [14, 30]],         capacity: 30 },
  'Atelier poterie — Terres Vives':       { times: [[14, 30], [17, 0]],         capacity: 6 },
  'Yoga flow — Studio Zenith':            { times: [[8, 0], [12, 30], [18, 30]], capacity: 12 },
  'Dégustation vins du Beaujolais':       { times: [[18, 0], [20, 30]],         capacity: 10 },
  'Concert jazz — Le Périscope':          { times: [[20, 30]],                  capacity: 50 },
  'Piscine olympique — Aquatic Center':   { times: [[8, 0], [12, 0], [17, 0]],  capacity: 40 },
};

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

async function seedSlots(client: import('pg').PoolClient): Promise<void> {
  const { rows: acts } = await client.query<{ id: string; name: string; opening_hours: Record<string, string> | null }>(
    'SELECT id, name, opening_hours FROM activities',
  );

  let created = 0;
  for (const act of acts) {
    const config = SLOT_CONFIG[act.name];
    if (!config) continue;

    const openDays = act.opening_hours ? Object.keys(act.opening_hours) : DAY_NAMES;

    for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      if (!openDays.includes(DAY_NAMES[date.getDay()])) continue;

      for (const [hour, minute] of config.times) {
        const startsAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
        const result = await client.query(
          `INSERT INTO activity_slots (activity_id, starts_at, capacity)
           VALUES ($1, $2, $3)
           ON CONFLICT (activity_id, starts_at) DO NOTHING`,
          [act.id, startsAt, config.capacity],
        );
        created += result.rowCount ?? 0;
      }
    }
  }
  console.log(`  ✅ ${created} créneaux créés (14 prochains jours)`);
}

async function seed() {
  const client = await pool.connect();
  try {
    // Organisateur démo (créé une seule fois)
    let organizerId: string;
    const existing = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [ORGANIZER.email],
    );
    if (existing.rows.length > 0) {
      organizerId = existing.rows[0].id;
      console.log(`  ⏭  Organisateur ${ORGANIZER.pseudo} déjà présent`);
    } else {
      const hash = await hashPassword(ORGANIZER.password);
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO users (email, pseudo, password_hash, role, email_verified)
         VALUES ($1, $2, $3, 'organizer', true)
         RETURNING id`,
        [ORGANIZER.email, ORGANIZER.pseudo, hash],
      );
      organizerId = rows[0].id;
      console.log(`  ✅ Organisateur ${ORGANIZER.pseudo} créé`);
    }

    const demoPlace = ACTIVITIES[0];
    const { rows: estRows } = await client.query<{ id: string }>(
      `INSERT INTO establishments
         (organizer_id, name, address, location, address_id, website_url)
       VALUES ($1, $2, $3, ST_MakePoint($4, $5)::geography, $6, $7)
       ON CONFLICT (organizer_id) DO UPDATE SET organizer_id = EXCLUDED.organizer_id
       RETURNING id`,
      [
        organizerId,
        'Établissement de démonstration',
        demoPlace.address,
        demoPlace.longitude,
        demoPlace.latitude,
        'seed.demo-establishment',
        demoPlace.websiteUrl ?? null,
      ],
    );
    const establishmentId = estRows[0].id;

    for (const a of ACTIVITIES) {
      const dup = await client.query('SELECT 1 FROM activities WHERE name = $1', [a.name]);
      if (dup.rows.length > 0) {
        console.log(`  ⏭  ${a.name} (déjà présente)`);
        continue;
      }
      await client.query(
        `INSERT INTO activities
           (organizer_id, establishment_id, name, category, description, address, location,
            price_min, price_max, opening_hours,
            accessibility_pmr, accessibility_stroller, website_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, ST_MakePoint($7, $8)::geography,
                 $9, $10, $11, $12, $13, $14, 'published')`,
        [
          organizerId, establishmentId, a.name, a.category, a.description, demoPlace.address,
          demoPlace.longitude, demoPlace.latitude,
          a.priceMin, a.priceMax, JSON.stringify(a.openingHours),
          a.pmr ?? false, a.stroller ?? false, a.websiteUrl ?? null,
        ],
      );
      console.log(`  ✅ ${a.name}`);
    }

    await seedSlots(client);

    console.log('\nSeed terminé.');
  } catch (err) {
    console.error('Seed échoué :', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
