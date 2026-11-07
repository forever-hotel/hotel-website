-- Synthetic local demonstration only. Never seed production/shared inventory.
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'hw_docs_demo' THEN
    RAISE EXCEPTION 'Demo seed requires the disposable hw_docs_demo database';
  END IF;
END $$;
INSERT INTO room_types (room_type_id,type_name,price_per_night,max_guests,description)
VALUES ('33333333-3333-4333-8333-333333333333','[DEMO] Documentation Suite',1000000,2,'Synthetic local setup data; not a published hotel rate or room.')
ON CONFLICT DO NOTHING;
INSERT INTO room_type_images (room_type_id,image_url)
VALUES ('33333333-3333-4333-8333-333333333333','/images/forever-city-room.jpg')
ON CONFLICT DO NOTHING;
INSERT INTO room_type_amenities (room_type_id,amenity)
VALUES ('33333333-3333-4333-8333-333333333333','Demo Wi-Fi')
ON CONFLICT DO NOTHING;
INSERT INTO rooms (room_number,room_type_id,floor,status)
VALUES ('DOCS-01','33333333-3333-4333-8333-333333333333',1,'VACANT')
ON CONFLICT DO NOTHING;
COMMIT;
