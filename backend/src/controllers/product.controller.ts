import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().optional(),
  unitPrice: z.number().nonnegative(),
  currentStock: z.number().int().nonnegative().default(0),
  minStockAlert: z.number().int().nonnegative().default(0),
  location: z.string().optional(),
});

export const updateProductSchema = productSchema.partial();

export const stockMovementSchema = z.object({
  quantity: z.number().int().positive(),
  movementType: z.enum(["IN", "OUT"]),
  reason: z.string().min(1, "Reason is required"),
});

// GET /products?search=&lowStock=true&page=&limit=
export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || "20", 10), 1), 100);
  const search = (req.query.search as string) || "";
  const lowStock = req.query.lowStock === "true";

  const where: any = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [allMatching, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      ...(lowStock ? {} : { skip: (page - 1) * limit, take: limit }),
    }),
    prisma.product.count({ where }),
  ]);

  const items = lowStock
    ? allMatching.filter((p: any) => p.currentStock <= p.minStockAlert)
    : allMatching;

  res.json({
    items,
    pagination: lowStock
      ? { page: 1, limit: items.length, total: items.length, totalPages: 1 }
      : { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { createdBy: { select: { name: true } } },
      },
    },
  });
  if (!product) throw new ApiError(404, "Product not found");
  res.json(product);
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof productSchema>;
  const product = await prisma.product.create({ data });
  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof updateProductSchema>;
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Product not found");

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data,
  });
  res.json(product);
});

// POST /products/:id/stock-movements
// Records an IN/OUT stock movement and updates currentStock atomically.
export const addStockMovement = asyncHandler(async (req: Request, res: Response) => {
  const { quantity, movementType, reason } = req.body as z.infer<typeof stockMovementSchema>;

  const result = await prisma.$transaction(async (tx: any) => {
    const product = await tx.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new ApiError(404, "Product not found");

    const delta = movementType === "IN" ? quantity : -quantity;
    const newStock = product.currentStock + delta;

    if (newStock < 0) {
      throw new ApiError(
        400,
        `Insufficient stock for ${product.name}. Available: ${product.currentStock}, requested OUT: ${quantity}`
      );
    }

    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: { currentStock: newStock },
    });

    const movement = await tx.stockMovement.create({
      data: {
        productId: product.id,
        quantityChanged: quantity,
        movementType,
        reason,
        createdById: req.user!.userId,
      },
    });

    return { product: updatedProduct, movement };
  });

  res.status(201).json(result);
});
