import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(6, "Valid mobile number is required"),
  email: z.string().email().optional().or(z.literal("")).optional(),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]).default("RETAIL"),
  address: z.string().optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).default("LEAD"),
  followUpDate: z.string().datetime().optional().or(z.literal("")).optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = customerSchema.partial();

export const noteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
});

// GET /customers?search=&status=&type=&page=&limit=
export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || "20", 10), 1), 100);
  const search = (req.query.search as string) || "";
  const status = req.query.status as string | undefined;
  const customerType = req.query.type as string | undefined;

  const where: any = {
    ...(status ? { status } : {}),
    ...(customerType ? { customerType } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { mobile: { contains: search, mode: "insensitive" } },
            { businessName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      notes: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } },
      challans: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!customer) throw new ApiError(404, "Customer not found");
  res.json(customer);
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof customerSchema>;
  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      mobile: data.mobile,
      email: data.email || null,
      businessName: data.businessName || null,
      gstNumber: data.gstNumber || null,
      customerType: data.customerType,
      address: data.address || null,
      status: data.status,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      ...(data.notes
        ? { notes: { create: { content: data.notes, createdById: req.user!.userId } } }
        : {}),
    },
  });
  res.status(201).json(customer);
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof updateCustomerSchema>;
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Customer not found");

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.mobile !== undefined ? { mobile: data.mobile } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.businessName !== undefined ? { businessName: data.businessName || null } : {}),
      ...(data.gstNumber !== undefined ? { gstNumber: data.gstNumber || null } : {}),
      ...(data.customerType !== undefined ? { customerType: data.customerType } : {}),
      ...(data.address !== undefined ? { address: data.address || null } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.followUpDate !== undefined
        ? { followUpDate: data.followUpDate ? new Date(data.followUpDate) : null }
        : {}),
    },
  });
  res.json(customer);
});

export const addCustomerNote = asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body as z.infer<typeof noteSchema>;
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Customer not found");

  const note = await prisma.customerNote.create({
    data: { customerId: req.params.id, content, createdById: req.user!.userId },
  });
  res.status(201).json(note);
});
