-- Add cardiac axis to the systematic read. Existing cases score it too.
update cases
set scored_steps = '["rate","rhythm","axis","p","pr","qrs","q","st","t","qtc"]'::jsonb,
    updated_at = now()
where not (scored_steps ? 'axis');
