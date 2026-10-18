import csv
import re
import os

csv_file = '/home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/solar_database_full.csv'
out_sql = '/home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/import_solar_products.sql'

SUPABASE_STORAGE_URL = 'https://gkrdwzbxpstpqpvqlwbt.supabase.co/storage/v1/object/public/product-images'

# The 101 image mappings
from upload_images_map import IMAGE_MAPPINGS

def sql_str(val):
    if val is None or val == '' or str(val).strip() == '':
        return 'NULL'
    s = str(val).strip()
    s = s.replace("'", "''")
    return f"'{s}'"

def parse_watt(watt_str):
    if not watt_str:
        return 'NULL'
    digits = re.findall(r'\d+', watt_str)
    if digits:
        return int(digits[0])
    return 'NULL'

with open(csv_file, 'r', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

sql_lines = []
sql_lines.append("-- JD Solar Platform - 101 Product Import & Spec Migration SQL")
sql_lines.append("-- 1. Add new columns if not exist")
sql_lines.append("""ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS beaming_angle text,
  ADD COLUMN IF NOT EXISTS color_temperature text,
  ADD COLUMN IF NOT EXISTS voltage text,
  ADD COLUMN IF NOT EXISTS lamp_body_color text,
  ADD COLUMN IF NOT EXISTS warranty text,
  ADD COLUMN IF NOT EXISTS life_span text,
  ADD COLUMN IF NOT EXISTS lumens text,
  ADD COLUMN IF NOT EXISTS place_of_use text;
""")

sql_lines.append("-- 2. Insert new categories into public.categories")
unique_types = sorted(list(set(r['name'].strip() for r in rows if r['name'].strip())))
for ut in unique_types:
    escaped = ut.replace("'", "''")
    sql_lines.append(f"INSERT INTO public.categories (name) VALUES ('{escaped}') ON CONFLICT (name) DO NOTHING;")

sql_lines.append("\n-- 3. Upsert products 1 to 23 and insert products 24 to 101")

for idx, r in enumerate(rows):
    prod_id = idx + 1
    base_name = r['name'].strip()
    watts = r['watts'].strip()
    
    # Form product title: e.g. "Aviation Aluminum Solar Road Light 300W"
    # Special case: if already contains watts (like "Integrated Solar Street Light (Warm White) 150W")
    if watts and not base_name.endswith(watts):
        if '(' in base_name and ')' in base_name:
            # e.g. "Integrated Solar Street Light (Warm White)" -> "Integrated Solar Street Light (Warm White) 150W"
            full_name = f"{base_name} {watts}"
        else:
            full_name = f"{base_name} {watts}"
    else:
        full_name = base_name

    # Check mapping
    map_entry = IMAGE_MAPPINGS[idx]
    dest_name = map_entry['dest']
    img_url = f"{SUPABASE_STORAGE_URL}/{dest_name}"
    
    watt_val = parse_watt(watts)
    waterproof = sql_str(r.get('waterproof_grade'))
    method_control = sql_str(r.get('method_control'))
    material = sql_str(r.get('material'))
    solar_panel = sql_str(r.get('solar_panel'))
    battery = sql_str(r.get('battery'))
    charging_time = sql_str(r.get('charging_time'))
    charging_type = sql_str(r.get('charging_type'))
    smd_lamp_beads = sql_str(r.get('smd_lamp_beads'))
    lighting_time = sql_str(r.get('lighting_time'))
    size = sql_str(r.get('size'))
    
    # In stock, sales, stock_quantity
    in_stock = 'true'
    sales = 0
    stock_quantity = 15
    
    beaming_angle = sql_str(r.get('beaming_angle'))
    color_temp = sql_str(r.get('color_temperature'))
    voltage = sql_str(r.get('voltage'))
    lamp_body_color = sql_str(r.get('lamp_body_color'))
    warranty = sql_str(r.get('warranty'))
    life_span = sql_str(r.get('life_span'))
    lumens = sql_str(r.get('lumens'))
    place_of_use = sql_str(r.get('place_of_use'))

    if prod_id <= 23:
        # Update existing records to preserve FKs and update specs & image_url
        update_stmt = f"""UPDATE public.products SET
  name = {sql_str(full_name)},
  type = {sql_str(base_name)},
  watt = {watt_val},
  waterproof_grade = {waterproof},
  method_control = {method_control},
  material = {material},
  solar_panel = {solar_panel},
  battery = {battery},
  charging_time = {charging_time},
  charging_type = {charging_type},
  smd_lamp_beads = {smd_lamp_beads},
  lighting_time = {lighting_time},
  size = {size},
  image_url = {sql_str(img_url)},
  beaming_angle = {beaming_angle},
  color_temperature = {color_temp},
  voltage = {voltage},
  lamp_body_color = {lamp_body_color},
  warranty = {warranty},
  life_span = {life_span},
  lumens = {lumens},
  place_of_use = {place_of_use}
WHERE id = {prod_id};"""
        sql_lines.append(update_stmt)
    else:
        # Insert new product
        insert_stmt = f"""INSERT INTO public.products (
  id, name, type, watt, waterproof_grade, method_control, material,
  solar_panel, battery, charging_time, charging_type, smd_lamp_beads,
  lighting_time, size, in_stock, sales, stock_quantity, image_url,
  beaming_angle, color_temperature, voltage, lamp_body_color,
  warranty, life_span, lumens, place_of_use
) VALUES (
  {prod_id}, {sql_str(full_name)}, {sql_str(base_name)}, {watt_val}, {waterproof}, {method_control}, {material},
  {solar_panel}, {battery}, {charging_time}, {charging_type}, {smd_lamp_beads},
  {lighting_time}, {size}, {in_stock}, {sales}, {stock_quantity}, {sql_str(img_url)},
  {beaming_angle}, {color_temp}, {voltage}, {lamp_body_color},
  {warranty}, {life_span}, {lumens}, {place_of_use}
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  watt = EXCLUDED.watt,
  waterproof_grade = EXCLUDED.waterproof_grade,
  method_control = EXCLUDED.method_control,
  material = EXCLUDED.material,
  solar_panel = EXCLUDED.solar_panel,
  battery = EXCLUDED.battery,
  charging_time = EXCLUDED.charging_time,
  charging_type = EXCLUDED.charging_type,
  smd_lamp_beads = EXCLUDED.smd_lamp_beads,
  lighting_time = EXCLUDED.lighting_time,
  size = EXCLUDED.size,
  image_url = EXCLUDED.image_url,
  beaming_angle = EXCLUDED.beaming_angle,
  color_temperature = EXCLUDED.color_temperature,
  voltage = EXCLUDED.voltage,
  lamp_body_color = EXCLUDED.lamp_body_color,
  warranty = EXCLUDED.warranty,
  life_span = EXCLUDED.life_span,
  lumens = EXCLUDED.lumens,
  place_of_use = EXCLUDED.place_of_use;"""
        sql_lines.append(insert_stmt)

sql_lines.append("\n-- 4. Sync sequences")
sql_lines.append("SELECT setval('products_id_seq', (SELECT max(id) FROM public.products));")

with open(out_sql, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines) + '\n')

print(f"Generated {out_sql} with {len(rows)} products.")
