CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'note' NOT NULL,
	`folder` text DEFAULT 'Unsorted' NOT NULL,
	`size` text DEFAULT '1 KB' NOT NULL,
	`object_key` text,
	`starred` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
