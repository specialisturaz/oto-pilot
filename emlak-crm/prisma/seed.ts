// ============================================================================
// Emlak CRM - Ana Seed Dosyasi
// Veritabanini ornek verilerle doldurur
// ============================================================================

import { PrismaClient, Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as path from "path";
import * as fs from "fs";
import { seedLocations } from "../infrastructure/scripts/seed-locations";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// JSON dosyalarini oku
// ---------------------------------------------------------------------------
function loadJson<T>(filePath: string): T {
  const absolutePath = path.resolve(__dirname, "..", filePath);
  const content = fs.readFileSync(absolutePath, "utf-8");
  return JSON.parse(content) as T;
}

// ---------------------------------------------------------------------------
// Features Seed - Gayrimenkul Ozellikleri
// ---------------------------------------------------------------------------
async function seedFeatures(): Promise<void> {
  console.log("🏷️  Ozellikler yukleniyor...");

  const data = loadJson<{
    categories: Array<{
      category: string;
      features: Array<{ nameTr: string; nameEn: string }>;
    }>;
  }>("infrastructure/seeds/features.json");

  let count = 0;

  for (const cat of data.categories) {
    for (const feature of cat.features) {
      await prisma.feature.upsert({
        where: {
          nameTr_category: {
            nameTr: feature.nameTr,
            category: cat.category,
          },
        },
        update: {
          nameEn: feature.nameEn,
        },
        create: {
          nameTr: feature.nameTr,
          nameEn: feature.nameEn,
          category: cat.category,
        },
      });
      count++;
    }
  }

  console.log(`  ✓ ${count} ozellik eklendi (${data.categories.length} kategori)`);
}

// ---------------------------------------------------------------------------
// Portals Seed - Emlak Portallari
// ---------------------------------------------------------------------------
async function seedPortals(): Promise<void> {
  console.log("🌐 Portal tanimlari yukleniyor...");

  const data = loadJson<{
    portals: Array<{
      name: string;
      slug: string;
      baseUrl: string;
      apiUrl: string;
      isActive: boolean;
      settings: Record<string, unknown>;
    }>;
  }>("infrastructure/seeds/portals.json");

  for (const portal of data.portals) {
    await prisma.portal.upsert({
      where: { slug: portal.slug },
      update: {
        name: portal.name,
        baseUrl: portal.baseUrl,
        apiUrl: portal.apiUrl,
        isActive: portal.isActive,
        settings: JSON.stringify(portal.settings),
      },
      create: {
        name: portal.name,
        slug: portal.slug,
        baseUrl: portal.baseUrl,
        apiUrl: portal.apiUrl,
        isActive: portal.isActive,
        settings: JSON.stringify(portal.settings),
      },
    });
  }

  console.log(`  ✓ ${data.portals.length} portal tanimlandı`);
}

// ---------------------------------------------------------------------------
// Demo Office - Ornek Ofis
// ---------------------------------------------------------------------------
async function seedDemoOffice(): Promise<string> {
  console.log("🏢 Demo ofis olusturuluyor...");

  const office = await prisma.office.upsert({
    where: { id: "demo-office-001" },
    update: {},
    create: {
      id: "demo-office-001",
      name: "Emlak CRM Demo Ofisi",
      phone: "+90 212 555 0001",
      email: "info@emlakcrm.com",
      address: "Levent Mah. Buyukdere Cad. No:185 Sisli/Istanbul",
      taxNumber: "1234567890",
      taxOffice: "Besiktas",
      licenseNumber: "TR-34-2024-001",
      website: "https://demo.emlakcrm.com",
      commissionRateBuy: 2.0,
      commissionRateSell: 2.0,
      commissionRateRent: 50.0,
      settings: JSON.stringify({
        currency: "TRY",
        timezone: "Europe/Istanbul",
        language: "tr",
        workingHours: {
          start: "09:00",
          end: "18:00",
          workDays: [1, 2, 3, 4, 5, 6],
        },
      }),
    },
  });

  console.log(`  ✓ Ofis olusturuldu: ${office.name}`);
  return office.id;
}

// ---------------------------------------------------------------------------
// Admin User - Yonetici Kullanici
// ---------------------------------------------------------------------------
async function seedAdminUser(officeId: string): Promise<string> {
  console.log("👤 Admin kullanici olusturuluyor...");

  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@emlakcrm.com" },
    update: {},
    create: {
      officeId,
      email: "admin@emlakcrm.com",
      phone: "+90 532 555 0001",
      passwordHash,
      firstName: "Admin",
      lastName: "Yonetici",
      role: "ADMIN",
      title: "Genel Mudur",
      isActive: true,
    },
  });

  // Ek danisman kullanicilari
  const agents = [
    {
      email: "ayse.yilmaz@emlakcrm.com",
      phone: "+90 533 555 0002",
      firstName: "Ayse",
      lastName: "Yilmaz",
      role: "AGENT" as const,
      title: "Kidemli Danisman",
    },
    {
      email: "mehmet.kaya@emlakcrm.com",
      phone: "+90 534 555 0003",
      firstName: "Mehmet",
      lastName: "Kaya",
      role: "AGENT" as const,
      title: "Emlak Danismani",
    },
    {
      email: "fatma.demir@emlakcrm.com",
      phone: "+90 535 555 0004",
      firstName: "Fatma",
      lastName: "Demir",
      role: "MANAGER" as const,
      title: "Ofis Muduru",
    },
  ];

  for (const agent of agents) {
    await prisma.user.upsert({
      where: { email: agent.email },
      update: {},
      create: {
        officeId,
        email: agent.email,
        phone: agent.phone,
        passwordHash,
        firstName: agent.firstName,
        lastName: agent.lastName,
        role: agent.role,
        title: agent.title,
        isActive: true,
      },
    });
  }

  console.log(`  ✓ Admin + ${agents.length} danisman olusturuldu`);
  return admin.id;
}

// ---------------------------------------------------------------------------
// Sample Contacts - Ornek Musteriler
// ---------------------------------------------------------------------------
async function seedSampleContacts(
  officeId: string,
  adminId: string
): Promise<string[]> {
  console.log("📇 Ornek musteriler olusturuluyor...");

  const contacts = [
    {
      firstName: "Ali",
      lastName: "Ozturk",
      phone: "+90 536 111 2233",
      email: "ali.ozturk@email.com",
      source: "PORTAL" as const,
      sourceDetail: "sahibinden.com",
      status: "ACTIVE" as const,
      interestType: "BUYER" as const,
      budgetMin: 3000000,
      budgetMax: 5000000,
      notes: "3+1 daire arıyor, Kadıkoy veya Atasehir bolgesinde",
    },
    {
      firstName: "Zeynep",
      lastName: "Arslan",
      phone: "+90 537 222 3344",
      email: "zeynep.arslan@email.com",
      source: "REFERRAL" as const,
      status: "PROSPECT" as const,
      interestType: "SELLER" as const,
      notes: "Besiktas'ta 4+1 dairesi var, satis dusunuyor",
    },
    {
      firstName: "Mustafa",
      lastName: "Sahin",
      phone: "+90 538 333 4455",
      email: "mustafa.sahin@email.com",
      source: "WALKIN" as const,
      status: "LEAD" as const,
      interestType: "BUYER" as const,
      budgetMin: 1500000,
      budgetMax: 2500000,
      notes: "Yatirim amacli, kucuk daire arıyor",
    },
    {
      firstName: "Elif",
      lastName: "Celik",
      phone: "+90 539 444 5566",
      email: "elif.celik@email.com",
      source: "WEBSITE" as const,
      status: "ACTIVE" as const,
      interestType: "RENTER" as const,
      budgetMin: 15000,
      budgetMax: 25000,
      notes: "Kiralık 2+1 arıyor, Sisli civari",
    },
    {
      firstName: "Emre",
      lastName: "Yildiz",
      phone: "+90 540 555 6677",
      source: "PHONE" as const,
      status: "CUSTOMER" as const,
      interestType: "INVESTOR" as const,
      budgetMin: 10000000,
      budgetMax: 20000000,
      notes: "Ticari gayrimenkul yatirimi, ofis veya dükkan",
      type: "CORPORATE" as const,
      companyName: "Yildiz Insaat A.S.",
    },
  ];

  const contactIds: string[] = [];

  for (const contact of contacts) {
    const created = await prisma.contact.create({
      data: {
        officeId,
        assignedUserId: adminId,
        type: contact.type || "INDIVIDUAL",
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        email: contact.email,
        companyName: contact.companyName,
        source: contact.source,
        sourceDetail: contact.sourceDetail,
        status: contact.status,
        interestType: contact.interestType,
        budgetMin: contact.budgetMin,
        budgetMax: contact.budgetMax,
        notes: contact.notes,
      },
    });
    contactIds.push(created.id);
  }

  console.log(`  ✓ ${contacts.length} musteri olusturuldu`);
  return contactIds;
}

// ---------------------------------------------------------------------------
// Sample Properties - Ornek Gayrimenkuller
// ---------------------------------------------------------------------------
async function seedSampleProperties(
  officeId: string,
  adminId: string,
  contactIds: string[]
): Promise<string[]> {
  console.log("🏠 Ornek gayrimenkuller olusturuluyor...");

  // Istanbul Il ve Ilce kayitlarini bul
  const istanbul = await prisma.il.findFirst({
    where: { plateCode: "34" },
  });

  const kadikoy = istanbul
    ? await prisma.ilce.findFirst({
        where: { ilId: istanbul.id, name: "Kadikoy" },
      })
    : null;

  const besiktas = istanbul
    ? await prisma.ilce.findFirst({
        where: { ilId: istanbul.id, name: "Besiktas" },
      })
    : null;

  const sisli = istanbul
    ? await prisma.ilce.findFirst({
        where: { ilId: istanbul.id, name: "Sisli" },
      })
    : null;

  const properties = [
    {
      title: "Kadikoy Moda'da Deniz Manzarali 3+1 Daire",
      listingType: "SALE" as const,
      propertyType: "APARTMENT" as const,
      propertyStatus: "ACTIVE" as const,
      price: 4500000,
      currency: "TRY" as const,
      ilId: istanbul?.id,
      ilceId: kadikoy?.id,
      address: "Moda Cad. No:45 Kadikoy/Istanbul",
      grossSqm: 145,
      netSqm: 125,
      roomCount: "3+1",
      bathroomCount: 2,
      floorNumber: 5,
      totalFloors: 8,
      buildingAge: 5,
      heatingType: "DOGALGAZ_KOMBI" as const,
      deedType: "KAT_MULKIYETI" as const,
      hasIskan: true,
      hasDask: true,
      energyClass: "B" as const,
      isEligibleForCredit: true,
      contactId: contactIds[1], // Satici: Zeynep
      description:
        "Kadikoy Moda'da deniz manzarali, asansorlu, guvenlikli sitede 3+1 satilik daire. Amerikan mutfak, ebeveyn banyosu, genis balkon. Yeni boyali, bakimli.",
    },
    {
      title: "Besiktas Levent'te Satilik Lüks Residence",
      listingType: "SALE" as const,
      propertyType: "RESIDENCE" as const,
      propertyStatus: "ACTIVE" as const,
      price: 12000000,
      currency: "TRY" as const,
      ilId: istanbul?.id,
      ilceId: besiktas?.id,
      address: "Buyukdere Cad. Levent/Istanbul",
      grossSqm: 220,
      netSqm: 195,
      roomCount: "4+1",
      bathroomCount: 3,
      floorNumber: 18,
      totalFloors: 35,
      buildingAge: 2,
      heatingType: "MERKEZI_DOGALGAZ" as const,
      deedType: "KAT_MULKIYETI" as const,
      isInSite: true,
      siteName: "Levent Towers",
      duesAmount: 3500,
      hasIskan: true,
      hasDask: true,
      energyClass: "A" as const,
      isEligibleForCredit: true,
      description:
        "Levent'in en prestijli residence projesinde 4+1 lüks daire. Bogaz manzarali, akilli ev sistemli, 7/24 guvenlik ve concierge hizmeti.",
    },
    {
      title: "Sisli Mecidiyekoy'de Kiralik 2+1 Ofis",
      listingType: "RENT" as const,
      propertyType: "OFFICE" as const,
      propertyStatus: "ACTIVE" as const,
      price: 35000,
      currency: "TRY" as const,
      ilId: istanbul?.id,
      ilceId: sisli?.id,
      address: "Mecidiyekoy Mah. Sisli/Istanbul",
      grossSqm: 85,
      netSqm: 75,
      roomCount: "2+1",
      bathroomCount: 1,
      floorNumber: 8,
      totalFloors: 15,
      buildingAge: 10,
      heatingType: "KLIMA" as const,
      deedType: "KAT_MULKIYETI" as const,
      description:
        "Metro ve metrobus'e yakin, ana cadde uzerinde kiralik ofis. Acik otopark mevcut. Merkezi konumda is yeri.",
    },
    {
      title: "Kadikoy Bagdat Caddesi Satilik Dükkan",
      listingType: "SALE" as const,
      propertyType: "SHOP" as const,
      propertyStatus: "ACTIVE" as const,
      price: 8500000,
      currency: "TRY" as const,
      ilId: istanbul?.id,
      ilceId: kadikoy?.id,
      address: "Bagdat Cad. Kadikoy/Istanbul",
      grossSqm: 120,
      netSqm: 110,
      floorNumber: 0,
      totalFloors: 5,
      buildingAge: 15,
      deedType: "KAT_MULKIYETI" as const,
      hasIskan: true,
      description:
        "Bagdat Caddesi uzerinde yuksek yaya trafikli bolumde 120m2 dükkan. Geniş cephe, otopark imkani.",
    },
    {
      title: "Kadikoy Caddebostan'da Satilik 5+2 Villa",
      listingType: "SALE" as const,
      propertyType: "VILLA" as const,
      propertyStatus: "DRAFT" as const,
      price: 25000000,
      currency: "TRY" as const,
      ilId: istanbul?.id,
      ilceId: kadikoy?.id,
      address: "Caddebostan Mah. Kadikoy/Istanbul",
      grossSqm: 380,
      netSqm: 340,
      roomCount: "5+2",
      bathroomCount: 4,
      totalFloors: 3,
      buildingAge: 8,
      heatingType: "YERDEN_ISITMA" as const,
      deedType: "MUSTEAKIL" as const,
      hasIskan: true,
      hasDask: true,
      energyClass: "A" as const,
      isEligibleForCredit: true,
      description:
        "Caddebostan'da denize 200m mesafede müstakil villa. Ozel havuz, bahce, 2 arac kapasiteli garaj. Akilli ev sistemi.",
    },
  ];

  const propertyIds: string[] = [];

  for (const prop of properties) {
    const created = await prisma.property.create({
      data: {
        officeId,
        assignedUserId: adminId,
        ...prop,
      },
    });
    propertyIds.push(created.id);
  }

  console.log(`  ✓ ${properties.length} gayrimenkul olusturuldu`);
  return propertyIds;
}

// ---------------------------------------------------------------------------
// Sample Deals - Ornek Satis Surecleri
// ---------------------------------------------------------------------------
async function seedSampleDeals(
  officeId: string,
  adminId: string,
  contactIds: string[],
  propertyIds: string[]
): Promise<void> {
  console.log("🤝 Ornek satis surecleri olusturuluyor...");

  const deals = [
    {
      contactId: contactIds[0], // Ali - Alici
      propertyId: propertyIds[0], // Kadikoy daire
      type: "SALE" as const,
      stage: "SHOWING" as const,
      askingPrice: 4500000,
      notes: "Ali Bey daireyi gormek istiyor, hafta sonu randevu ayarlandı",
    },
    {
      contactId: contactIds[3], // Elif - Kiraci
      propertyId: propertyIds[2], // Sisli ofis
      type: "RENT" as const,
      stage: "NEGOTIATION" as const,
      askingPrice: 35000,
      offerPrice: 30000,
      notes: "Elif Hanim kira bedeli icin pazarlik yapiyor",
    },
    {
      contactId: contactIds[4], // Emre - Yatirimci
      propertyId: propertyIds[3], // Bagdat Cad dükkan
      type: "SALE" as const,
      stage: "OFFER" as const,
      askingPrice: 8500000,
      offerPrice: 7800000,
      notes: "Yildiz Insaat teklif verdi, karsi teklif bekleniyor",
    },
  ];

  for (const deal of deals) {
    await prisma.deal.create({
      data: {
        officeId,
        assignedUserId: adminId,
        ...deal,
      },
    });
  }

  console.log(`  ✓ ${deals.length} satis sureci olusturuldu`);
}

// ---------------------------------------------------------------------------
// Sample Conversations & Messages - Ornek Konusmalar ve Mesajlar
// ---------------------------------------------------------------------------
async function seedSampleConversations(
  officeId: string,
  adminId: string,
  contactIds: string[]
): Promise<void> {
  console.log("💬 Ornek konusmalar ve mesajlar olusturuluyor...");

  const now = new Date();

  // Conversation 1: Ali Ozturk - INTERNAL
  const conv1 = await prisma.conversation.create({
    data: {
      officeId,
      contactId: contactIds[0], // Ali Ozturk
      assignedUserId: adminId,
      channel: "INTERNAL",
      status: "OPEN",
      lastMessageAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 dk once
      unreadCount: 1,
    },
  });

  const conv1Messages = [
    {
      officeId,
      conversationId: conv1.id,
      senderType: "USER",
      senderId: adminId,
      channel: "INTERNAL",
      content: "Merhaba Ali Bey, Kadikoy 3+1 daire ile ilgili bilgi vermek istiyorum.",
      status: "SENT",
      createdAt: new Date(now.getTime() - 60 * 60 * 1000), // 1 saat once
    },
    {
      officeId,
      conversationId: conv1.id,
      senderType: "CONTACT",
      senderId: contactIds[0],
      channel: "INTERNAL",
      content: "Merhaba, tesekkurler. Dairenin fiyati ne kadar?",
      status: "DELIVERED",
      createdAt: new Date(now.getTime() - 55 * 60 * 1000),
    },
    {
      officeId,
      conversationId: conv1.id,
      senderType: "USER",
      senderId: adminId,
      channel: "INTERNAL",
      content: "Daire 145 m2, 3+1, 5. katta. Fiyati 4.500.000 TL. Deniz manzarali.",
      status: "SENT",
      createdAt: new Date(now.getTime() - 50 * 60 * 1000),
    },
    {
      officeId,
      conversationId: conv1.id,
      senderType: "CONTACT",
      senderId: contactIds[0],
      channel: "INTERNAL",
      content: "Guzel, yerinde gormek istiyorum. Yarin uygun musunuz?",
      status: "DELIVERED",
      createdAt: new Date(now.getTime() - 10 * 60 * 1000),
    },
  ];

  for (const msg of conv1Messages) {
    await prisma.message.create({ data: msg });
  }

  // Conversation 2: Zeynep Arslan - INTERNAL
  const conv2 = await prisma.conversation.create({
    data: {
      officeId,
      contactId: contactIds[1], // Zeynep Arslan
      assignedUserId: adminId,
      channel: "INTERNAL",
      status: "OPEN",
      lastMessageAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 saat once
      unreadCount: 0,
    },
  });

  const conv2Messages = [
    {
      officeId,
      conversationId: conv2.id,
      senderType: "CONTACT",
      senderId: contactIds[1],
      channel: "INTERNAL",
      content: "Merhaba, Besiktas'taki 4+1 dairemi satmak istiyorum. Degerlemesini yapabilir misiniz?",
      status: "DELIVERED",
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    },
    {
      officeId,
      conversationId: conv2.id,
      senderType: "USER",
      senderId: adminId,
      channel: "INTERNAL",
      content: "Merhaba Zeynep Hanim, tabii ki. Dairenin adresini ve metrekaresini paylasabilir misiniz?",
      status: "SENT",
      createdAt: new Date(now.getTime() - 4.5 * 60 * 60 * 1000),
    },
    {
      officeId,
      conversationId: conv2.id,
      senderType: "CONTACT",
      senderId: contactIds[1],
      channel: "INTERNAL",
      content: "Besiktas Levent Mah. 180 m2, 4+1, 7. kat. Asansorlu ve otopark var.",
      status: "DELIVERED",
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    },
    {
      officeId,
      conversationId: conv2.id,
      senderType: "USER",
      senderId: adminId,
      channel: "INTERNAL",
      content: "Tesekkurler, bolge ve ozelliklerine gore on degerleme yapalim. Bu hafta icinde sizinle paylasacagim.",
      status: "SENT",
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
  ];

  for (const msg of conv2Messages) {
    await prisma.message.create({ data: msg });
  }

  // Conversation 3: Elif Celik - INTERNAL
  const conv3 = await prisma.conversation.create({
    data: {
      officeId,
      contactId: contactIds[3], // Elif Celik
      assignedUserId: adminId,
      channel: "INTERNAL",
      status: "OPEN",
      lastMessageAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 gun once
      unreadCount: 2,
    },
  });

  const conv3Messages = [
    {
      officeId,
      conversationId: conv3.id,
      senderType: "USER",
      senderId: adminId,
      channel: "INTERNAL",
      content: "Elif Hanim merhaba, Sisli bolgede 2+1 kiralik daireler icin birkaC secenek buldum.",
      status: "SENT",
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    },
    {
      officeId,
      conversationId: conv3.id,
      senderType: "CONTACT",
      senderId: contactIds[3],
      channel: "INTERNAL",
      content: "Harika! Fiyatlari ve lokasyonlari paylasabilir misiniz?",
      status: "DELIVERED",
      createdAt: new Date(now.getTime() - 47 * 60 * 60 * 1000),
    },
    {
      officeId,
      conversationId: conv3.id,
      senderType: "USER",
      senderId: adminId,
      channel: "INTERNAL",
      content: "1) Mecidiyekoy, 90m2, 22.000 TL/ay\n2) Osmanbey, 75m2, 18.000 TL/ay\n3) Nisantasi, 85m2, 25.000 TL/ay",
      status: "SENT",
      createdAt: new Date(now.getTime() - 46 * 60 * 60 * 1000),
    },
    {
      officeId,
      conversationId: conv3.id,
      senderType: "CONTACT",
      senderId: contactIds[3],
      channel: "INTERNAL",
      content: "Osmanbey dairesi cok ilgimi cekti. Ne zaman gorebilirim?",
      status: "DELIVERED",
      createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000),
    },
    {
      officeId,
      conversationId: conv3.id,
      senderType: "CONTACT",
      senderId: contactIds[3],
      channel: "INTERNAL",
      content: "Ayrica Mecidiyekoy dairesi de olabilir, ikisini birlikte gorsek guzel olur.",
      status: "DELIVERED",
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
  ];

  for (const msg of conv3Messages) {
    await prisma.message.create({ data: msg });
  }

  console.log(`  ✓ 3 konusma ve ${conv1Messages.length + conv2Messages.length + conv3Messages.length} mesaj olusturuldu`);
}

// ---------------------------------------------------------------------------
// Ana Seed Fonksiyonu
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║          Emlak CRM - Seed Islemleri Baslatildi          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");

  const startTime = Date.now();

  try {
    // 1. Lokasyonlar (Il, Ilce, Mahalle)
    await seedLocations();
    console.log("");

    // 2. Ozellikler (Features)
    await seedFeatures();
    console.log("");

    // 3. Portallar
    await seedPortals();
    console.log("");

    // 4. Demo Ofis
    const officeId = await seedDemoOffice();
    console.log("");

    // 5. Admin Kullanici
    const adminId = await seedAdminUser(officeId);
    console.log("");

    // 6. Ornek Musteriler
    const contactIds = await seedSampleContacts(officeId, adminId);
    console.log("");

    // 7. Ornek Gayrimenkuller
    const propertyIds = await seedSampleProperties(
      officeId,
      adminId,
      contactIds
    );
    console.log("");

    // 8. Ornek Satis Surecleri
    await seedSampleDeals(officeId, adminId, contactIds, propertyIds);
    console.log("");

    // 9. Ornek Konusmalar ve Mesajlar
    await seedSampleConversations(officeId, adminId, contactIds);
    console.log("");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log(`║   Seed Islemleri Basariyla Tamamlandi! (${elapsed}s)         ║`);
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log("");
    console.log("  Demo Giris Bilgileri:");
    console.log("    Email:  admin@emlakcrm.com");
    console.log("    Sifre:  password123");
    console.log("");
  } catch (error) {
    console.error("❌ Seed islemi sirasinda hata olustu:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
