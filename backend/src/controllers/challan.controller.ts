import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";

export const challanItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const createChallanSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(challanItemSchema).min(1, "At least one product is required"),
  status: z.enum(["DRAFT", "CONFIRMED"]).default("DRAFT"),
});

export const updateStatusSchema = z.object({
  status: z.enum(["DRAFT", "CONFIRMED", "CANCELLED"]),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateChallanNumber(tx: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;
  const last = await tx.challan.findFirst({
    where: { challanNumber: { startsWith: prefix } },
    orderBy: { challanNumber: "desc" },
  });
  let nextSeq = 1;
  if (last) {
    const parts = last.challanNumber.split("-");
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq)) nextSeq = seq + 1;
  }
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

// GET /challans?status=&customerId=&page=&limit=
export const listChallans = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || "20", 10), 1), 100);
  const status = req.query.status as string | undefined;
  const customerId = req.query.customerId as string | undefined;

  const where: any = {
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { customer: { select: { name: true, businessName: true } } },
    }),
    prisma.challan.count({ where }),
  ]);

  res.json({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const getChallan = asyncHandler(async (req: Request, res: Response) => {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: {
      items: true,
      customer: true,
      createdBy: { select: { name: true, email: true } },
    },
  });
  if (!challan) throw new ApiError(404, "Challan not found");
  res.json(challan);
});

// Creates a challan. If status is CONFIRMED at creation time, stock is
// reduced immediately (within the same transaction) and validated against
// available stock so it can never go negative.
export const createChallan = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof createChallanSchema>;

  const result = await prisma.$transaction(async (tx: any) => {
    const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const productIds = data.items.map((i) => i.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });

    if (products.length !== productIds.length) {
      throw new ApiError(400, "One or more selected products were not found");
    }

    const productMap = new Map(products.map((p: any) => [p.id, p]));

    // Validate stock availability up-front if confirming immediately.
    if (data.status === "CONFIRMED") {
      for (const item of data.items) {
        const product = productMap.get(item.productId)!;
        if (product.currentStock < item.quantity) {
          throw new ApiError(
            400,
            `Insufficient stock for ${product.name} (SKU: ${product.sku}). Available: ${product.currentStock}, requested: ${item.quantity}`
          );
        }
      }
    }

    const challanNumber = await generateChallanNumber(tx);
    const totalQuantity = data.items.reduce((sum, i) => sum + i.quantity, 0);

    const challan = await tx.challan.create({
      data: {
        challanNumber,
        customerId: customer.id,
        customerSnapshot: {
          name: customer.name,
          mobile: customer.mobile,
          businessName: customer.businessName,
          gstNumber: customer.gstNumber,
          address: customer.address,
        },
        totalQuantity,
        status: data.status,
        createdById: req.user!.userId,
        items: {
          create: data.items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: product.id,
              productSnapshot: {
                name: product.name,
                sku: product.sku,
                category: product.category,
                unitPrice: product.unitPrice.toString(),
              },
              quantity: item.quantity,
              unitPrice: product.unitPrice,
            };
          }),
        },
      },
      include: { items: true },
    });

    // If confirmed immediately, reduce stock + log movements now.
    if (data.status === "CONFIRMED") {
      for (const item of data.items) {
        const product = productMap.get(item.productId)!;
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantityChanged: item.quantity,
            movementType: "OUT",
            reason: `Sales challan ${challanNumber}`,
            createdById: req.user!.userId,
          },
        });
      }
    }

    return challan;
  });

  res.status(201).json(result);
});

// PATCH /challans/:id/status
// Handles Draft -> Confirmed (reduces stock, validated) and any -> Cancelled
// (restores stock if it had previously been confirmed).
export const updateChallanStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status: newStatus } = req.body as z.infer<typeof updateStatusSchema>;

  const result = await prisma.$transaction(async (tx: any) => {
    const challan = await tx.challan.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!challan) throw new ApiError(404, "Challan not found");

    if (challan.status === newStatus) return challan;

    if (challan.status === "CANCELLED") {
      throw new ApiError(400, "Cannot change status of a cancelled challan");
    }

    // DRAFT -> CONFIRMED : reduce stock, validate availability
    if (challan.status === "DRAFT" && newStatus === "CONFIRMED") {
      for (const item of challan.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new ApiError(404, "Product referenced by challan not found");
        if (product.currentStock < item.quantity) {
          throw new ApiError(
            400,
            `Insufficient stock for ${product.name}. Available: ${product.currentStock}, required: ${item.quantity}`
          );
        }
      }
      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChanged: item.quantity,
            movementType: "OUT",
            reason: `Sales challan ${challan.challanNumber} confirmed`,
            createdById: req.user!.userId,
          },
        });
      }
    }

    // CONFIRMED -> CANCELLED : restore stock
    if (challan.status === "CONFIRMED" && newStatus === "CANCELLED") {
      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChanged: item.quantity,
            movementType: "IN",
            reason: `Sales challan ${challan.challanNumber} cancelled - stock restored`,
            createdById: req.user!.userId,
          },
        });
      }
    }

    // DRAFT -> CANCELLED : no stock was ever reduced, nothing to restore.

    return tx.challan.update({
      where: { id: challan.id },
      data: { status: newStatus },
      include: { items: true },
    });
  });

  res.json(result);
});
