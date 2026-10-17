-- A deleted set keeps its rows so its ids stay reserved: a re-upload of the same
-- map gets them back. Written by hand like 0038+.
ALTER TABLE `beatmapset` ADD `deleted_at` timestamp;
