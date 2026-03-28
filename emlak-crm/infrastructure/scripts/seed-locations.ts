// ============================================================================
// Emlak CRM - Turkiye Lokasyon Seed Verisi
// 81 Il, Ilce ve Mahalle verileri
// ============================================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// 81 Il (Province) - Plaka Kodlariyla
// ---------------------------------------------------------------------------
const iller: Array<{ name: string; plateCode: string }> = [
  { name: "Adana", plateCode: "01" },
  { name: "Adiyaman", plateCode: "02" },
  { name: "Afyonkarahisar", plateCode: "03" },
  { name: "Agri", plateCode: "04" },
  { name: "Amasya", plateCode: "05" },
  { name: "Ankara", plateCode: "06" },
  { name: "Antalya", plateCode: "07" },
  { name: "Artvin", plateCode: "08" },
  { name: "Aydin", plateCode: "09" },
  { name: "Balikesir", plateCode: "10" },
  { name: "Bilecik", plateCode: "11" },
  { name: "Bingol", plateCode: "12" },
  { name: "Bitlis", plateCode: "13" },
  { name: "Bolu", plateCode: "14" },
  { name: "Burdur", plateCode: "15" },
  { name: "Bursa", plateCode: "16" },
  { name: "Canakkale", plateCode: "17" },
  { name: "Cankiri", plateCode: "18" },
  { name: "Corum", plateCode: "19" },
  { name: "Denizli", plateCode: "20" },
  { name: "Diyarbakir", plateCode: "21" },
  { name: "Edirne", plateCode: "22" },
  { name: "Elazig", plateCode: "23" },
  { name: "Erzincan", plateCode: "24" },
  { name: "Erzurum", plateCode: "25" },
  { name: "Eskisehir", plateCode: "26" },
  { name: "Gaziantep", plateCode: "27" },
  { name: "Giresun", plateCode: "28" },
  { name: "Gumushane", plateCode: "29" },
  { name: "Hakkari", plateCode: "30" },
  { name: "Hatay", plateCode: "31" },
  { name: "Isparta", plateCode: "32" },
  { name: "Mersin", plateCode: "33" },
  { name: "Istanbul", plateCode: "34" },
  { name: "Izmir", plateCode: "35" },
  { name: "Kars", plateCode: "36" },
  { name: "Kastamonu", plateCode: "37" },
  { name: "Kayseri", plateCode: "38" },
  { name: "Kirklareli", plateCode: "39" },
  { name: "Kirsehir", plateCode: "40" },
  { name: "Kocaeli", plateCode: "41" },
  { name: "Konya", plateCode: "42" },
  { name: "Kutahya", plateCode: "43" },
  { name: "Malatya", plateCode: "44" },
  { name: "Manisa", plateCode: "45" },
  { name: "Kahramanmaras", plateCode: "46" },
  { name: "Mardin", plateCode: "47" },
  { name: "Mugla", plateCode: "48" },
  { name: "Mus", plateCode: "49" },
  { name: "Nevsehir", plateCode: "50" },
  { name: "Nigde", plateCode: "51" },
  { name: "Ordu", plateCode: "52" },
  { name: "Rize", plateCode: "53" },
  { name: "Sakarya", plateCode: "54" },
  { name: "Samsun", plateCode: "55" },
  { name: "Siirt", plateCode: "56" },
  { name: "Sinop", plateCode: "57" },
  { name: "Sivas", plateCode: "58" },
  { name: "Tekirdag", plateCode: "59" },
  { name: "Tokat", plateCode: "60" },
  { name: "Trabzon", plateCode: "61" },
  { name: "Tunceli", plateCode: "62" },
  { name: "Sanliurfa", plateCode: "63" },
  { name: "Usak", plateCode: "64" },
  { name: "Van", plateCode: "65" },
  { name: "Yozgat", plateCode: "66" },
  { name: "Zonguldak", plateCode: "67" },
  { name: "Aksaray", plateCode: "68" },
  { name: "Bayburt", plateCode: "69" },
  { name: "Karaman", plateCode: "70" },
  { name: "Kirikkale", plateCode: "71" },
  { name: "Batman", plateCode: "72" },
  { name: "Sirnak", plateCode: "73" },
  { name: "Bartin", plateCode: "74" },
  { name: "Ardahan", plateCode: "75" },
  { name: "Igdir", plateCode: "76" },
  { name: "Yalova", plateCode: "77" },
  { name: "Karabuk", plateCode: "78" },
  { name: "Kilis", plateCode: "79" },
  { name: "Osmaniye", plateCode: "80" },
  { name: "Duzce", plateCode: "81" },
];

// ---------------------------------------------------------------------------
// Ilce (District) verileri - Top 10 sehir icin
// ---------------------------------------------------------------------------
const ilceler: Record<string, string[]> = {
  // Istanbul (34)
  Istanbul: [
    "Adalar", "Arnavutkoy", "Atasehir", "Avcilar", "Bagcilar",
    "Bahcelievler", "Bakirkoy", "Basaksehir", "Bayrampasa", "Besiktas",
    "Beykoz", "Beylikduzu", "Beyoglu", "Buyukcekmece", "Catalca",
    "Cekmekoy", "Esenler", "Esenyurt", "Eyupsultan", "Fatih",
    "Gaziosmanpasa", "Gungoren", "Kadikoy", "Kagithane", "Kartal",
    "Kucukcekmece", "Maltepe", "Pendik", "Sancaktepe", "Sariyer",
    "Silivri", "Sultanbeyli", "Sultangazi", "Sile", "Sisli",
    "Tuzla", "Umraniye", "Uskudar", "Zeytinburnu",
  ],
  // Ankara (06)
  Ankara: [
    "Akyurt", "Altindag", "Ayas", "Bala", "Beypazari",
    "Camlidere", "Cankaya", "Cubuk", "Elmadag", "Etimesgut",
    "Evren", "Golbasi", "Gudul", "Haymana", "Kahramankazan",
    "Kalecik", "Kecioren", "Kizilcahamam", "Mamak", "Nallihan",
    "Polatli", "Pursaklar", "Sincan", "Sereflikochisar", "Yenimahalle",
  ],
  // Izmir (35)
  Izmir: [
    "Aliaga", "Balcova", "Bayindir", "Bayrakli", "Bergama",
    "Beydag", "Bornova", "Buca", "Cesme", "Cigli",
    "Dikili", "Foca", "Gaziemir", "Guzelbahce", "Karabaglar",
    "Karaburun", "Karsiyaka", "Kemalpasa", "Kinik", "Kiraz",
    "Konak", "Menderes", "Menemen", "Narlidere", "Odemis",
    "Seferihisar", "Selcuk", "Tire", "Torbali", "Urla",
  ],
  // Antalya (07)
  Antalya: [
    "Akseki", "Aksu", "Alanya", "Demre", "Dosemealti",
    "Elmali", "Finike", "Gazipasa", "Gundogmus", "Ibradi",
    "Kas", "Kemer", "Kepez", "Konyaalti", "Korkuteli",
    "Kumluca", "Manavgat", "Muratpasa", "Serik",
  ],
  // Bursa (16)
  Bursa: [
    "Buyukorhan", "Gemlik", "Gorukle", "Gursu", "Harmancik",
    "Inegol", "Iznik", "Karacabey", "Keles", "Kestel",
    "Mudanya", "Mustafakemalpasa", "Nilufer", "Orhaneli",
    "Orhangazi", "Osmangazi", "Yenisehir", "Yildirim",
  ],
  // Adana (01)
  Adana: [
    "Aladag", "Ceyhan", "Cukurova", "Feke", "Imamoglu",
    "Karaisali", "Karatas", "Kozan", "Pozanti", "Saimbeyli",
    "Saricam", "Seyhan", "Tufanbeyli", "Yumurtalik", "Yuregir",
  ],
  // Konya (42)
  Konya: [
    "Ahirli", "Aksehir", "Altinekin", "Beyhekim", "Beysehir",
    "Bozkir", "Cihanbeyli", "Cumra", "Derbent", "Derebucak",
    "Doganhisar", "Emirgazi", "Eregli", "Guneysinir", "Hadim",
    "Halkapinar", "Huyuk", "Ilgin", "Kadinhani", "Karapinar",
    "Karatay", "Kulu", "Meram", "Sarayonu", "Selcuklu",
    "Seydisehir", "Taskent", "Tuzlukcu", "Yalihuyuk", "Yunak",
  ],
  // Gaziantep (27)
  Gaziantep: [
    "Araban", "Islahiye", "Karkamis", "Nizip", "Nurdagi",
    "Oguzeli", "Sahinbey", "Sehitkamil", "Yavuzeli",
  ],
  // Mersin (33)
  Mersin: [
    "Akdeniz", "Anamur", "Aydincik", "Bozyazi", "Camliyayla",
    "Erdemli", "Gulnar", "Mezitli", "Mut", "Silifke",
    "Tarsus", "Toroslar", "Yenisehir",
  ],
  // Kayseri (38)
  Kayseri: [
    "Akkisla", "Bunyan", "Develi", "Felahiye", "Hacilar",
    "Incesu", "Kocasinan", "Melikgazi", "Ozvatan", "Pinarbaşi",
    "Sarioglan", "Sariz", "Talas", "Tomarza", "Yahyali",
    "Yesilhisar",
  ],
};

// ---------------------------------------------------------------------------
// Mahalle (Neighborhood) verileri - Istanbul ilceleri icin ornek
// ---------------------------------------------------------------------------
const mahalleler: Record<string, string[]> = {
  // Kadikoy
  Kadikoy: [
    "Caferaga", "Osmanaga", "Rasimpasa", "Moda", "Fenerbahce",
    "Caddebostan", "Suadiye", "Bostanci", "Kozyatagi", "Acibadem",
    "Goztepe", "Erenköy", "Fikirtepe", "Hasanpasa", "Sahrayicedit",
    "19 Mayis", "Merdivenköy", "Zühtüpasa",
  ],
  // Besiktas
  Besiktas: [
    "Abbasaga", "Akatlar", "Arnavutkoy", "Balmumcu", "Bebek",
    "Cihannuma", "Dikilitaş", "Etiler", "Gayrettepe", "Konaklar",
    "Kuruçeşme", "Levent", "Levazim", "Mecidiye", "Muradiye",
    "Nisbetiye", "Ortakoy", "Sinanpaşa", "Türkali", "Ulus",
    "Vişnezade", "Yıldız",
  ],
  // Sisli
  Sisli: [
    "Bomonti", "Cumhuriyet", "Ergenekon", "Esentepe", "Fulya",
    "Halaskargazi", "Harbiye", "Kaptanpaşa", "Mecidiyeköy",
    "Meşrutiyet", "Nişantaşi", "Osmanbey", "Paşa", "Teşvikiye",
  ],
  // Atasehir
  Atasehir: [
    "Aşik Veysel", "Barbaros", "Esatpaşa", "Ferhatpaşa",
    "Içerenköy", "Kayışdagi", "Küçükbakkalköy", "Mevlana",
    "Mustafa Kemal", "Yeni Çamlica", "Yeni Sahra",
  ],
  // Bakirkoy
  Bakirkoy: [
    "Ataköy 1. Kisim", "Ataköy 2-5-6. Kisim", "Ataköy 3-4-11. Kisim",
    "Ataköy 7-8-9-10. Kisim", "Basınköy", "Cevizlik", "Kartaltepe",
    "Osmaniye", "Sakizagaci", "Şenlikköy", "Yeşilköy", "Yeşilyurt",
    "Zuhuratbaba",
  ],
  // Fatih
  Fatih: [
    "Aksaray", "Alemdar", "Balat", "Beyazit", "Cankurtaran",
    "Cerrahpaşa", "Eminönü", "Fener", "Haseki", "Kumkapi",
    "Laleli", "Sultanahmet", "Süleymaniye", "Vefa", "Yenikapı",
  ],
  // Beyoglu
  Beyoglu: [
    "Asmalimescit", "Cihangir", "Galata", "Galatasaray",
    "Gümüşsuyu", "Kalyoncu Kullugu", "Kasımpaşa",
    "Piyalepaşa", "Tarlabaşi", "Tophane", "Tünel",
  ],
  // Sariyer
  Sariyer: [
    "Bahçeköy", "Baltalimanı", "Büyükdere", "Çayırbaşı",
    "Emirgan", "İstinye", "Maslak", "Rumelihisari",
    "Tarabya", "Yeniköy", "Zekeriyaköy",
  ],
  // Uskudar
  Uskudar: [
    "Acıbadem", "Altunizade", "Bağlarbaşi", "Beylerbeyi",
    "Burhaniye", "Çengelköy", "Kandilli", "Kısıklı",
    "Kuzguncuk", "Salacak", "Ünalan", "Validei Atik",
  ],
  // Umraniye
  Umraniye: [
    "Altınşehir", "Armağanevler", "Aşağı Dudullu", "Atakent",
    "Çakmak", "Çamlık", "Dumlupinar", "Elmalıkent",
    "Hekimbaşi", "İnkılap", "İstiklal", "Namık Kemal",
    "Parseller", "Tantavi", "Topağacı", "Yukarı Dudullu",
  ],
};

// ---------------------------------------------------------------------------
// Seed Fonksiyonu
// ---------------------------------------------------------------------------
export async function seedLocations(): Promise<void> {
  console.log("📍 Lokasyon verileri yukleniyor...");

  // Il (Province) kayitlari olustur
  const ilMap = new Map<string, string>();

  for (const il of iller) {
    const created = await prisma.il.upsert({
      where: { plateCode: il.plateCode },
      update: { name: il.name },
      create: {
        name: il.name,
        plateCode: il.plateCode,
      },
    });
    ilMap.set(il.name, created.id);
  }
  console.log(`  ✓ ${iller.length} il eklendi`);

  // Ilce (District) kayitlari olustur
  let ilceCount = 0;
  const ilceMap = new Map<string, string>();

  for (const [ilName, districts] of Object.entries(ilceler)) {
    const ilId = ilMap.get(ilName);
    if (!ilId) {
      console.warn(`  ⚠ Il bulunamadi: ${ilName}`);
      continue;
    }

    for (const districtName of districts) {
      const created = await prisma.ilce.upsert({
        where: {
          ilId_name: { ilId, name: districtName },
        },
        update: {},
        create: {
          ilId,
          name: districtName,
        },
      });
      ilceMap.set(`${ilName}-${districtName}`, created.id);
      ilceCount++;
    }
  }
  console.log(`  ✓ ${ilceCount} ilce eklendi`);

  // Mahalle (Neighborhood) kayitlari olustur - Istanbul ilceleri icin
  let mahalleCount = 0;

  for (const [ilceName, neighborhoods] of Object.entries(mahalleler)) {
    const ilceId = ilceMap.get(`Istanbul-${ilceName}`);
    if (!ilceId) {
      console.warn(`  ⚠ Ilce bulunamadi: Istanbul-${ilceName}`);
      continue;
    }

    for (const mahalleName of neighborhoods) {
      await prisma.mahalle.upsert({
        where: {
          ilceId_name: { ilceId, name: mahalleName },
        },
        update: {},
        create: {
          ilceId,
          name: mahalleName,
        },
      });
      mahalleCount++;
    }
  }
  console.log(`  ✓ ${mahalleCount} mahalle eklendi`);

  console.log("📍 Lokasyon verileri tamamlandi.");
}

// Dogrudan calistirildiginda
if (require.main === module) {
  seedLocations()
    .then(() => {
      console.log("Lokasyon seed tamamlandi.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Lokasyon seed hatasi:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
