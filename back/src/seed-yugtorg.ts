/**
 * ЮГТОРГ (Yugtorg) supplier import — 2026-08-27
 * Source: b2b.yugtorg.com B2B API (MUST + Felicity product ids supplied by the owner).
 *
 * Behaviour (per owner's request):
 *   • Products are created with price = 0  → storefront shows "Ціну уточнюйте".
 *   • The supplier price goes into the ЮГТОРГ price MATRIX (SupplierPrice), NOT the product price.
 *   • Product photos are downloaded from Yugtorg into UPLOAD_DIR (self-hosted, /uploads/...),
 *     with a graceful fallback to the remote URL if a download fails.
 *   • warranty is left EMPTY — the owner fills it in manually in the admin.
 *
 * Availability map from Yugtorg stock symbol `count`:  +++/++ → in_stock,  + → preorder.
 *
 * Usage (local dev):   npx tsx src/seed-yugtorg.ts
 * Usage (production):  node dist/seed-yugtorg.js   (inside the volthouse-back container)
 *
 * Idempotent: re-running refreshes name/category/brand/features/photos and the supplier
 * price, but preserves any manually-set product price, warranty and enabled flag.
 */

import fs from "fs";
import path from "path";
import { prisma } from "./prisma";
import { uploadDir, ensureUploadDir } from "./upload";

const SUPPLIER_NAME = "ЮГТОРГ";

const BRANDS: Array<{ slug: string; name: string; country: string; description: string }> = [
  { slug: "must", name: "MUST", country: "Китай", description: "Інвертори та акумулятори MUST." },
  { slug: "felicity", name: "Felicity", country: "Китай", description: "Інвертори та системи накопичення енергії FelicityESS." },
];

type Row = {
  id: string;
  yug: string;
  name: string;
  category: string;
  brandSlug: string;
  features: string[];
  srcImages: string[];
  price: number;
  availability: "in_stock" | "preorder" | "unavailable";
};

const ROWS: Row[] = [
  { id: "must-45192", yug: "45192", category: "battery", brandSlug: "must", price: 175, availability: "in_stock",
    name: "Акумуляторна батарея GEL Must FCDG12-100 12 V 100 Ah (330 x 220 x 170), 28 kg",
    features: ["Модель: FCDG12-100", "28 kg"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/45192-500x500.png"] },
  { id: "must-28906", yug: "28906", category: "inverter", brandSlug: "must", price: 215, availability: "in_stock",
    name: "Гiбрiдний ДБЖ MUST PV18-1012VPM II, 1000W, 12V, ток заряда 10/20A, 160-275V, MPPT (45А, 105 Vdc)",
    features: ["Модель: PV18-1012VPM II", "1000W", "12V", "ток заряда 10/20A", "160-275V", "MPPT (45А, 105 Vdc)"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/28906-500x500.png", "https://b2b.yugtorg.com/image/cache/data/28906_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/28906_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/28906_3-500x500.png"] },
  { id: "must-46146", yug: "46146", category: "inverter", brandSlug: "must", price: 215, availability: "in_stock",
    name: "Гiбрiдний ДБЖ MUST PV18-1012VPM, 1000W, 12V, ток заряда 10-20A, 170-280V, MPPT (60А, 105 Vdc), 225*355*92 мм, 5.5 кг",
    features: ["Модель: PV18-1012VPM", "1000W", "12V", "ток заряда 10-20A", "170-280V", "MPPT (60А, 105 Vdc)", "225*355*92 мм"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46146-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46146_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46146_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46146_3-500x500.png"] },
  { id: "must-46121", yug: "46121", category: "inverter", brandSlug: "must", price: 215, availability: "in_stock",
    name: "Гібридний інвертор MUST PV18-1012VMPK, 1000W, 12V, струм заряду 10/20A, 230V/4.35A, MPPT (60А, 105 Vdc)",
    features: ["Модель: PV18-1012VMPK", "1000W", "12V", "струм заряду 10/20A", "230V/4.35A", "MPPT (60А, 105 Vdc)"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46121-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46121_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46121_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46121_3-500x500.png"] },
  { id: "must-37155", yug: "37155", category: "inverter", brandSlug: "must", price: 230, availability: "in_stock",
    name: "Гiбрiдний ДБЖ MUST PV18-1512VPM, 1500W, 12V, ток заряда 10/20А, 160-275V, MPPT (60А, 15-145 Vdc)",
    features: ["Модель: PV18-1512VPM", "1500W", "12V", "ток заряда 10/20А", "160-275V", "MPPT (60А, 15-145 Vdc)"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/37155-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37155_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37155_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37155_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37155_4-500x500.png"] },
  { id: "must-44593", yug: "44593", category: "inverter", brandSlug: "must", price: 260, availability: "in_stock",
    name: "Гібридний інвертор MUST PV18-2012ECO, 2000W, 12V, струм заряду 80A, 170-280V, MPPT (80А, 30-320 Vdc), 290х367х111 мм. 6 кг.",
    features: ["Модель: PV18-2012ECO", "2000W", "12V", "струм заряду 80A", "170-280V", "MPPT (80А, 30-320 Vdc)", "290х367х111 мм. 6 кг."],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/44593-500x500.png", "https://b2b.yugtorg.com/image/cache/data/44593_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/44593_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/44593_3-500x500.png"] },
  { id: "must-48110", yug: "48110", category: "inverter", brandSlug: "must", price: 260, availability: "in_stock",
    name: "Гібридний інвертор MUST PV18-2012PRO, 2000 Вт/1600 Вт, 12 В, струм заряду 80 А, Wi-Fi, RS485/CAN, 170–280 В, MPPT (80 А, 30–320 В постійного струму), 318 × 369 × 121 мм. 6,2 кг.",
    features: ["Модель: PV18-2012PRO", "2000 Вт/1600 Вт", "12 В", "струм заряду 80 А", "Wi-Fi", "RS485/CAN", "170–280 В"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/48110-500x500.png", "https://b2b.yugtorg.com/image/cache/data/48110_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/48110_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/48110_3-500x500.png"] },
  { id: "must-46120", yug: "46120", category: "inverter", brandSlug: "must", price: 330, availability: "in_stock",
    name: "Гібридний інвертор MUST PV18-3024VMPK, 3000W, 24V, струм заряду 20/30A, 230V/13A, MPPT (60А, 145 Vdc), 272x355x100 мм, 7.8 кг",
    features: ["Модель: PV18-3024VMPK", "3000W", "24V", "струм заряду 20/30A", "230V/13A", "MPPT (60А, 145 Vdc)", "272x355x100 мм"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46120-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46120_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46120_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46120_3-500x500.png"] },
  { id: "must-37156", yug: "37156", category: "inverter", brandSlug: "must", price: 325, availability: "in_stock",
    name: "Гiбрiдне ДБЖ MUST PV18-3224VPM II, 3200W, 24V, ток заряда 60A, 160-275V, MPPT (60А, 30-160 Vdc)",
    features: ["Модель: PV18-3224VPM II", "3200W", "24V", "ток заряда 60A", "160-275V", "MPPT (60А, 30-160 Vdc)"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/37156-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37156_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37156_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37156_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37156_4-500x500.png"] },
  { id: "must-48138", yug: "48138", category: "inverter", brandSlug: "must", price: 420, availability: "in_stock",
    name: "Гібридний інвертор MUST PV18-3624PREM, 3600W, 24 В, струм заряду AC 60 А/PV 100 А, 170–280 В, Wi-Fi, USB, RS485, CAN, MPPT (100 А, 60–360 В постійного струму), 318×454×122 мм, 7,8 кг.",
    features: ["Модель: PV18-3624PREM", "3600W", "24 В", "струм заряду AC 60 А/PV 100 А", "170–280 В", "Wi-Fi", "USB"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/48138-500x500.png", "https://b2b.yugtorg.com/image/cache/data/48138_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/48138_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/48138_3-500x500.png"] },
  { id: "must-44595", yug: "44595", category: "inverter", brandSlug: "must", price: 360, availability: "in_stock",
    name: "Гібридний інвертор MUST PV18-4024ECO. 4000W, 24V, струм заряду 60A, 170-280V, MPPT (100А, 60-360 Vdc), 318 454 122.5 мм. 8 кг.",
    features: ["Модель: PV18-4024ECO", "24V", "струм заряду 60A", "170-280V", "MPPT (100А, 60-360 Vdc)", "318 454 122.5 мм. 8 кг."],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/44595-500x500.png", "https://b2b.yugtorg.com/image/cache/data/44595_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/44595_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/44595_3-500x500.png"] },
  { id: "must-46904", yug: "46904", category: "inverter", brandSlug: "must", price: 440, availability: "in_stock",
    name: "Гібридний інвертор MUST PV18-4024PREM, 4000 Вт, 24 В, струм заряду AC 60 А/PV 100 А, 170–280 В, Wi-Fi, USB, RS485, CAN, MPPT (100 А, 60–360 В постійного струму), 318×454×122 мм.",
    features: ["Модель: PV18-4024PREM", "4000 Вт", "24 В", "струм заряду AC 60 А/PV 100 А", "170–280 В", "Wi-Fi", "USB"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46904-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46904_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46904_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46904_3-500x500.png"] },
  { id: "must-46974", yug: "46974", category: "inverter", brandSlug: "must", price: 700, availability: "in_stock",
    name: "Гібридний інвертор MUST PV19-10048EXP, 10 кВт, 48 В, струм заряду 150 А, однофазний, 90–450 В, 2-MPPT, PV 450 В. 425 × 527 × 145 мм, 21 кг",
    features: ["Модель: PV19-10048EXP", "10 кВт", "48 В", "струм заряду 150 А", "однофазний", "90–450 В", "2-MPPT"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46974-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46974_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46974_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46974_3-500x500.png"] },
  { id: "must-41859", yug: "41859", category: "inverter", brandSlug: "must", price: 1680, availability: "preorder",
    name: "Гібридний інвертор MUST PH11-12KL3 EU, 3Ф-12kW, 48V, 200-650V, MPPT, PV 800V, 444*654*260mm, 35kg",
    features: ["Модель: PH11-12KL3 EU", "3Ф-12kW", "48V", "200-650V", "MPPT", "PV 800V", "444*654*260mm"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/41859-500x500.png"] },
  { id: "must-32858", yug: "32858", category: "battery", brandSlug: "must", price: 330, availability: "in_stock",
    name: "Акумуляторна батарея Must LiFePO4 LP15-12100 12,8V 100Ah, 1,28kWh, BMS50A@4S, 6000 cycles, 339x185x218, 12kg",
    features: ["Модель: LP15-12100", "1,28kWh", "BMS50A@4S", "6000 cycles", "339x185x218", "12kg"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/32858-500x500.png", "https://b2b.yugtorg.com/image/cache/data/32858_1-500x500.png"] },
  { id: "must-32859", yug: "32859", category: "battery", brandSlug: "must", price: 460, availability: "in_stock",
    name: "Акумуляторна батарея Must LiFePO4 LP15-12200 12,8V 200Ah, 2,56kWh, BMS100A@4S, 6000 cycles, 502x185x243, 23kg",
    features: ["Модель: LP15-12200", "2,56kWh", "BMS100A@4S", "6000 cycles", "502x185x243", "23kg"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/32859-500x500.png", "https://b2b.yugtorg.com/image/cache/data/32859_1-500x500.png"] },
  { id: "must-46598", yug: "46598", category: "inverter", brandSlug: "must", price: 58, availability: "in_stock",
    name: "Роз’єм інверторний Must WiFi PLUG V2.0",
    features: ["Модель: must-wi-fi V2.0"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46598-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46598_1-500x500.png"] },
  { id: "must-32860", yug: "32860", category: "battery", brandSlug: "must", price: 640, availability: "in_stock",
    name: "Акумуляторна батарея Must LiFePO4 25.6V 100Ah ( 450 x 400 x 140 ), 23kg, монтаж на стіну",
    features: ["Модель: LP16-24100", "23kg", "монтаж на стіну"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/32860-500x500.png", "https://b2b.yugtorg.com/image/cache/data/32860_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/32860_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/32860_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/32860_4-500x500.png"] },
  { id: "must-32866", yug: "32866", category: "battery", brandSlug: "must", price: 560, availability: "in_stock",
    name: "Акумуляторна батарея Must LiFePO4 LP15-24100 25.6V 100Ah, 2,56kWh, BMS50A@4S, 6000 cycles, 522x240x218, 23kg",
    features: ["Модель: LP15-24100", "2,56kWh", "BMS50A@4S", "6000 cycles", "522x240x218", "23kg"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/32866-500x500.png", "https://b2b.yugtorg.com/image/cache/data/32866_1-500x500.png"] },
  { id: "must-32861", yug: "32861", category: "battery", brandSlug: "must", price: 920, availability: "in_stock",
    name: "Акумуляторна батарея Must LiFePO4 LP16-24200 25.6V 200Ah, 5,12kWh, BMS100A@8S, CAN2.0/RS232/RS485, 6000 cycles, 450*445*227,44kg",
    features: ["Модель: LP16-24200", "5,12kWh", "BMS100A@8S", "CAN2.0/RS232/RS485", "6000 cycles", "450*445*227,44kg"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/32861-500x500.png", "https://b2b.yugtorg.com/image/cache/data/32861_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/32861_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/32861_3-500x500.png"] },
  { id: "must-45525", yug: "45525", category: "battery", brandSlug: "must", price: 1150, availability: "in_stock",
    name: "Акумуляторна батарея Must LiFePO4 LP16-24320 25.6V 300Ah, 8,2kWh, BMS100A@8S, CAN2.0/RS232/RS485, 6000 cycles",
    features: ["Модель: LP16-24320", "8,2kWh", "BMS100A@8S", "CAN2.0/RS232/RS485", "6000 cycles"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/45525-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45525_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45525_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45525_3-500x500.png"] },
  { id: "must-32862", yug: "32862", category: "battery", brandSlug: "must", price: 950, availability: "in_stock",
    name: "Акумуляторна батарея Must LiFePO4 LP16-48100 51.2V 100Ah, 5,12kWh, BMS100A@16S, CAN2.0/RS232/RS485, 6000 cycles, 625x442x177,44kg",
    features: ["Модель: LP16-48100", "5,12kWh", "BMS100A@16S", "CAN2.0/RS232/RS485", "6000 cycles", "625x442x177,44kg"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/32862-500x500.png", "https://b2b.yugtorg.com/image/cache/data/32862_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/32862_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/32862_3-500x500.png"] },
  { id: "felicity-37973", yug: "37973", category: "battery", brandSlug: "felicity", price: 720, availability: "preorder",
    name: "Блок керування FelicityESS LiFePO4 FLH48100UCG1,BMS100A@, CAN&RS485, IP21, 6000Cycles, 482,6x565x150mm,10,3kg (у комплекті мінімум з 8 акумуляторами)",
    features: ["Модель: FLH48100UCG1", "CAN&RS485", "IP21", "6000Cycles", "482,6x565x150mm,10,3kg (у комплекті мінімум з 8 акумуляторами)"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/37973-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37973_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37973_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37973_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37973_4-500x500.png"] },
  { id: "felicity-46804", yug: "46804", category: "battery", brandSlug: "felicity", price: 800, availability: "in_stock",
    name: "Аккумулятор FelicityESS LiFePO4 FLH48100UMG2, 51.2V 100Аh, 5,12kW, CAN&RS485, IP21, 6000Cycles, 482,6x565x131mm,55kg",
    features: ["Модель: FLH48100UMG2", "51.2V 100Аh", "5,12kW", "CAN&RS485", "IP21", "6000Cycles", "482,6x565x131mm,55kg"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46804-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46804_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46804_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46804_3-500x500.png"] },
  { id: "felicity-46354", yug: "46354", category: "battery", brandSlug: "felicity", price: 720, availability: "in_stock",
    name: "Блок керування FelicityESS LiFePO4 FLH48100UCG2,BMS100A@, CAN&RS485, IP21, 6000Cycles, 482,6x565x150mm,10,3kg (у комплекті мінімум з 8 акумуляторами)",
    features: ["Модель: FLH48100UCG2", "CAN&RS485", "IP21", "6000Cycles", "482,6x565x150mm,10,3kg (у комплекті мінімум з 8 акумуляторами)"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46354-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46354_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46354_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46354_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46354_4-500x500.png"] },
  { id: "felicity-45564", yug: "45564", category: "inverter", brandSlug: "felicity", price: 360, availability: "in_stock",
    name: "Гібридний інвертор Felicity IVCM3024PRO, 3000VA, 24V, RS485, 90-280 Vac, MPPT(30-120), 10-90AOFFG",
    features: ["Модель: IVCM3024PRO", "3000VA", "24V", "RS485", "90-280 Vac", "MPPT(30-120)", "10-90AOFFG"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/45564-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45564_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45564_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45564_3-500x500.png"] },
  { id: "felicity-37975", yug: "37975", category: "battery", brandSlug: "felicity", price: 460, availability: "preorder",
    name: "Стойка FelicityESS FLH48100R13G1 ,560x590x2077.5(13 pcs)",
    features: ["Модель: FLH48100R13G1"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/37975-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37975_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37975_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37975_3-500x500.png"] },
  { id: "felicity-46268", yug: "46268", category: "battery", brandSlug: "felicity", price: 410, availability: "in_stock",
    name: "Стойка FelicityESS FLH48100R13G2 ,560x590x2077.5(13 pcs)",
    features: ["Модель: FLH48100R13G2"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46268-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46268_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46268_2-500x500.png"] },
  { id: "felicity-47018", yug: "47018", category: "battery", brandSlug: "felicity", price: 350, availability: "in_stock",
    name: "Стойка FelicityESS FLH48100R9G2 ,560x590x2077.5(13 pcs)",
    features: ["Модель: FLH48100R9G2"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/47018-500x500.png", "https://b2b.yugtorg.com/image/cache/data/47018_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/47018_2-500x500.png"] },
  { id: "felicity-37972", yug: "37972", category: "battery", brandSlug: "felicity", price: 650, availability: "preorder",
    name: "Блок керування FelicityESS LiFePO4 LUX-X-96050HCG01,BMS60A@, CAN&RS485, IP21, 6000Cycles, 600x385x200mm, 57,5kg",
    features: ["Модель: LUX-X-96050HСG01", "CAN&RS485", "IP21", "6000Cycles", "600x385x200mm", "57,5kg"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/37972-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37972_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37972_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37972_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37972_4-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37972_5-500x500.png"] },
  { id: "felicity-46307", yug: "46307", category: "battery", brandSlug: "felicity", price: 16, availability: "preorder",
    name: "Комплект скоб (2 шт) для вертикального кріплення АКБ Felicity FLA48100UG1",
    features: ["Модель: STINBR/FLA48100UG1-WM"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46307-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46307_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46307_2-500x500.png"] },
  { id: "felicity-46306", yug: "46306", category: "battery", brandSlug: "felicity", price: 16, availability: "in_stock",
    name: "Комплект скоб (4 шт) для горизонтального штабелювання АКБ Felicity FLA48100UG1",
    features: ["Модель: STINBR/FLA48100UG1-W"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46306-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46306_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46306_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46306_3-500x500.png"] },
  { id: "felicity-37993", yug: "37993", category: "inverter", brandSlug: "felicity", price: 850, availability: "in_stock",
    name: "Гібридний інвертор Felicity T-REX-5KLP1G01 MPPT(100V~500V), струм заряду 100А(Parallel) IP65",
    features: ["Модель: T-REX-5KLP1G01", "струм заряду 100А(Parallel) IP65"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/37993-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37993_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37993_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37993_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37993_4-500x500.png"] },
  { id: "felicity-45767", yug: "45767", category: "inverter", brandSlug: "felicity", price: 950, availability: "in_stock",
    name: "Гібридний інвертор Felicity T-REX-6KLP1G01 MPPT(100V~500V), ток заряда 100А(Parallel) IP65",
    features: ["Модель: T-REX-6KLP1G01", "ток заряда 100А(Parallel) IP65"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/45767-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45767_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45767_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45767_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45767_4-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45767_5-500x500.png"] },
  { id: "felicity-47728", yug: "47728", category: "inverter", brandSlug: "felicity", price: 1250, availability: "preorder",
    name: "Гібридний інвертор Felicity IVGM8KLP1G1 8000W 48V MPPT(100V~500V), ток заряда 100А(Parallel) IP65",
    features: ["Модель: IVGM8KLP1G1", "ток заряда 100А(Parallel) IP65"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/47728-500x500.png", "https://b2b.yugtorg.com/image/cache/data/47728_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/47728_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/47728_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/47728_4-500x500.png", "https://b2b.yugtorg.com/image/cache/data/47728_5-500x500.png"] },
  { id: "felicity-37995", yug: "37995", category: "inverter", brandSlug: "felicity", price: 1450, availability: "in_stock",
    name: "Гібридний інвертор трифазний низьковольтний Felicity T-REX-10KLP3G01 10kW,48V MPPT(160-850) 200A",
    features: ["Модель: T-REX-10KLP3G01"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/37995-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37995_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37995_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37995_3-500x500.png"] },
  { id: "felicity-45783", yug: "45783", category: "inverter", brandSlug: "felicity", price: 3000, availability: "preorder",
    name: "Гібридний інвертор трифазний низьковольтний Felicity IVGM30KHP3G2 33kW(160-800V) MPPT(150-850V) 36A/2 HY(Parallel), 940x585x340mm, 87kg",
    features: ["Модель: IVGM30KHP3G2", "940x585x340mm", "87kg"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/45783-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45783_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45783_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45783_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45783_4-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45783_5-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45783_6-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45783_7-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45783_8-500x500.png"] },
  { id: "felicity-48111", yug: "48111", category: "battery", brandSlug: "felicity", price: 570, availability: "preorder",
    name: "Акумулятор FelicityESS FLA12200 12 В 200 А·год, BMS 100/150 А при 8S, 2,56 кВт, до 15 паралельних з'єднань, CAN та RS485, IP21, 6000 циклів",
    features: ["Модель: FLA12200", "BMS 100/150 А при 8S", "2,56 кВт", "до 15 паралельних з'єднань", "CAN та RS485", "IP21", "6000 циклів"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/48111-500x500.png", "https://b2b.yugtorg.com/image/cache/data/48111_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/48111_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/48111_3-500x500.png"] },
  { id: "felicity-44963", yug: "44963", category: "battery", brandSlug: "felicity", price: 620, availability: "in_stock",
    name: "Аккумулятор FelicityESS FLA24100-EU 24v 100Ah, BMS 100/150A@8S, 2.56kW, до 15 parallel, CAN&RS485, IP21, 6000Cycles, 454*380*154sm, 27KG",
    features: ["Модель: FLA24100-EU 24v 100Ah", "BMS 100/150A@8S", "2.56kW", "до 15 parallel", "CAN&RS485", "IP21", "6000Cycles"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/44963-500x500.png", "https://b2b.yugtorg.com/image/cache/data/44963_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/44963_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/44963_3-500x500.png"] },
  { id: "felicity-46238", yug: "46238", category: "battery", brandSlug: "felicity", price: 620, availability: "in_stock",
    name: "Акумулятор FelicityESS FLA24100WG2 24v 100Ah, BMS 100/150A@8S, 2.56kW, до 15 parallel, CAN&RS485, IP21, 6000Cycles, 454*380*154sm, 27KG",
    features: ["Модель: FLA24100WG2 24v 100Ah", "BMS 100/150A@8S", "2.56kW", "до 15 parallel", "CAN&RS485", "IP21", "6000Cycles"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46238-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46238_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46238_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46238_3-500x500.png"] },
  { id: "felicity-46264", yug: "46264", category: "battery", brandSlug: "felicity", price: 1000, availability: "in_stock",
    name: "Акумулятор FelicityESS LiFePO4 FLA24200 24v 200Ah, BMS 100A@8S, 5kW, до 6 parallel, CAN&RS485, IP21, 6000Cycles, 415*390*162mm,33KG",
    features: ["Модель: FLA24200 24v 200Ah", "BMS 100A@8S", "5kW", "до 6 parallel", "CAN&RS485", "IP21", "6000Cycles"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46264-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46264_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46264_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46264_3-500x500.png"] },
  { id: "felicity-45460", yug: "45460", category: "battery", brandSlug: "felicity", price: 930, availability: "in_stock",
    name: "Аккумулятор FelicityESS LiFePO4 FLB48100WG1-H (Heating) 51.2V 5.12kWh. BMS 100А, до 32 parallel, CAN/RS485, IP65. 650x450x174 мм. 48.5 кг.",
    features: ["Модель: FLB48100WG1-H", "до 32 parallel", "CAN/RS485", "IP65. 650x450x174 мм. 48.5 кг."],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/45460-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45460_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45460_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45460_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45460_4-500x500.png"] },
  { id: "felicity-44978", yug: "44978", category: "battery", brandSlug: "felicity", price: 820, availability: "in_stock",
    name: "Акумулятор FelicityESS LiFePO4 FLA48100UG1 51.2V 5.12kWh. BMS 100А, до 32 parallel, CAN/RS485, IP21. 575x483x133 мм. 43 кг.",
    features: ["Модель: FLA48100UG1", "до 32 parallel", "CAN/RS485", "IP21. 575x483x133 мм. 43 кг."],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/44978-500x500.png", "https://b2b.yugtorg.com/image/cache/data/44978_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/44978_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/44978_3-500x500.png"] },
  { id: "felicity-45779", yug: "45779", category: "battery", brandSlug: "felicity", price: 1720, availability: "in_stock",
    name: "Акумулятор FelicityESS FLB48230WG1-H 48v 230Ah, BMS 100/150A@16S, 11.7kW, до 32 parallel, charge -20-50°C, CAN&RS485, IP65, 6000Cycles, 683*450*274mm,91kg",
    features: ["Модель: FLB48230WG1-H", "BMS 100/150A@16S", "11.7kW", "до 32 parallel", "charge -20-50°C", "CAN&RS485", "IP65"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/45779-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45779_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45779_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45779_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/45779_4-500x500.png"] },
  { id: "felicity-48094", yug: "48094", category: "battery", brandSlug: "felicity", price: 2000, availability: "in_stock",
    name: "Акумулятор FelicityESS FLA48280TG2-EU 48v 280Ah, BMS 150A@16S, 14.3kW, до 15 parallel, CAN&RS485, Wi-Fi, Bluetooth, IP21, 8000Cycles, 135kg",
    features: ["Модель: FLA48280TG2-EU", "BMS 150A@16S", "14.3kW", "до 15 parallel", "CAN&RS485", "Wi-Fi", "Bluetooth"],
    srcImages: [] },
  { id: "felicity-48095", yug: "48095", category: "battery", brandSlug: "felicity", price: 3400, availability: "in_stock",
    name: "Акумулятор FelicityESS LiFePO4 FLA48460-EU 48v 460Ah, BMS 200A. 16S, 23.6kW, до 6 parallel, CAN&RS485, IP21, 6000Cycles, 718*380*990, 226kg",
    features: ["Модель: FLA48460TG2-EU", "BMS 200A. 16S", "23.6kW", "до 6 parallel", "CAN&RS485", "IP21", "6000Cycles"],
    srcImages: [] },
  { id: "felicity-37979", yug: "37979", category: "battery", brandSlug: "felicity", price: 4300, availability: "preorder",
    name: "Акумулятор FelicityESS LiFePO4 FLA48500 48v 500Ah, BMS 200A, 16S, 25kW, до 6 parallel, CAN&RS485, IP21, 6000Cycles, 718*380*990, 218kg",
    features: ["Модель: FLA48500", "BMS 200A", "16S", "25kW", "до 6 parallel", "CAN&RS485", "IP21"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/37979-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37979_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37979_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/37979_3-500x500.png"] },
  { id: "felicity-46773", yug: "46773", category: "battery", brandSlug: "felicity", price: 920, availability: "preorder",
    name: "Блок управління з вбудованим акумулятором FelicityESS LiFePO4 FLS48100SCG2 51,2 В 100 А·год, BMS50-400A@16S, 5,12 кВт·год, до 8 паралельних, CAN&RS485, IP21, 6000 циклів, IP20, 600x450x180 мм, 46 кг",
    features: ["Модель: FLS48100SCG2", "BMS50-400A@16S", "5,12 кВт·год", "до 8 паралельних", "CAN&RS485", "IP21", "6000 циклів"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46773-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46773_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46773_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46773_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46773_4-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46773_5-500x500.png"] },
  { id: "felicity-46772", yug: "46772", category: "battery", brandSlug: "felicity", price: 880, availability: "in_stock",
    name: "Акумулятор FelicityESS LiFePO4 FLS48100SMG2 51,2 В 100 А, 16S, 5,12 кВт·год, до 8 паралельних, CAN&RS485, IP21, 6000 циклів, IP21, 600x450x180 мм, 46 кг",
    features: ["Модель: FLS48100SMG2", "16S", "5,12 кВт·год", "до 8 паралельних", "CAN&RS485", "IP21", "6000 циклів"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/46772-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46772_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46772_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46772_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/46772_4-500x500.png"] },
  { id: "felicity-38849", yug: "38849", category: "battery", brandSlug: "felicity", price: 950, availability: "preorder",
    name: "Модуль керування Felicity LUX-X-48100LCG01 48V 600*450*180 ,46kg",
    features: ["Модель: LUX-X-48100LCG01"],
    srcImages: ["https://b2b.yugtorg.com/image/cache/data/38849-500x500.png", "https://b2b.yugtorg.com/image/cache/data/38849_1-500x500.png", "https://b2b.yugtorg.com/image/cache/data/38849_2-500x500.png", "https://b2b.yugtorg.com/image/cache/data/38849_3-500x500.png", "https://b2b.yugtorg.com/image/cache/data/38849_4-500x500.png", "https://b2b.yugtorg.com/image/cache/data/38849_5-500x500.png", "https://b2b.yugtorg.com/image/cache/data/38849_6-500x500.png", "https://b2b.yugtorg.com/image/cache/data/38849_7-500x500.png"] },
];

/** Download one remote image into UPLOAD_DIR with a deterministic name (idempotent). */
async function saveImage(srcUrl: string, baseName: string): Promise<string> {
  try {
    const m = srcUrl.match(/\.(png|jpe?g|webp|gif|avif)(?:$|\?)/i);
    const ext = (m ? m[1] : "png").toLowerCase().replace("jpeg", "jpg");
    const filename = `${baseName}.${ext}`;
    const dest = path.join(uploadDir, filename);
    const publicUrl = `/uploads/${filename}`;
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return publicUrl; // already downloaded
    const res = await fetch(srcUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) throw new Error("empty body");
    fs.writeFileSync(dest, buf);
    return publicUrl;
  } catch (e) {
    console.warn(`[seed-yugtorg]   image fallback (remote URL) for ${srcUrl}: ${(e as Error).message}`);
    return srcUrl; // graceful fallback — assetUrl() passes full http(s) URLs through unchanged
  }
}

async function main() {
  console.log("[seed-yugtorg] Starting…");
  ensureUploadDir();

  // ── 1. Ensure brands ─────────────────────────────────────────────────────────
  for (const b of BRANDS) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      create: { slug: b.slug, name: b.name, country: b.country, description: b.description },
      update: {}, // keep any manual brand edits
    });
  }
  console.log(`[seed-yugtorg] Brands ensured: ${BRANDS.map((b) => b.name).join(", ")}`);

  // ── 2. Find + activate supplier ──────────────────────────────────────────────
  const supplier = await prisma.supplier.findFirst({ where: { name: SUPPLIER_NAME } });
  if (!supplier) {
    console.error(`[seed-yugtorg] Supplier "${SUPPLIER_NAME}" not found. Aborting.`);
    process.exit(1);
  }
  if (!supplier.active) {
    await prisma.supplier.update({ where: { id: supplier.id }, data: { active: true } });
  }
  console.log(`[seed-yugtorg] Supplier: ${supplier.name} (${supplier.id})`);

  // ── 3. Upsert products + photos, then supplier prices ────────────────────────
  let created = 0, updated = 0, priced = 0;
  for (const r of ROWS) {
    // download photos (deterministic filenames → idempotent, no duplicates)
    const imgUrls: string[] = [];
    for (let i = 0; i < r.srcImages.length; i++) {
      imgUrls.push(await saveImage(r.srcImages[i], `yugtorg-${r.yug}-${i}`));
    }
    const image = imgUrls[0] ?? "";
    const imagesJson = JSON.stringify(imgUrls);
    const featuresJson = JSON.stringify(r.features);

    const existing = await prisma.product.findUnique({ where: { id: r.id } });
    if (existing) {
      await prisma.product.update({
        where: { id: r.id },
        data: {
          name: r.name,
          category: r.category,
          brandSlug: r.brandSlug,
          features: featuresJson,
          image,
          images: imagesJson,
          // preserved on purpose: price, warranty, enabled, sortOrder
        },
      });
      updated++;
    } else {
      await prisma.product.create({
        data: {
          id: r.id,
          name: r.name,
          category: r.category,
          brandSlug: r.brandSlug,
          price: 0,            // ← no retail price; storefront shows "Ціну уточнюйте"
          warranty: "",        // ← owner fills warranty manually
          features: featuresJson,
          image,
          images: imagesJson,
          enabled: true,
        },
      });
      created++;
    }

    await prisma.productCategoryLink.upsert({
      where: { productId_categoryKey: { productId: r.id, categoryKey: r.category } },
      create: { productId: r.id, categoryKey: r.category },
      update: {},
    });

    // supplier price → the ЮГТОРГ MATRIX (this is where the price lives)
    await prisma.supplierPrice.upsert({
      where: { supplierId_productId: { supplierId: supplier.id, productId: r.id } },
      create: { supplierId: supplier.id, productId: r.id, price: r.price, currency: "USD", availability: r.availability },
      update: { price: r.price, currency: "USD", availability: r.availability },
    });
    priced++;
    console.log(`[seed-yugtorg]   ${r.id}  matrix $${r.price} (${r.availability})  imgs:${imgUrls.length}`);
  }

  console.log(`\n[seed-yugtorg] Done. Products created: ${created}, updated: ${updated}. Matrix prices: ${priced}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
