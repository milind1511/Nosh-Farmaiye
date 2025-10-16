import path from "path";
import { fileURLToPath } from "url";
import { copyFile } from "fs/promises";
import fs from "fs";
import "dotenv/config";
import { connectDB } from "../config/db.js";
import foodModel from "../models/foodModel.js";
import { FOOD_CATEGORY_IDS } from "../constants/foodCategories.js";
import {
  resolveUploadsDir,
  LOCAL_UPLOADS_DIR,
  CONTAINER_UPLOADS_DIR,
} from "../config/uploads.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_ASSETS_DIR = path.resolve(
  __dirname,
  "../../frontend/src/assets/frontend_assets"
);
const CONTAINER_FRONTEND_ASSETS_DIR = path.resolve(
  __dirname,
  "../../frontend-assets"
);

const UPLOADS_DIR = resolveUploadsDir();

const MENU_ITEMS = [
  {
    name: "Charcoal Tandoori Murgh",
    description:
      "Cage-free chicken marinated overnight in hung curd, charred on open coals, and finished with smoked ghee.",
    price: 520,
    category: "Chicken",
    sourceImage: "dishes/charcoal-tandoori-murgh.jpeg",
    targetImage: "charcoal-tandoori-murgh.jpeg",
  },
  {
    name: "Awadhi Chicken Korma",
    description:
      "A velvety cashew gravy perfumed with saffron, mace, and house-ground garam masala—best mopped with sheermal.",
    price: 560,
    category: "Chicken",
    sourceImage: "dishes/awadhi-chicken-korma.jpeg",
    targetImage: "awadhi-chicken-korma.jpeg",
  },
  {
    name: "Raan-e-Nosh",
    description:
      "Slow-braised leg of mutton lacquered with jaggery glaze, served with caramelised onions and anar pearls.",
    price: 780,
    category: "Mutton",
    sourceImage: "dishes/raan-e-nosh.jpeg",
    targetImage: "raan-e-nosh.jpeg",
  },
  {
    name: "Nalli Nihari",
    description:
      "12-hour simmered marrow shanks enriched with saffron stock and finished tableside with a desi ghee tadka.",
    price: 690,
    category: "Mutton",
    sourceImage: "dishes/nalli-nihari.jpeg",
    targetImage: "nalli-nihari.jpeg",
  },
  {
    name: "Shahi Tukda",
    description:
      "Saffron rabdi poured over pan-toasted brioche, crowned with pistas, rose petal dust, and varq.",
    price: 280,
    category: "Desserts",
    sourceImage: "dishes/shahi-tukda.jpeg",
    targetImage: "shahi-tukda.jpeg",
  },
  {
    name: "Kesariya Phirni Parfait",
    description:
      "Silky rice pudding layered with almond praline and kewra cream, chilled in earthen kullhads.",
    price: 240,
    category: "Desserts",
    sourceImage: "dishes/kesariya-phirni-parfait.jpeg",
    targetImage: "kesariya-phirni-parfait.jpeg",
  },
  {
    name: "Smoked Malai Tikka",
    description:
      "Tender chicken morsels marinated in malai and kasuri methi, smoked over sandalwood chips.",
    price: 540,
    category: "Chicken",
    sourceImage: "dishes/smoked-malai-tikka.jpeg",
    targetImage: "smoked-malai-tikka.jpeg",
  },
  {
    name: "Lal Mirch Chicken Tikka",
    description:
      "Fiery red tikka cured with Mathania chillies, tempered with jaggery glaze for a sweet-heat finish.",
    price: 515,
    category: "Chicken",
    sourceImage: "dishes/lal-mirch-chicken-tikka.jpeg",
    targetImage: "lal-mirch-chicken-tikka.jpeg",
  },
  {
    name: "Kashmiri Rogan Josh",
    description:
      "Hand-cut mutton simmered with Kashmiri mirch, ratan jot, and yogurt to a deep crimson sheen.",
    price: 760,
    category: "Mutton",
    sourceImage: "dishes/kashmiri-rogan-josh.jpeg",
    targetImage: "kashmiri-rogan-josh.jpeg",
  },
  {
    name: "Patiala Mutton Chaap",
    description:
      "Double-cooked ribs tossed in brown onion masala and finished with saffron cream.",
    price: 735,
    category: "Mutton",
    sourceImage: "dishes/patiala-mutton-chaap.jpeg",
    targetImage: "patiala-mutton-chaap.jpeg",
  },
  {
    name: "Kesar Kulfi Falooda",
    description:
      "House-made kulfi served with rose falooda, chia pearls, and pistachio praline.",
    price: 260,
    category: "Desserts",
    sourceImage: "dishes/kesar-kulfi-falooda.jpeg",
    targetImage: "kesar-kulfi-falooda.jpeg",
  },
  {
    name: "Gulab Phirni Tart",
    description:
      "Rose-scented phirni baked in butter tart shells, topped with berry compote and varq.",
    price: 255,
    category: "Desserts",
    sourceImage: "dishes/gulab-phirni-tart.jpeg",
    targetImage: "gulab-phirni-tart.jpeg",
  },
];

const ensureAssetAvailable = async (sourceFile, targetFile) => {
  const targetPath = path.join(UPLOADS_DIR, targetFile);

  if (fs.existsSync(targetPath)) {
    return targetFile;
  }

  const candidateDirs = [
    FRONTEND_ASSETS_DIR,
    CONTAINER_FRONTEND_ASSETS_DIR,
    UPLOADS_DIR,
    LOCAL_UPLOADS_DIR,
    CONTAINER_UPLOADS_DIR,
  ].filter((dir, index, array) => dir && array.indexOf(dir) === index);

  const candidateSources = candidateDirs
    .map((dir) => path.join(dir, sourceFile))
    .filter((candidate) => fs.existsSync(candidate));

  if (candidateSources.length === 0) {
    throw new Error(
      `Source asset missing for ${targetFile}. Checked: ${candidateSources.join(
        ", "
      )}`
    );
  }

  const [existingSource] = candidateSources;

  if (existingSource !== targetPath) {
    await copyFile(existingSource, targetPath);
  }

  return targetFile;
};

const seedMenu = async () => {
  await connectDB();

  const invalidCategory = MENU_ITEMS.find(
    (item) => !FOOD_CATEGORY_IDS.includes(item.category)
  );
  if (invalidCategory) {
    throw new Error(`Invalid category detected: ${invalidCategory.category}`);
  }

  const seededSlugs = new Set();

  for (const item of MENU_ITEMS) {
    const { name, description, price, category, sourceImage, targetImage } =
      item;

    // Copy supporting imagery into uploads folder
    const storedImage = await ensureAssetAvailable(sourceImage, targetImage);

  const slug = targetImage.replace(/\.[a-z0-9]+$/i, "");
    if (seededSlugs.has(slug)) {
      continue;
    }

    await foodModel.updateOne(
      { name },
      {
        name,
        description,
        price,
        category,
        image: storedImage,
      },
      { upsert: true }
    );

    seededSlugs.add(slug);
    console.log(`✔ Seeded ${name}`);
  }

  console.log("✨ Menu seeding complete");
  process.exit(0);
};

seedMenu().catch((error) => {
  console.error("Failed to seed menu", error);
  process.exit(1);
});
