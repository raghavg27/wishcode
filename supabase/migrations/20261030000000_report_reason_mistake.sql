-- Lets the person who added a wish by mistake ask an admin to delete it,
-- through the report form. Only wishes take this reason, not links.

alter type public.report_reason add value 'mistake';
