import {
  PropertyType,
  ListingStatus,
  ListingType,
  TourType,
  DayOn,
  HomeFeature,
  LotFeature,
  ConstructionType,
  mediaType,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { prisma } from '../src/config/database';

const HOME_FEATURES = Object.values(HomeFeature);
const LOT_FEATURES = Object.values(LotFeature);
const imagesCount = faker.number.int({ min: 3, max: 10 });

const get_lot_size = () => {
  const useAcres = faker.datatype.boolean();

  if (useAcres) {
    const acres = faker.number.float({
      min: 0.01,
      max: 100,
      fractionDigits: 2,
    });
    return `${acres} acres`;
  }
  const sqft = faker.number.int({ min: 0, max: 4356000 }); // 100 acres
  return `${sqft} sq ft`;
};

async function main() {
  // Create some users first
  const users = [];
  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        name: faker.person.firstName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
      },
    });
    users.push(user);
  }

  for (let i = 0; i < 1000; i++) {
    // Create Address
    const address = await prisma.address.create({
      data: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postal_code: faker.location.zipCode(),
        country: faker.location.country(),
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
      },
    });

    // Create Property
    const property = await prisma.property.create({
      data: {
        price: faker.number.int({ min: 50000, max: 5000000 }),
        bathroom: faker.number.int({ min: 1, max: 5 }),
        bedroom: faker.number.int({ min: 1, max: 5 }),
        square_feet: faker.number.int({ min: 400, max: 10000 }),
        price_reduced: faker.datatype.boolean(),

        property_type: faker.helpers.arrayElement(Object.values(PropertyType)),
        status: faker.helpers.arrayElement(Object.values(ListingStatus)),
        listing_type: faker.helpers.arrayElement(Object.values(ListingType)),
        tour: faker.helpers.arrayElement(Object.values(TourType)),
        day_on_platform: faker.helpers.arrayElement(Object.values(DayOn)),

        garage: faker.datatype.boolean()
          ? faker.number.int({ min: 1, max: 5 })
          : null,
        lot_size: get_lot_size(),
        home_age: faker.number.int({ min: 0, max: 100 }),
        stories: faker.helpers.arrayElement(['single', 'multi']),

        home_feature: faker.helpers.arrayElements(
          HOME_FEATURES,
          faker.number.int({ min: 1, max: 5 }),
        ),
        lot_feature: faker.helpers.arrayElements(
          LOT_FEATURES,
          faker.number.int({ min: 1, max: 3 }),
        ),
        construction_type: faker.helpers.arrayElement(
          Object.values(ConstructionType),
        ),
        open_house_date: faker.datatype.boolean()
          ? faker.date.soon({ days: 30 })
          : null,

        addressId: address.id,
        userId: faker.helpers.arrayElement(users).id,
      },
    });

    await prisma.propertyMedia.createMany({
      data: [
        // Thumbnail (single)
        {
          propertyId: property.id,
          type: mediaType.THUMBNAIL,
          url: faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
        },

        // Multiple images
        ...Array.from({ length: imagesCount }).map(() => ({
          propertyId: property.id,
          type: mediaType.IMAGE,
          url: faker.image.urlPicsumPhotos({ width: 1200, height: 800 }),
        })),

        // Video
        {
          propertyId: property.id,
          type: mediaType.VIDEO,
          url: 'https://example.com/video.mp4',
        },

        // 3D model
        {
          propertyId: property.id,
          type: mediaType.THREED_MODEL,
          url: 'https://example.com/model.glb',
        },
      ],
    });

    if ((i + 1) % 50 === 0) {
      console.log(`${i + 1} properties created...`);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
