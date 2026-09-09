import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const users = await Promise.all(
    [
      { name: "Admin User", email: "admin@erp.test", role: "ADMIN" as const },
      { name: "Sales User", email: "sales@erp.test", role: "SALES" as const },
      { name: "Warehouse User", email: "warehouse@erp.test", role: "WAREHOUSE" as const },
      { name: "Accounts User", email: "accounts@erp.test", role: "ACCOUNTS" as const },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, passwordHash },
      })
    )
  );

  const admin = users[0];

  const customer1 = await prisma.customer.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ramesh Traders",
      mobile: "9876543210",
      email: "ramesh@traders.test",
      businessName: "Ramesh Traders Pvt Ltd",
      gstNumber: "27ABCDE1234F1Z5",
      customerType: "WHOLESALE",
      address: "MG Road, Pune",
      status: "ACTIVE",
    },
  });

  const product1 = await prisma.product.upsert({
    where: { sku: "SKU-001" },
    update: {},
    create: {
      name: "Steel Bolt 10mm",
      sku: "SKU-001",
      category: "Hardware",
      unitPrice: 5.5,
      currentStock: 500,
      minStockAlert: 50,
      location: "Warehouse A - Rack 3",
    },
  });

  const product2 = await prisma.product.upsert({
    where: { sku: "SKU-002" },
    update: {},
    create: {
      name: "PVC Pipe 2 inch",
      sku: "SKU-002",
      category: "Plumbing",
      unitPrice: 120,
      currentStock: 80,
      minStockAlert: 20,
      location: "Warehouse B - Rack 1",
    },
  });

  await prisma.customerNote.upsert({
    where: { id: "00000000-0000-0000-0000-000000000010" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000010",
      customerId: customer1.id,
      content: "Interested in bulk order of steel bolts. Follow up next week.",
      createdById: admin.id,
    },
  });

  console.log("Seed complete.");
  console.log("Demo logins (all use password: Password123!):");
  users.forEach((u) => console.log(`  ${u.role.padEnd(10)} ${u.email}`));
  console.log(`Sample customer: ${customer1.name} (${customer1.id})`);
  console.log(`Sample products: ${product1.sku}, ${product2.sku}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
