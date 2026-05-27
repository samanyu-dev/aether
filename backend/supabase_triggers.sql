-- 🌌 AETHER COGNITION OBSERVABILITY PLATFORM
-- ==========================================
-- Supabase Database Triggers for Real-time User Quota Tracking
-- 
-- Apply this migration script inside your Supabase SQL Editor to automate
-- trace consumption counting and maintain pricing compliance.

-- 1. TRIGGER FUNCTION FOR TRACE INGESTION (INCREMENT)
CREATE OR REPLACE FUNCTION public.handle_trace_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment the ingested traces count for the associated user profile
    UPDATE public.profiles
    SET quota_traces_used = quota_traces_used + 1
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER DEFINITION FOR AFTER INSERT
DROP TRIGGER IF EXISTS on_trace_created ON public.traces;
CREATE TRIGGER on_trace_created
    AFTER INSERT ON public.traces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_trace_insert();


-- 3. TRIGGER FUNCTION FOR TRACE PURGING (DECREMENT)
CREATE OR REPLACE FUNCTION public.handle_trace_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrement the ingested traces count, preventing negative numbers
    UPDATE public.profiles
    SET quota_traces_used = GREATEST(0, quota_traces_used - 1)
    WHERE id = OLD.user_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGER DEFINITION FOR AFTER DELETE
DROP TRIGGER IF EXISTS on_trace_deleted ON public.traces;
CREATE TRIGGER on_trace_deleted
    AFTER DELETE ON public.traces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_trace_delete();
