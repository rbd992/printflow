// Bambu Lab P1S and H2D compatible parts catalogue
// All parts compatible with P1S Combo and H2D AMS 2Pro Combo
// Prices in CAD (approximate retail)

export const PARTS_CATALOGUE = {
  'Nozzles': {
    icon: '🔩',
    description: 'Hotend nozzles for P1S and H2D',
    items: [
      { sku: 'A00-P1P-0099', name: 'Hardened Steel Nozzle 0.4mm', compatible: ['P1S','H2D'], price_cad: 14.99, url: 'https://bambulab.com/en/products/nozzle', notes: 'For abrasive filaments (CF, GF)', reorder_at: 2 },
      { sku: 'A00-P1P-0098', name: 'Stainless Steel Nozzle 0.4mm', compatible: ['P1S','H2D'], price_cad: 9.99, url: 'https://bambulab.com', notes: 'Standard, food-safe printing', reorder_at: 3 },
      { sku: 'A00-P1P-0100', name: 'Hardened Steel Nozzle 0.2mm', compatible: ['P1S','H2D'], price_cad: 14.99, url: 'https://bambulab.com', notes: 'Fine detail printing', reorder_at: 1 },
      { sku: 'A00-P1P-0101', name: 'Hardened Steel Nozzle 0.6mm', compatible: ['P1S','H2D'], price_cad: 14.99, url: 'https://bambulab.com', notes: 'High-speed / large prints', reorder_at: 1 },
      { sku: 'A00-P1P-0102', name: 'Hardened Steel Nozzle 0.8mm', compatible: ['P1S','H2D'], price_cad: 14.99, url: 'https://bambulab.com', notes: 'Draft / structural prints', reorder_at: 1 },
      { sku: 'A00-P1P-0097', name: 'Complete Hotend Assembly', compatible: ['P1S'], price_cad: 49.99, url: 'https://bambulab.com', notes: 'Full hotend replacement', reorder_at: 1 },
      { sku: 'A00-H2D-0001', name: 'H2D Complete Hotend Assembly', compatible: ['H2D'], price_cad: 59.99, url: 'https://bambulab.com', notes: 'H2D specific hotend', reorder_at: 1 },
    ],
  },
  'Build Plates': {
    icon: '🟦',
    description: 'Print surfaces for P1S and H2D',
    items: [
      { sku: 'AC02-P1P-0001', name: 'Cool Plate (PEI Smooth)', compatible: ['P1S','H2D'], price_cad: 29.99, url: 'https://bambulab.com', notes: 'Best for PLA, PETG', reorder_at: 1 },
      { sku: 'AC02-P1P-0002', name: 'Engineering Plate (PEI Textured)', compatible: ['P1S','H2D'], price_cad: 34.99, url: 'https://bambulab.com', notes: 'ABS, ASA, PC, PA — textured finish', reorder_at: 1 },
      { sku: 'AC02-P1P-0003', name: 'High Temperature Plate', compatible: ['P1S','H2D'], price_cad: 39.99, url: 'https://bambulab.com', notes: 'For PA-CF, PC-CF, high-temp filaments', reorder_at: 1 },
      { sku: 'AC02-P1P-0004', name: 'Dual-Sided Textured PEI Plate', compatible: ['P1S','H2D'], price_cad: 44.99, url: 'https://bambulab.com', notes: 'Textured finish both sides — popular for miniatures', reorder_at: 1 },
      { sku: 'AC02-P1P-0005', name: 'Smooth PEI Plate', compatible: ['P1S','H2D'], price_cad: 34.99, url: 'https://bambulab.com', notes: 'Ultra smooth bottom surface', reorder_at: 1 },
    ],
  },
  'Lubrication': {
    icon: '🧴',
    description: 'Greases and oils for motion system maintenance',
    items: [
      { sku: 'A06-P1P-0001', name: 'Lubricating Grease (20g)', compatible: ['P1S','H2D'], price_cad: 12.99, url: 'https://bambulab.com', notes: 'For linear rails and lead screws — monthly', reorder_at: 1 },
      { sku: 'A06-P1P-0002', name: 'Lubricating Oil (20ml)', compatible: ['P1S','H2D'], price_cad: 9.99, url: 'https://bambulab.com', notes: 'For carbon rods', reorder_at: 1 },
      { sku: 'A06-P1P-0003', name: 'Maintenance Kit (Grease + Oil)', compatible: ['P1S','H2D'], price_cad: 19.99, url: 'https://bambulab.com', notes: 'Full maintenance set', reorder_at: 1 },
    ],
  },
  'Hotend & Extruder': {
    icon: '🌡️',
    description: 'Heating, temperature, and extruder components',
    items: [
      { sku: 'A00-P1P-0050', name: 'Heating Block', compatible: ['P1S','H2D'], price_cad: 19.99, url: 'https://bambulab.com', notes: 'Replacement heater block', reorder_at: 1 },
      { sku: 'A00-P1P-0051', name: 'Thermistor NTC 100K', compatible: ['P1S','H2D'], price_cad: 7.99, url: 'https://bambulab.com', notes: 'Temperature sensor', reorder_at: 2 },
      { sku: 'A00-P1P-0052', name: 'Heater Cartridge 24V 48W', compatible: ['P1S','H2D'], price_cad: 8.99, url: 'https://bambulab.com', notes: 'Replacement heater cartridge', reorder_at: 2 },
      { sku: 'A00-P1P-0053', name: 'PTFE Tube (1m)', compatible: ['P1S','H2D'], price_cad: 6.99, url: 'https://bambulab.com', notes: 'Bowden tube replacement', reorder_at: 2 },
      { sku: 'A00-P1P-0054', name: 'Extruder Gear Set', compatible: ['P1S'], price_cad: 14.99, url: 'https://bambulab.com', notes: 'Drive gear replacement', reorder_at: 1 },
      { sku: 'A00-H2D-0010', name: 'H2D Extruder Gear Set', compatible: ['H2D'], price_cad: 16.99, url: 'https://bambulab.com', notes: 'H2D specific extruder gears', reorder_at: 1 },
      { sku: 'A00-P1P-0055', name: 'Silicone Sock (5-pack)', compatible: ['P1S','H2D'], price_cad: 11.99, url: 'https://bambulab.com', notes: 'Insulates hotend from drafts', reorder_at: 1 },
    ],
  },
  'Motion System': {
    icon: '⚙️',
    description: 'Belts, rods, and motion hardware',
    items: [
      { sku: 'A05-P1P-0001', name: 'Carbon Rod Set (X-axis)', compatible: ['P1S','H2D'], price_cad: 24.99, url: 'https://bambulab.com', notes: 'Replace when bowed or scratched', reorder_at: 1 },
      { sku: 'A05-P1P-0002', name: 'Carbon Rod Set (Y-axis)', compatible: ['P1S','H2D'], price_cad: 24.99, url: 'https://bambulab.com', notes: 'Replace when bowed or scratched', reorder_at: 1 },
      { sku: 'A05-P1P-0003', name: 'GT2 Belt (X-axis)', compatible: ['P1S','H2D'], price_cad: 14.99, url: 'https://bambulab.com', notes: 'Replace when stretched or skipping', reorder_at: 1 },
      { sku: 'A05-P1P-0004', name: 'GT2 Belt (Y-axis)', compatible: ['P1S','H2D'], price_cad: 14.99, url: 'https://bambulab.com', notes: 'Replace when stretched or skipping', reorder_at: 1 },
      { sku: 'A05-P1P-0005', name: 'Lead Screw (Z-axis)', compatible: ['P1S'], price_cad: 19.99, url: 'https://bambulab.com', notes: 'Z-axis drive screw', reorder_at: 1 },
      { sku: 'A05-H2D-0005', name: 'Lead Screw Set (H2D)', compatible: ['H2D'], price_cad: 24.99, url: 'https://bambulab.com', notes: 'H2D dual Z lead screws', reorder_at: 1 },
    ],
  },
  'AMS Parts': {
    icon: '🎨',
    description: 'AMS, AMS Lite, AMS 2 Pro, and AMS HT components',
    items: [
      { sku: 'AMS-P1P-0001', name: 'AMS Hub (Replacement)', compatible: ['P1S'], price_cad: 39.99, url: 'https://bambulab.com', notes: 'AMS filament buffer hub', reorder_at: 1 },
      { sku: 'AMS-P1P-0002', name: 'AMS PTFE Tube Set', compatible: ['P1S','H2D'], price_cad: 12.99, url: 'https://bambulab.com', notes: 'AMS feed tubes — all 4 slots', reorder_at: 1 },
      { sku: 'AMS-P1P-0003', name: 'AMS Filament Spool Holder', compatible: ['P1S','H2D'], price_cad: 7.99, url: 'https://bambulab.com', notes: 'Spool holder axle — per slot', reorder_at: 2 },
      { sku: 'AMS-P1P-0004', name: 'AMS Desiccant (4-pack)', compatible: ['P1S','H2D'], price_cad: 9.99, url: 'https://bambulab.com', notes: 'Replace every 3-6 months', reorder_at: 1 },
      { sku: 'AMS-P1P-0005', name: 'AMS Cover Roller', compatible: ['P1S'], price_cad: 8.99, url: 'https://bambulab.com', notes: 'AMS lid roller replacement', reorder_at: 1 },
      { sku: 'AMS2-H2D-0001', name: 'AMS 2 Pro Feed Gear Set', compatible: ['H2D'], price_cad: 19.99, url: 'https://bambulab.com', notes: 'AMS 2 Pro drive gear replacement', reorder_at: 1 },
      { sku: 'AMS2-H2D-0002', name: 'AMS 2 Pro PTFE Tube Set', compatible: ['H2D'], price_cad: 14.99, url: 'https://bambulab.com', notes: 'AMS 2 Pro all-slot tube set', reorder_at: 1 },
      { sku: 'AMSHT-H2D-0001', name: 'AMS HT High-Temp PTFE Tube', compatible: ['H2D'], price_cad: 16.99, url: 'https://bambulab.com', notes: 'AMS HT rated for high-temp filaments', reorder_at: 1 },
      { sku: 'AMSHT-H2D-0002', name: 'AMS HT Desiccant (2-pack)', compatible: ['H2D'], price_cad: 8.99, url: 'https://bambulab.com', notes: 'AMS HT humidity control', reorder_at: 1 },
      { sku: 'AMSHT-H2D-0003', name: 'AMS HT Spool Holder Set', compatible: ['H2D'], price_cad: 12.99, url: 'https://bambulab.com', notes: 'AMS HT axle holders', reorder_at: 1 },
    ],
  },
  'Electronics & Sensors': {
    icon: '🔌',
    description: 'Electrical components and sensors',
    items: [
      { sku: 'A03-P1P-0001', name: 'Filament Runout Sensor', compatible: ['P1S','H2D'], price_cad: 12.99, url: 'https://bambulab.com', notes: 'Detects end of filament spool', reorder_at: 1 },
      { sku: 'A03-P1P-0002', name: 'Chamber Temperature Sensor', compatible: ['P1S','H2D'], price_cad: 9.99, url: 'https://bambulab.com', notes: 'Monitors chamber heat', reorder_at: 1 },
      { sku: 'A03-P1P-0003', name: 'Vibration Compensation Module', compatible: ['P1S','H2D'], price_cad: 24.99, url: 'https://bambulab.com', notes: 'LIDAR/resonance calibration module', reorder_at: 1 },
      { sku: 'A03-P1P-0004', name: 'Toolhead PCB', compatible: ['P1S'], price_cad: 34.99, url: 'https://bambulab.com', notes: 'Toolhead main board replacement', reorder_at: 1 },
      { sku: 'A03-H2D-0004', name: 'H2D Toolhead PCB', compatible: ['H2D'], price_cad: 44.99, url: 'https://bambulab.com', notes: 'H2D dual extruder toolhead PCB', reorder_at: 1 },
    ],
  },
  'Cleaning & Consumables': {
    icon: '🧽',
    description: 'Cleaning supplies and consumables',
    items: [
      { sku: 'C01-P1P-0001', name: 'Isopropyl Alcohol Wipes (50-pack)', compatible: ['P1S','H2D'], price_cad: 8.99, url: 'https://bambulab.com', notes: 'Bed and nozzle cleaning', reorder_at: 1 },
      { sku: 'C01-P1P-0002', name: 'Nozzle Cleaning Needles (5-pack)', compatible: ['P1S','H2D'], price_cad: 4.99, url: 'https://bambulab.com', notes: 'Clear clogged nozzles', reorder_at: 2 },
      { sku: 'C01-P1P-0003', name: 'Bed Adhesion Glue Stick (3-pack)', compatible: ['P1S','H2D'], price_cad: 7.99, url: 'https://bambulab.com', notes: 'Adhesion aid for PA, PC, ABS', reorder_at: 2 },
      { sku: 'C01-P1P-0004', name: 'Flush Filament (250g, White)', compatible: ['P1S','H2D'], price_cad: 12.99, url: 'https://bambulab.com', notes: 'AMS color change purging — reduces waste', reorder_at: 1 },
    ],
  },
};

// Maintenance intervals for P1S and H2D (from Bambu Lab recommendations)
export const MAINTENANCE_SCHEDULE = [
  // P1S
  { printer:'P1S', task:'Lubricate X/Y carbon rods', interval_days:14, interval_label:'Every 2 weeks', instructions:'Apply a small amount of lubricating oil to the carbon rods on both X and Y axes using a lint-free cloth. Run the axes to distribute evenly.', parts:['A06-P1P-0002'] },
  { printer:'P1S', task:'Lubricate lead screw (Z-axis)', interval_days:30, interval_label:'Monthly', instructions:'Apply Bambu lubricating grease to the Z-axis lead screw. Move the bed to the bottom then apply grease along the full length and run the Z-axis several times.', parts:['A06-P1P-0001'] },
  { printer:'P1S', task:'Lubricate linear rails', interval_days:90, interval_label:'Every 3 months', instructions:'Apply a small amount of grease to each linear rail carriage. Move the axis back and forth to distribute. Do not over-lubricate.', parts:['A06-P1P-0001'] },
  { printer:'P1S', task:'Clean hotend fan and intake', interval_days:30, interval_label:'Monthly', instructions:'Use compressed air or a soft brush to clean dust from the hotend cooling fan and the printer intake vents. A clogged fan causes print quality issues.', parts:[] },
  { printer:'P1S', task:'Calibrate vibration compensation', interval_days:90, interval_label:'Every 3 months or after moving', instructions:'Run Calibration → Vibration Compensation from the printer touchscreen. This compensates for resonance and improves print quality significantly.', parts:[] },
  { printer:'P1S', task:'Check and tension belts', interval_days:90, interval_label:'Every 3 months', instructions:'Check X and Y belt tension. Belts should feel taut like a guitar string. Adjust using the tensioning screw accessible through the side panel.', parts:['A05-P1P-0003','A05-P1P-0004'] },
  { printer:'P1S', task:'Inspect and clean nozzle', interval_days:7, interval_label:'Weekly or every 100h', instructions:'Heat the nozzle to printing temperature and use a brass wire brush to remove burnt filament from the outside. Check for droop or leaks around the heater block.', parts:['A00-P1P-0099'] },
  { printer:'P1S', task:'Replace nozzle', interval_days:180, interval_label:'Every 6 months or 500h', instructions:'Heat to 200°C, remove the silicone sock, use a wrench to unscrew the nozzle. Install new nozzle while hot. Torque to 1.5 Nm — do not overtighten.', parts:['A00-P1P-0099','A00-P1P-0097'] },
  { printer:'P1S', task:'Replace PTFE tube', interval_days:365, interval_label:'Yearly or when discoloured', instructions:'Remove the toolhead, extract the PTFE tube and inspect for yellowing or deformation. Replace if the inner bore appears enlarged or discoloured.', parts:['A00-P1P-0053'] },
  { printer:'P1S', task:'AMS desiccant replacement', interval_days:90, interval_label:'Every 3 months', instructions:'Open the AMS lid and remove the desiccant cartridge. Replace with fresh desiccant. The indicator window turns pink when saturated.', parts:['AMS-P1P-0004'] },
  // H2D
  { printer:'H2D', task:'Lubricate X/Y carbon rods', interval_days:14, interval_label:'Every 2 weeks', instructions:'Apply lubricating oil to all carbon rods on X and Y axes. H2D has dual gantry — lubricate both sides.', parts:['A06-P1P-0002'] },
  { printer:'H2D', task:'Lubricate lead screws (dual Z)', interval_days:30, interval_label:'Monthly', instructions:'Apply Bambu lubricating grease to both Z-axis lead screws. Move bed to bottom, apply grease full length, run Z-axis several times to distribute.', parts:['A06-P1P-0001'] },
  { printer:'H2D', task:'Lubricate linear rails', interval_days:90, interval_label:'Every 3 months', instructions:'Apply a small amount of grease to all linear rail carriages on the H2D. The larger build volume means more rails to lubricate than P1S.', parts:['A06-P1P-0001'] },
  { printer:'H2D', task:'Clean chamber and fans', interval_days:30, interval_label:'Monthly', instructions:'Use compressed air to clean the chamber interior, focusing on the exhaust fan and any dust accumulation. The H2D chamber is larger — pay attention to the rear exhaust.', parts:[] },
  { printer:'H2D', task:'Calibrate both toolheads', interval_days:90, interval_label:'Every 3 months', instructions:'Run full calibration sequence from touchscreen: Vibration Compensation, Flow Calibration, and First Layer Calibration for both extruders. Critical for dual-material prints.', parts:[] },
  { printer:'H2D', task:'Inspect dual extruder alignment', interval_days:30, interval_label:'Monthly', instructions:'Print a dual-color alignment test. If the two toolheads are offset, run the toolhead offset calibration from the calibration menu.', parts:[] },
  { printer:'H2D', task:'Replace nozzle (both toolheads)', interval_days:180, interval_label:'Every 6 months', instructions:'Replace nozzles on both toolheads at the same time. Heat both to 200°C, remove silicone socks, swap nozzles. Recalibrate toolhead offsets after.', parts:['A00-H2D-0001'] },
  { printer:'H2D', task:'AMS 2 Pro desiccant replacement', interval_days:90, interval_label:'Every 3 months', instructions:'Replace the AMS 2 Pro desiccant cartridge. Check the indicator colour — replace when pink. The AMS 2 Pro holds humidity-sensitive filaments like PA and PC.', parts:['AMS2-H2D-0002'] },
  { printer:'H2D', task:'AMS HT desiccant replacement', interval_days:90, interval_label:'Every 3 months', instructions:'The AMS HT stores high-temp filaments. Replace desiccant more frequently if using PA-CF or PC-CF as these are especially moisture-sensitive.', parts:['AMSHT-H2D-0002'] },
  { printer:'H2D', task:'AMS 2 Pro PTFE tube inspection', interval_days:90, interval_label:'Every 3 months', instructions:'Inspect the AMS 2 Pro PTFE tubes for wear, kinking, or discolouration. Replace any tubes that appear deformed or have been used with abrasive filaments.', parts:['AMS2-H2D-0002'] },
];

// Get parts flat list
export function getAllParts() {
  return Object.entries(PARTS_CATALOGUE).flatMap(([cat, data]) =>
    data.items.map(item => ({ ...item, category: cat, categoryIcon: data.icon }))
  );
}

// Get maintenance tasks for a specific printer model
export function getMaintenanceFor(model) {
  if (!model) return MAINTENANCE_SCHEDULE;
  return MAINTENANCE_SCHEDULE.filter(t =>
    t.printer === model || model.includes(t.printer)
  );
}

// Vortex Induction Hotends - compatible with P1S and H2D via adapter
export const VORTEX_PARTS = {
  'Vortex Hotends': {
    icon: '🌀',
    description: 'High-performance induction heated hotends for P1S and H2D',
    items: [
      { sku: 'VX-P1S-0.4', name: 'Vortex Induction Hotend 0.4mm (P1S)', compatible: ['P1S'], price_cad: 89.99, url: 'https://vortex3d.ca', notes: 'Drop-in replacement, faster heat-up, better thermal stability', reorder_at: 1 },
      { sku: 'VX-P1S-0.6', name: 'Vortex Induction Hotend 0.6mm (P1S)', compatible: ['P1S'], price_cad: 89.99, url: 'https://vortex3d.ca', notes: 'High-flow for speed printing', reorder_at: 1 },
      { sku: 'VX-H2D-0.4', name: 'Vortex Induction Hotend 0.4mm (H2D)', compatible: ['H2D'], price_cad: 99.99, url: 'https://vortex3d.ca', notes: 'H2D compatible induction hotend', reorder_at: 1 },
      { sku: 'VX-H2D-0.6', name: 'Vortex Induction Hotend 0.6mm (H2D)', compatible: ['H2D'], price_cad: 99.99, url: 'https://vortex3d.ca', notes: 'H2D high-flow induction hotend', reorder_at: 1 },
      { sku: 'VX-KIT-P1S', name: 'Vortex Induction Kit - P1S Full Set', compatible: ['P1S'], price_cad: 159.99, url: 'https://vortex3d.ca', notes: 'Includes 0.2, 0.4, 0.6, 0.8mm nozzles + hotend', reorder_at: 1 },
    ],
  },
};

// Merged parts catalogue including Vortex
export const FULL_PARTS_CATALOGUE = { ...PARTS_CATALOGUE, ...VORTEX_PARTS };
