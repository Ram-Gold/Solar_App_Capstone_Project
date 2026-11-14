-- ==============================================================================
-- JD Force Solar Products Trading
-- Admin & Staff Password Management Migration
-- ==============================================================================
-- Enables secure password changing for logged-in Administrators and Staff members,
-- and allows Administrators to change/reset passwords for Staff and Admin accounts.
-- Directly updates auth.users (encrypted_password) on Supabase.
-- ==============================================================================

-- 1. Ensure pgcrypto extension is installed
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Function: change_own_password (For logged-in Admin or Staff)
CREATE OR REPLACE FUNCTION public.change_own_password(
    p_current_password TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_stored_hash TEXT;
    v_is_staff_or_admin BOOLEAN;
BEGIN
    -- Step A: Verify caller is authenticated
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Authentication required. Please sign in to update your password.'
        );
    END IF;

    -- Step B: Verify caller is in admins or staff
    SELECT EXISTS (
        SELECT 1 FROM public.admins WHERE id = v_user_id
        UNION
        SELECT 1 FROM public.staff WHERE id = v_user_id
    ) INTO v_is_staff_or_admin;

    IF NOT v_is_staff_or_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Account not found in administrator or staff directory.'
        );
    END IF;

    -- Step C: Validate new password criteria
    IF p_new_password IS NULL OR length(trim(p_new_password)) < 8 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'New password must be at least 8 characters long.'
        );
    END IF;

    -- Step D: Disallow reusing the current password as the new password
    IF p_current_password IS NOT NULL AND p_current_password = p_new_password THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'New password cannot be identical to your current password.'
        );
    END IF;

    -- Step E: Fetch current encrypted password
    SELECT encrypted_password INTO v_stored_hash
    FROM auth.users
    WHERE id = v_user_id;

    IF v_stored_hash IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User account record not found in database.'
        );
    END IF;

    -- Step F: Verify current password against stored hash using pgcrypto
    IF v_stored_hash <> extensions.crypt(p_current_password, v_stored_hash) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Current password does not match.'
        );
    END IF;

    -- Step G: Update auth.users encrypted_password with blowfish salt
    UPDATE auth.users
    SET 
        encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
        updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Your password has been changed successfully.'
    );
END;
$$;

-- Revoke public/anon access and grant to authenticated only
REVOKE ALL ON FUNCTION public.change_own_password(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_own_password(TEXT, TEXT) TO authenticated;


-- 3. Function: admin_set_user_password (Admin sets password for Staff or Admin)
CREATE OR REPLACE FUNCTION public.admin_set_user_password(
    p_target_user_id UUID,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_target_exists BOOLEAN;
BEGIN
    -- Step A: Verify caller is authenticated
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Authentication required.'
        );
    END IF;

    -- Step B: Verify caller has admin role
    v_caller_role := public.get_user_role();
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Only platform administrators can change user passwords.'
        );
    END IF;

    -- Step C: Validate new password criteria
    IF p_new_password IS NULL OR length(trim(p_new_password)) < 8 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'New password must be at least 8 characters long.'
        );
    END IF;

    -- Step D: Check target user exists in admins or staff
    SELECT EXISTS (
        SELECT 1 FROM public.admins WHERE id = p_target_user_id
        UNION
        SELECT 1 FROM public.staff WHERE id = p_target_user_id
    ) INTO v_target_exists;

    IF NOT v_target_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Target user account not found in administrator or staff records.'
        );
    END IF;

    -- Step E: Update auth.users encrypted_password
    UPDATE auth.users
    SET 
        encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
        updated_at = now()
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User password updated successfully.'
    );
END;
$$;

-- Revoke public/anon access and grant to authenticated only
REVOKE ALL ON FUNCTION public.admin_set_user_password(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password(UUID, TEXT) TO authenticated;

