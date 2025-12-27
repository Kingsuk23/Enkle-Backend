import type { Request, Response } from 'express';
import { try_catch_handler } from '../middleware/centralized_error_handler';
import { prisma } from '../config/database';
import {
  DayOn,
  HomeFeature,
  ListingStatus,
  ListingType,
  LotFeature,
  Prisma,
  PropertyType,
  TourType,
} from '@prisma/client';
import { response_helper } from '../utils/utils';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

export const get_all_properties_controller = try_catch_handler(
  async (req: Request, res: Response) => {
    const homeFeatures = req.query.home_feature
      ? (String(req.query.home_feature)
          .split(',')
          .filter((f) =>
            Object.values(HomeFeature).includes(f as HomeFeature),
          ) as HomeFeature[])
      : undefined;

    const lotFeatures = req.query.lot_feature
      ? (String(req.query.lot_feature)
          .split(',')
          .filter((f) =>
            Object.values(LotFeature).includes(f as LotFeature),
          ) as LotFeature[])
      : undefined;

    const searchValue = req.query.search as string | undefined;

    const page = Number(req.query.page) || 1;

    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius || 10);

    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180));

    const locationFilter =
      lng && lat
        ? {
            address: {
              latitude: {
                gte: lat - latDelta,
                lte: lat + latDelta,
              },
              longitude: {
                gte: lng - lngDelta,
                lte: lng + lngDelta,
              },
            },
          }
        : {};

    const filters: Prisma.PropertyWhereInput[] = [];

    if (req.query.price_min) {
      filters.push({ price: { gte: Number(req.query.price_min) } });
    }

    if (req.query.price_max) {
      filters.push({ price: { lte: Number(req.query.price_max) } });
    }

    if (req.query.min_bed) {
      filters.push({ bedroom: { gte: Number(req.query.min_bed) } });
    }

    if (req.query.max_bed) {
      filters.push({ bedroom: { lte: Number(req.query.max_bed) } });
    }

    if (req.query.min_bath) {
      filters.push({ bathroom: { gte: Number(req.query.min_bath) } });
    }

    if (req.query.max_bath) {
      filters.push({ bathroom: { lte: Number(req.query.max_bath) } });
    }

    if (req.query.property_type) {
      filters.push({ property_type: req.query.property_type as PropertyType });
    }

    if (req.query.price_reduced) {
      filters.push({
        price_reduced: req.query.price_reduced === 'true',
      });
    }

    if (req.query.listing_status) {
      filters.push({ status: req.query.listing_status as ListingStatus });
    }

    if (req.query.listing_type) {
      filters.push({ listing_type: req.query.listing_type as ListingType });
    }

    if (req.query.tour) {
      filters.push({ tour: req.query.tour as TourType });
    }

    if (req.query.day_on_platform) {
      filters.push({ day_on_platform: req.query.day_on_platform as DayOn });
    }

    if (req.query.square_feet) {
      filters.push({ square_feet: Number(req.query.square_feet) });
    }

    if (req.query.garage) {
      filters.push({ garage: { gte: Number(req.query.garage) } });
    }

    if (req.query.lot_size) {
      filters.push({ lot_size: req.query.lot_size as string });
    }

    if (req.query.home_age) {
      filters.push({ home_age: Number(req.query.home_age) });
    }

    if (req.query.stories) {
      filters.push({ stories: req.query.stories as string });
    }

    if (homeFeatures?.length) {
      filters.push({
        home_feature: { hasEvery: homeFeatures },
      });
    }

    if (lotFeatures?.length) {
      filters.push({
        lot_feature: { hasEvery: lotFeatures },
      });
    }

    if (searchValue) {
      filters.push({
        address: {
          OR: [
            { city: { contains: searchValue, mode: 'insensitive' } },
            { state: { contains: searchValue, mode: 'insensitive' } },
            { postal_code: { contains: searchValue, mode: 'insensitive' } },
            { street: { contains: searchValue, mode: 'insensitive' } },
            { country: { contains: searchValue, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (locationFilter) {
      filters.push(locationFilter);
    }

    const property_data = await prisma.property.findMany({
      where: {
        AND: filters,
      },

      orderBy: req.query.order_key
        ? {
            [req.query.order_key as 'price' | 'createdAt']:
              req.query.order_rule === 'asc' ? 'asc' : 'desc',
          }
        : { createdAt: 'desc' },
      take: 30,
      skip: (page - 1) * 30,
      select: {
        address: {
          select: {
            city: true,
            state: true,
            street: true,
            country: true,
            latitude: true,
            longitude: true,
            postal_code: true,
          },
        },
        media: {
          where: {
            type: 'THUMBNAIL',
          },
          select: {
            url: true,
          },
        },
        id: true,
        price: true,
        bedroom: true,
        bathroom: true,
        square_feet: true,
        open_house_date: true,
        construction_type: true,
      },
    });

    const total = prisma.property.count();

    response_helper({
      status_code: StatusCodes.OK,
      name: getReasonPhrase(StatusCodes.OK),
      message: 'Properties fetched successfully',
      res,
      data: {
        total,
        page,
        property_data,
      },
    });
  },
);
