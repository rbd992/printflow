// ─────────────────────────────────────────────────────────────────────────────
// PrintFlow Parts Catalogue
// Sourced from ca.store.bambulab.com — April 2026
// Printers: Bambu Lab P1S · Bambu Lab H2C
// ─────────────────────────────────────────────────────────────────────────────

// CDN base for Bambu store images
const CDN = 'https://store.bblcdn.com/s5/default';

// ── P1S PARTS CATALOGUE ───────────────────────────────────────────────────────
const P1S_PARTS = {

  'Hotends & Nozzles': {
    icon: '🌡️',
    description: 'Hotend assemblies and nozzles for the P1S',
    items: [
      {
        sku: 'A00-P1S-HOTEND-04HS',
        name: 'Bambu Hotend - P1 Series (0.4mm Hardened Steel)',
        compatible: ['P1S'],
        price_cad: 19.99,
        url: 'https://ca.store.bambulab.com/products/bambu-hotend-p1-series',
        img: `${CDN}/3284bf847d434ab884124e4b17fee473.png`,
        notes: 'Most common replacement. Required for PLA-CF, PETG-CF, and other abrasive filaments.',
      },
      {
        sku: 'A00-P1S-HOTEND-02SS',
        name: 'Bambu Hotend - P1 Series (0.2mm Stainless Steel)',
        compatible: ['P1S'],
        price_cad: 19.99,
        url: 'https://ca.store.bambulab.com/products/bambu-hotend-p1-series',
        img: `${CDN}/3f8004abeb4e47c3802db2c689ba116f.png`,
        notes: 'Ultra-fine detail printing. Not compatible with abrasive or filled filaments.',
      },
      {
        sku: 'A00-P1S-HOTEND-06HS',
        name: 'Bambu Hotend - P1 Series (0.6mm Hardened Steel)',
        compatible: ['P1S'],
        price_cad: 19.99,
        url: 'https://ca.store.bambulab.com/products/bambu-hotend-p1-series',
        img: `${CDN}/81af4670d9c74b8ab5a41b06357b0d34.png`,
        notes: 'High-speed and high-flow prints. Great for large functional parts.',
      },
      {
        sku: 'A00-P1S-HOTEND-08HS',
        name: 'Bambu Hotend - P1 Series (0.8mm Hardened Steel)',
        compatible: ['P1S'],
        price_cad: 19.99,
        url: 'https://ca.store.bambulab.com/products/bambu-hotend-p1-series',
        img: `${CDN}/3284bf847d434ab884124e4b17fee473.png`,
        notes: 'Draft and structural prints. Maximum flow rate nozzle.',
      },
      {
        sku: 'A00-P1S-HOTEND-KIT',
        name: 'All-in-One Hotends Kit - P1 Series',
        compatible: ['P1S'],
        price_cad: 67.96,
        url: 'https://ca.store.bambulab.com/products/all-in-one-hotends-kit-p1-series',
        img: `${CDN}/3284bf847d434ab884124e4b17fee473.png`,
        notes: 'Full set: 0.2mm SS + 0.4mm HS + 0.6mm HS + 0.8mm HS. Best value.',
      },
      {
        sku: 'A00-P1S-HS-COMBO',
        name: 'Hardened Steel Upgrade Combo - P1 Series',
        compatible: ['P1S'],
        price_cad: 23.99,
        url: 'https://ca.store.bambulab.com/products/hardened-steel-upgrade-parts',
        img: `${CDN}/3284bf847d434ab884124e4b17fee473.png`,
        notes: 'Hardened steel nozzle + hotend combo for carbon fiber and glass fiber filaments.',
      },
    ],
  },

  'Build Plates': {
    icon: '🟦',
    description: 'Print surfaces for the P1S (256×256mm)',
    items: [
      {
        sku: 'FAP023',
        name: 'Bambu Cool Plate SuperTack',
        compatible: ['P1S'],
        price_cad: 13.79,
        url: 'https://ca.store.bambulab.com/products/bambu-cool-plate-supertack',
        img: `${CDN}/7f3f200740ff403e83bfbe05057a37ac/FAP023.jpg`,
        notes: 'Best for PLA, TPU. Models self-release when cooled. No glue needed.',
      },
      {
        sku: 'FAP024',
        name: 'Bambu Cool Plate SuperTack Pro',
        compatible: ['P1S'],
        price_cad: 39.99,
        url: 'https://ca.store.bambulab.com/products/bambu-cool-plate-supertack-pro',
        img: `${CDN}/fb06f0bc51534c91b7a32fd2f618ceca/11.png`,
        notes: 'Premium adhesion for PLA, TPU, ABS. Textured surface with superior grip and self-release.',
      },
      {
        sku: 'FAP001-TEXTURED',
        name: 'Bambu Textured PEI Plate',
        compatible: ['P1S'],
        price_cad: 24.99,
        url: 'https://ca.store.bambulab.com/products/bambu-textured-pei-plate',
        img: `${CDN}/80017fd20c0c45f499e7391450406ecf.png`,
        notes: 'Textured matte finish. Works with PLA, PETG, ABS, ASA, TPU. Most versatile plate.',
      },
      {
        sku: 'FAP001-SMOOTH',
        name: 'Bambu Smooth PEI Plate',
        compatible: ['P1S'],
        price_cad: 19.19,
        url: 'https://ca.store.bambulab.com/products/bambu-smooth-pei-plate',
        img: `${CDN}/699f1e478e1f477689b193db84c2d2a6/SmoothPEI_f700c026-44fa-4abf-9479-5f426c5ae52a.png`,
        notes: 'Ultra-smooth bottom surface finish. Great for display models and miniatures.',
      },
      {
        sku: 'FAP006',
        name: 'Bambu Dual-Texture PEI Plate',
        compatible: ['P1S'],
        price_cad: 34.99,
        url: 'https://ca.store.bambulab.com/products/bambu-dual-texture-pei-plate',
        img: `${CDN}/b2dcd29b5721409fa97f3193e71e3137/image_(7).png`,
        notes: 'Textured finish on both sides for double the lifespan. Popular for miniatures.',
      },
      {
        sku: 'FAP003',
        name: 'Bambu Engineering Plate',
        compatible: ['P1S'],
        price_cad: 42.99,
        url: 'https://ca.store.bambulab.com/products/bambu-engineering-plate',
        img: `${CDN}/93b6c970a80341f19c11d22b8dfb39ed/111.png`,
        notes: 'For ABS, ASA, PA, PC and other engineering filaments. Requires glue stick.',
      },
      {
        sku: 'FAP031',
        name: 'Bambu 3D Effect Plate',
        compatible: ['P1S'],
        price_cad: 15.99,
        url: 'https://ca.store.bambulab.com/products/bambu-3d-effect-plate',
        img: `${CDN}/b362971685f24e229a9c7d8407cce4c1.png`,
        notes: 'Creates a unique 3D visual effect on the bottom surface of prints.',
      },
    ],
  },

  'Lubrication & Maintenance': {
    icon: '🧴',
    description: 'Greases and oils for P1S motion system maintenance',
    items: [
      {
        sku: 'A06-P1P-GREASE',
        name: 'Lubricant Grease',
        compatible: ['P1S'],
        price_cad: 5.99,
        url: 'https://ca.store.bambulab.com/products/lubricant-grease',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'For linear rails and lead screw. Apply monthly. Bambu recommended formula.',
      },
      {
        sku: 'A06-P1P-OIL',
        name: 'Lubricant Oil',
        compatible: ['P1S'],
        price_cad: 7.99,
        url: 'https://ca.store.bambulab.com/products/lubricant-oil',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Lightweight oil for carbon rods. Apply every 2 weeks for smooth motion.',
      },
    ],
  },

  'Consumables': {
    icon: '🧽',
    description: 'Cleaning supplies and print consumables for P1S',
    items: [
      {
        sku: 'FAC001-GLUE',
        name: 'Glue Stick',
        compatible: ['P1S'],
        price_cad: 5.99,
        url: 'https://ca.store.bambulab.com/products/glue-stick',
        img: `${CDN}/7f3f200740ff403e83bfbe05057a37ac/FAP023.jpg`,
        notes: 'Adhesion aid for engineering plate. Also improves adhesion for ABS, ASA, PA.',
      },
      {
        sku: 'FAC001-LIQUID',
        name: 'Liquid Glue',
        compatible: ['P1S'],
        price_cad: 21.99,
        url: 'https://ca.store.bambulab.com/products/liquid-glue',
        img: `${CDN}/7f3f200740ff403e83bfbe05057a37ac/FAP023.jpg`,
        notes: 'Liquid adhesion booster. Easier to apply evenly than stick. Great for large prints.',
      },
      {
        sku: 'FAC003-SPONGE',
        name: 'Nozzle Cleaning Sponge',
        compatible: ['P1S'],
        price_cad: 2.99,
        url: 'https://ca.store.bambulab.com/products/nozzle-cleaning-sponge',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Replacement nozzle wiping sponge. Replace when worn or discoloured.',
      },
      {
        sku: 'FAC010-DESIC',
        name: 'Desiccant for AMS',
        compatible: ['P1S'],
        price_cad: 5.99,
        url: 'https://ca.store.bambulab.com/products/desiccant-for-ams-unit',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'AMS humidity control desiccant. Replace every 3 months or when indicator turns pink.',
      },
      {
        sku: 'FAC011-MOLSIEVE',
        name: 'Molecular Sieve Desiccant',
        compatible: ['P1S'],
        price_cad: 5.99,
        url: 'https://ca.store.bambulab.com/products/molecular-sieve-desiccant',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'High-performance desiccant for moisture-sensitive filaments like PA and PC.',
      },
    ],
  },

  'Accessories': {
    icon: '🔧',
    description: 'Workflow accessories for the P1S',
    items: [
      {
        sku: 'FAZ001-SCRAPER',
        name: 'Mag-Alloy Scraper',
        compatible: ['P1S'],
        price_cad: 25.99,
        url: 'https://ca.store.bambulab.com/products/mag-alloy-scraper',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Premium magnetic alloy scraper for removing stubborn prints from build plates.',
      },
      {
        sku: 'FAZ002-FEET',
        name: 'Anti-Vibration Feet',
        compatible: ['P1S'],
        price_cad: 6.50,
        url: 'https://ca.store.bambulab.com/products/anti-vibration-feet',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Silicone damper feet to reduce noise and vibration during high-speed printing.',
      },
      {
        sku: 'FAZ010-AMS2PRO-KIT',
        name: 'AMS 2 Pro Upgrade Kit for X1/P1 Series',
        compatible: ['P1S'],
        price_cad: 92.95,
        url: 'https://ca.store.bambulab.com/products/ams-2-pro-upgrade-kit-for-x1-p1-series',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Upgrade kit to add AMS 2 Pro compatibility to existing P1S setups.',
      },
      {
        sku: 'FAZ003-ACCESSBOX-P1S',
        name: 'Accessory Box for X1C and P1S',
        compatible: ['P1S'],
        price_cad: 28.99,
        url: 'https://ca.store.bambulab.com/products/accessory-box-for-x1c-and-p1s',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Official spare parts box with nozzle tools, PTFE tube, clips, and hardware.',
      },
    ],
  },
};

// ── H2C PARTS CATALOGUE ───────────────────────────────────────────────────────
const H2C_PARTS = {

  'Vortek Induction Hotends': {
    icon: '⚡',
    description: 'Vortek induction hotends for the H2C right-side (swappable) toolhead',
    items: [
      {
        sku: 'H2C-IND-04HS-STD',
        name: 'H2C Induction Hotend — 0.4mm Hardened Steel (Standard Flow)',
        compatible: ['H2C'],
        price_cad: 49.99,
        url: 'https://ca.store.bambulab.com/products/h2c-induction-hotend-standard-high-flow',
        img: `${CDN}/3284bf847d434ab884124e4b17fee473.png`,
        notes: 'Standard flow right-side Vortek hotend. Included ×4 with H2C combo. Heats in ~8 seconds. Stores filament info onboard.',
      },
      {
        sku: 'H2C-IND-04HS-HF',
        name: 'H2C Induction Hotend — 0.4mm Hardened Steel (High Flow)',
        compatible: ['H2C'],
        price_cad: 49.99,
        url: 'https://ca.store.bambulab.com/products/h2c-induction-hotend-standard-high-flow',
        img: `${CDN}/3284bf847d434ab884124e4b17fee473.png`,
        notes: 'High flow Vortek induction hotend for faster extrusion rates. Right-side toolhead only.',
      },
      {
        sku: 'H2C-HOTEND-COMBO',
        name: 'H2C Hotend Combo',
        compatible: ['H2C'],
        price_cad: 149.99,
        url: 'https://ca.store.bambulab.com/products/h2c-hotend-combo',
        img: `${CDN}/3284bf847d434ab884124e4b17fee473.png`,
        notes: 'Full set for Vortek 6-hotend operation: 3× 0.4mm induction + 0.2mm + 0.6mm + standard hotend.',
      },
    ],
  },

  'Standard Hotends (Left Side)': {
    icon: '🌡️',
    description: 'Standard hotends for the H2C left-side (fixed) toolhead',
    items: [
      {
        sku: 'H2C-STD-04HS',
        name: 'H2 Series Hotend — 0.4mm Hardened Steel',
        compatible: ['H2C'],
        price_cad: 29.99,
        url: 'https://ca.store.bambulab.com/products/bambu-hotend-h2-series',
        img: `${CDN}/3284bf847d434ab884124e4b17fee473.png`,
        notes: 'Left-side fixed hotend for H2C. Also compatible with H2D. Shared heating assembly.',
      },
      {
        sku: 'H2C-STD-02SS',
        name: 'H2 Series Hotend — 0.2mm Stainless Steel',
        compatible: ['H2C'],
        price_cad: 29.99,
        url: 'https://ca.store.bambulab.com/products/bambu-hotend-h2-series',
        img: `${CDN}/3f8004abeb4e47c3802db2c689ba116f.png`,
        notes: 'Ultra-fine detail. Left-side fixed toolhead. For standard (non-abrasive) filaments only.',
      },
      {
        sku: 'H2C-STD-06HS',
        name: 'H2 Series Hotend — 0.6mm Hardened Steel',
        compatible: ['H2C'],
        price_cad: 29.99,
        url: 'https://ca.store.bambulab.com/products/bambu-hotend-h2-series',
        img: `${CDN}/81af4670d9c74b8ab5a41b06357b0d34.png`,
        notes: 'High-flow left-side hotend. For faster prints and functional parts.',
      },
      {
        sku: 'H2C-TC-NOZZLE',
        name: 'Tungsten Carbide Nozzle — H2/P2S',
        compatible: ['H2C'],
        price_cad: 39.99,
        url: 'https://ca.store.bambulab.com/products/tungsten-carbide-nozzle-h2-p2s',
        img: `${CDN}/3284bf847d434ab884124e4b17fee473.png`,
        notes: 'Extreme wear resistance for PA-CF, PPS-CF, PET-CF and other highly abrasive filaments.',
      },
      {
        sku: 'H2C-HEAT-ASSEMBLY',
        name: 'Hotend Heating Assembly — H2D and H2C',
        compatible: ['H2C'],
        price_cad: 34.99,
        url: 'https://ca.store.bambulab.com/products/hotend-heating-assembly-h2d-and-h2c',
        img: `${CDN}/3284bf847d434ab884124e4b17fee473.png`,
        notes: 'Heating assembly shared between H2C and H2D. Left side only on H2C. Clamping mechanism for quick swap.',
      },
    ],
  },

  'Build Plates': {
    icon: '🟦',
    description: 'Print surfaces for the H2C — NOT interchangeable with H2D (different bed size)',
    items: [
      {
        sku: 'H2C-PLATE-SMOOTH',
        name: 'Bambu Smooth PEI Plate (H2C)',
        compatible: ['H2C'],
        price_cad: 19.19,
        url: 'https://ca.store.bambulab.com/products/bambu-smooth-pei-plate',
        img: `${CDN}/699f1e478e1f477689b193db84c2d2a6/SmoothPEI_f700c026-44fa-4abf-9479-5f426c5ae52a.png`,
        notes: 'H2C-sized smooth PEI plate. Smooth bottom finish. Note: NOT compatible with H2D plates.',
      },
      {
        sku: 'H2C-PLATE-TEXTURED',
        name: 'Bambu Textured PEI Plate (H2C)',
        compatible: ['H2C'],
        price_cad: 24.99,
        url: 'https://ca.store.bambulab.com/products/bambu-textured-pei-plate',
        img: `${CDN}/80017fd20c0c45f499e7391450406ecf.png`,
        notes: 'H2C-sized textured PEI plate. Matte finish. Most versatile — PLA, PETG, ABS, ASA, TPU.',
      },
      {
        sku: 'H2C-PLATE-SUPERTACK-PRO',
        name: 'Bambu Cool Plate SuperTack Pro (H2C)',
        compatible: ['H2C'],
        price_cad: 39.99,
        url: 'https://ca.store.bambulab.com/products/bambu-cool-plate-supertack-pro',
        img: `${CDN}/fb06f0bc51534c91b7a32fd2f618ceca/11.png`,
        notes: 'H2C-sized SuperTack Pro. Self-release when cooled. Excellent for PLA and TPU.',
      },
      {
        sku: 'H2C-PLATE-ENGINEERING',
        name: 'Bambu Engineering Plate (H2C)',
        compatible: ['H2C'],
        price_cad: 42.99,
        url: 'https://ca.store.bambulab.com/products/bambu-engineering-plate',
        img: `${CDN}/93b6c970a80341f19c11d22b8dfb39ed/111.png`,
        notes: 'H2C-sized engineering plate for PA, PC, ABS, ASA. Glue stick required.',
      },
    ],
  },

  'AMS & Multi-Material': {
    icon: '🎨',
    description: 'AMS units and accessories for H2C multi-material printing',
    items: [
      {
        sku: 'H2C-AMS2PRO-SWITCH',
        name: 'AMS 2 Pro Switching Adapter',
        compatible: ['H2C'],
        price_cad: 40.99,
        url: 'https://ca.store.bambulab.com/products/ams-2-pro-switching-adapter',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Required for connecting AMS 2 Pro to H2C. Enables automatic multi-material feeding.',
      },
      {
        sku: 'H2C-PTFE-4IN1',
        name: 'Bambu 4-in-1 PTFE Adapter',
        compatible: ['H2C'],
        price_cad: 6.99,
        url: 'https://ca.store.bambulab.com/products/bambu-4-in-1-ptfe-adapter',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Needed when connecting more than 2 AMS units to H2C. Included with H2C AMS Combo.',
      },
      {
        sku: 'H2C-BUS-CABLE',
        name: 'Bambu Bus Cable',
        compatible: ['H2C'],
        price_cad: 5.99,
        url: 'https://ca.store.bambulab.com/products/bambu-bus-cable',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Data cable for connecting AMS 2 Pro units to H2C. Required for each additional AMS.',
      },
      {
        sku: 'H2C-AMS-DESIC',
        name: 'Desiccant for AMS',
        compatible: ['H2C'],
        price_cad: 5.99,
        url: 'https://ca.store.bambulab.com/products/desiccant-for-ams-unit',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Replace every 3 months in AMS 2 Pro. Essential for PA, PC and moisture-sensitive filaments.',
      },
      {
        sku: 'H2C-MOL-SIEVE',
        name: 'Molecular Sieve Desiccant',
        compatible: ['H2C'],
        price_cad: 5.99,
        url: 'https://ca.store.bambulab.com/products/molecular-sieve-desiccant',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'High-performance desiccant for AMS HT. Critical for PA-CF, PPS-CF, PC-CF filaments.',
      },
    ],
  },

  'Upgrades & Electronics': {
    icon: '🔌',
    description: 'Upgrade modules and electronic components for H2C',
    items: [
      {
        sku: 'H2C-VISION-ENC',
        name: 'Vision Encoder',
        compatible: ['H2C'],
        price_cad: 149.99,
        url: 'https://ca.store.bambulab.com/products/vision-encoder',
        img: `${CDN}/3284bf847d434ab884124e4b17fee473.png`,
        notes: 'Optional upgrade. Achieves motion accuracy under 50μm. Auto-compensates for mechanical drift.',
      },
      {
        sku: 'H2C-TPU-KIT',
        name: 'H2D TPU High-Flow Kit',
        compatible: ['H2C'],
        price_cad: 49.99,
        url: 'https://ca.store.bambulab.com/products/h2d-tpu-high-flow-kit',
        img: `${CDN}/3284bf847d434ab884124e4b17fee473.png`,
        notes: 'Compatible with H2C. Enables high-flow TPU printing on the right-side fixed hotend.',
      },
      {
        sku: 'H2C-COOLING-FAN',
        name: 'Toolhead Enhanced Cooling Fan',
        compatible: ['H2C'],
        price_cad: 19.99,
        url: 'https://ca.store.bambulab.com/products/toolhead-enhanced-cooling-fan',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Replacement or upgrade cooling fan for H2C toolhead. Improves cooling for bridging and overhangs.',
      },
      {
        sku: 'H2C-ACC-BOX',
        name: 'Accessory Box for H2D (H2C compatible)',
        compatible: ['H2C'],
        price_cad: 28.99,
        url: 'https://ca.store.bambulab.com/products/accessory-box-for-h2d',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Spare parts box with nozzle tools, PTFE tubes, hotend clips and hardware. Shared H2 series part.',
      },
    ],
  },

  'Lubrication & Consumables': {
    icon: '🧴',
    description: 'Maintenance supplies for H2C motion system',
    items: [
      {
        sku: 'H2C-GREASE',
        name: 'Lubricant Grease',
        compatible: ['H2C'],
        price_cad: 5.99,
        url: 'https://ca.store.bambulab.com/products/lubricant-grease',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'For H2C linear rails and dual lead screws. Apply monthly per Bambu maintenance schedule.',
      },
      {
        sku: 'H2C-OIL',
        name: 'Lubricant Oil',
        compatible: ['H2C'],
        price_cad: 7.99,
        url: 'https://ca.store.bambulab.com/products/lubricant-oil',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Lightweight oil for H2C carbon rods. Apply every 2 weeks to both gantry sides.',
      },
      {
        sku: 'H2C-GLUE-STICK',
        name: 'Glue Stick',
        compatible: ['H2C'],
        price_cad: 5.99,
        url: 'https://ca.store.bambulab.com/products/glue-stick',
        img: `${CDN}/7f3f200740ff403e83bfbe05057a37ac/FAP023.jpg`,
        notes: 'Required for Engineering Plate. Also recommended for ABS, ASA, PA on any plate.',
      },
      {
        sku: 'H2C-LIQUID-GLUE',
        name: 'Liquid Glue',
        compatible: ['H2C'],
        price_cad: 21.99,
        url: 'https://ca.store.bambulab.com/products/liquid-glue',
        img: `${CDN}/7f3f200740ff403e83bfbe05057a37ac/FAP023.jpg`,
        notes: 'Liquid adhesion booster. Easier to apply evenly on large H2C build surface.',
      },
      {
        sku: 'H2C-SPONGE',
        name: 'Nozzle Cleaning Sponge',
        compatible: ['H2C'],
        price_cad: 2.99,
        url: 'https://ca.store.bambulab.com/products/nozzle-cleaning-sponge',
        img: `${CDN}/8af10007028a430185e01e7b24049a14.jpg`,
        notes: 'Replacement nozzle wiping sponge for H2C. Replace when worn or discoloured.',
      },
    ],
  },
};

// ── MERGED CATALOGUE ──────────────────────────────────────────────────────────
export const FULL_PARTS_CATALOGUE = { ...P1S_PARTS, ...H2C_PARTS };

// ── MAINTENANCE SCHEDULE ──────────────────────────────────────────────────────
export const MAINTENANCE_SCHEDULE = [

  // ── P1S ──────────────────────────────────────────────────────────────────
  {
    printer: 'P1S',
    task: 'Lubricate X/Y carbon rods',
    interval_days: 14,
    interval_label: 'Every 2 weeks',
    instructions: 'Apply a small amount of lubricant oil to the carbon rods on both X and Y axes using a lint-free cloth. Move the axes manually to distribute evenly.',
    parts: ['A06-P1P-OIL'],
  },
  {
    printer: 'P1S',
    task: 'Lubricate Z-axis lead screw',
    interval_days: 30,
    interval_label: 'Monthly',
    instructions: 'Apply Bambu lubricant grease along the full length of the Z-axis lead screw. Move the bed to the bottom then run the Z-axis up and down several times to distribute.',
    parts: ['A06-P1P-GREASE'],
  },
  {
    printer: 'P1S',
    task: 'Lubricate linear rails',
    interval_days: 90,
    interval_label: 'Every 3 months',
    instructions: 'Apply a small amount of grease to each linear rail carriage. Move the axis back and forth to distribute. Do not over-lubricate.',
    parts: ['A06-P1P-GREASE'],
  },
  {
    printer: 'P1S',
    task: 'Clean hotend fan and intake vents',
    interval_days: 30,
    interval_label: 'Monthly',
    instructions: 'Use compressed air or a soft brush to clean dust from the hotend cooling fan and printer intake vents. A clogged fan causes thermal issues and print quality problems.',
    parts: [],
  },
  {
    printer: 'P1S',
    task: 'Calibrate vibration compensation',
    interval_days: 90,
    interval_label: 'Every 3 months or after moving',
    instructions: 'Run Calibration → Vibration Compensation from the P1S touchscreen. This compensates for resonance and improves print quality significantly at high speeds.',
    parts: [],
  },
  {
    printer: 'P1S',
    task: 'Check and tension X/Y belts',
    interval_days: 90,
    interval_label: 'Every 3 months',
    instructions: 'Check X and Y belt tension — belts should feel taut like a guitar string. Adjust using the tensioning screw accessible through the side panel. Re-run calibration after tensioning.',
    parts: [],
  },
  {
    printer: 'P1S',
    task: 'Clean and inspect nozzle',
    interval_days: 7,
    interval_label: 'Weekly or every 100 print hours',
    instructions: 'Heat nozzle to printing temperature. Use a brass wire brush to remove burnt filament from outside the nozzle. Check for leaks around the heater block.',
    parts: ['FAC003-SPONGE'],
  },
  {
    printer: 'P1S',
    task: 'Replace nozzle / hotend',
    interval_days: 180,
    interval_label: 'Every 6 months or ~500 hours',
    instructions: 'Heat to 200°C. Remove silicone sock. Use a wrench to unscrew nozzle or full hotend. Install new part while hot. Torque to ~1.5 Nm — do not overtighten cold.',
    parts: ['A00-P1S-HOTEND-04HS'],
  },
  {
    printer: 'P1S',
    task: 'Replace AMS desiccant',
    interval_days: 90,
    interval_label: 'Every 3 months',
    instructions: 'Open AMS lid and remove the desiccant cartridge. Replace with fresh desiccant. Indicator window turns pink when saturated.',
    parts: ['FAC010-DESIC'],
  },
  {
    printer: 'P1S',
    task: 'First layer calibration',
    interval_days: 30,
    interval_label: 'Monthly or when changing plates',
    instructions: 'Run Calibration → First Layer Calibration after changing build plates or when adhesion issues occur. Ensure bed is clean and at printing temperature before calibrating.',
    parts: [],
  },

  // ── H2C ──────────────────────────────────────────────────────────────────
  {
    printer: 'H2C',
    task: 'Lubricate X/Y carbon rods (both sides)',
    interval_days: 14,
    interval_label: 'Every 2 weeks',
    instructions: 'Apply lubricant oil to all carbon rods on X and Y axes. H2C has dual gantry — lubricate both left and right sides thoroughly.',
    parts: ['H2C-OIL'],
  },
  {
    printer: 'H2C',
    task: 'Lubricate dual Z lead screws',
    interval_days: 30,
    interval_label: 'Monthly',
    instructions: 'Apply Bambu lubricant grease to both Z-axis lead screws. Move bed to bottom, apply grease along full length, run Z-axis multiple times to distribute.',
    parts: ['H2C-GREASE'],
  },
  {
    printer: 'H2C',
    task: 'Lubricate linear rails',
    interval_days: 90,
    interval_label: 'Every 3 months',
    instructions: 'Apply a small amount of grease to all linear rail carriages. The H2C has more rails than P1S due to the larger build volume and dual gantry — cover all of them.',
    parts: ['H2C-GREASE'],
  },
  {
    printer: 'H2C',
    task: 'Clean chamber and exhaust fan',
    interval_days: 30,
    interval_label: 'Monthly',
    instructions: 'Use compressed air to clean the H2C chamber interior and exhaust fan. Pay attention to the rear exhaust and toolhead fans. The enclosed chamber accumulates fine particles.',
    parts: [],
  },
  {
    printer: 'H2C',
    task: 'Calibrate both toolheads',
    interval_days: 90,
    interval_label: 'Every 3 months',
    instructions: 'Run full calibration from H2C touchscreen: Vibration Compensation, Flow Calibration, and First Layer Calibration. Also run nozzle offset calibration for dual-material accuracy.',
    parts: [],
  },
  {
    printer: 'H2C',
    task: 'Inspect Vortek hotend dock and contacts',
    interval_days: 30,
    interval_label: 'Monthly',
    instructions: 'Inspect the Vortek hotend rack and induction contacts for debris or damage. Clean the contact surfaces with a dry cloth. Ensure all hotends click in and out smoothly.',
    parts: [],
  },
  {
    printer: 'H2C',
    task: 'Replace or rotate Vortek induction hotends',
    interval_days: 180,
    interval_label: 'Every 6 months or ~500 hours per hotend',
    instructions: 'Check each Vortek hotend for nozzle wear. Rotate hotend assignments to even out wear across all 6 slots. Replace worn nozzles — heat to 200°C before removal.',
    parts: ['H2C-IND-04HS-STD'],
  },
  {
    printer: 'H2C',
    task: 'Replace AMS 2 Pro desiccant',
    interval_days: 90,
    interval_label: 'Every 3 months',
    instructions: 'Replace desiccant in each connected AMS 2 Pro unit. Critical for PA, PC, and other moisture-sensitive filaments stored in the AMS.',
    parts: ['H2C-AMS-DESIC'],
  },
  {
    printer: 'H2C',
    task: 'Replace AMS HT molecular sieve',
    interval_days: 90,
    interval_label: 'Every 3 months',
    instructions: 'Replace the molecular sieve desiccant in AMS HT units used for high-temperature filaments like PA-CF and PC-CF. These materials are extremely moisture-sensitive.',
    parts: ['H2C-MOL-SIEVE'],
  },
  {
    printer: 'H2C',
    task: 'Inspect PTFE tubes and adapters',
    interval_days: 90,
    interval_label: 'Every 3 months',
    instructions: 'Inspect all PTFE feed tubes between AMS and H2C for kinking, wear or discolouration. Check the 4-in-1 PTFE adapter for secure seating. Replace any damaged tubes.',
    parts: ['H2C-PTFE-4IN1'],
  },
  {
    printer: 'H2C',
    task: 'Dual toolhead offset calibration',
    interval_days: 30,
    interval_label: 'Monthly or after hotend change',
    instructions: 'Print a dual-toolhead alignment test. If left and right hotends are offset, run Calibration → Nozzle Offset from the H2C menu. Critical for dual-material print accuracy.',
    parts: [],
  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
export function getAllParts() {
  return Object.entries(FULL_PARTS_CATALOGUE).flatMap(([cat, data]) =>
    data.items.map(item => ({ ...item, category: cat, categoryIcon: data.icon }))
  );
}

export function getPartsForPrinter(printer) {
  return getAllParts().filter(p => p.compatible.includes(printer));
}

export function getMaintenanceFor(printer) {
  if (!printer) return MAINTENANCE_SCHEDULE;
  return MAINTENANCE_SCHEDULE.filter(t => t.printer === printer);
}
