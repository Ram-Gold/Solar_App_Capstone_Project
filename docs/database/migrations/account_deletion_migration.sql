-- ==============================================================================
-- JD Force Solar Products Trading
-- Account & Customer Deletion Migration
-- ==============================================================================
-- Enables secure, cascading deletion of Customer accounts (by Admin or Customer
-- self-deletion via token) and Staff/Admin platform accounts (by Admin or
-- self-deletion, with last-admin protection and auth.users cleanup).
-- ==============================================================================

-- 1. Ensure ON DELETE CASCADE on customer-related foreign keys
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'customer_passwords_customer_id_fkey'
          AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.customer_passwords
            DROP CONSTRAINT customer_passwords_customer_id_fkey,
            ADD CONSTRAINT customer_passwords_customer_id_fkey
                FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'customer_purchases_customer_id_fkey'
          AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.customer_purchases
            DROP CONSTRAINT customer_purchases_customer_id_fkey,
            ADD CONSTRAINT customer_purchases_customer_id_fkey
                FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'warranty_claims_purchase_id_fkey'
          AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.warranty_claims
            DROP CONSTRAINT warranty_claims_purchase_id_fkey,
            ADD CONSTRAINT warranty_claims_purchase_id_fkey
                FOREIGN KEY (purchase_id) REFERENCES public.customer_purchases(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Allow Staff to delete their own row in public.staff (fallback policy)
DROP POLICY IF EXISTS "Staff can delete own row" ON public.staff;
CREATE POLICY "Staff can delete own row"
    ON public.staff
    FOR DELETE
    TO authenticated
    USING (auth.uid() = id);

-- 3. RPC: Delete Customer Account (Admin by customer_id OR Customer by access_token)
CREATE OR REPLACE FUNCTION public.delete_customer_account(
    p_token UUID DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_customer RECORD;
    v_caller_role TEXT;
BEGIN
    -- Path A: Customer self-deletion using their unique access_token
    IF p_token IS NOT NULL THEN
        SELECT id, full_name, access_token
        INTO v_customer
        FROM public.customers
        WHERE access_token = p_token;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Customer account not found or already deleted.'
            );
        END IF;

        DELETE FROM public.customers WHERE id = v_customer.id;

        RETURN jsonb_build_object(
            'success', true,
            'deleted_id', v_customer.id,
            'message', 'Customer account and all associated records permanently deleted.'
        );
    END IF;

    -- Path B: Admin deletion using customer_id
    IF p_customer_id IS NOT NULL THEN
        v_caller_role := public.get_user_role();
        IF v_caller_role IS DISTINCT FROM 'admin' THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Only administrators have permission to delete customer records.'
            );
        END IF;

        SELECT id, full_name
        INTO v_customer
        FROM public.customers
        WHERE id = p_customer_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Customer record not found.'
            );
        END IF;

        DELETE FROM public.customers WHERE id = v_customer.id;

        RETURN jsonb_build_object(
            'success', true,
            'deleted_id', v_customer.id,
            'message', 'Customer record and all associated warranties permanently deleted.'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', false,
        'error', 'A valid customer token or customer ID is required.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_customer_account(UUID, UUID) TO anon, authenticated;

-- 4. RPC: Delete Platform User (Staff / Admin by Admin OR Self-Deletion)
CREATE OR REPLACE FUNCTION public.delete_platform_user(
    p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_is_target_admin BOOLEAN;
    v_admin_count INTEGER;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Authentication required.'
        );
    END IF;

    v_caller_role := public.get_user_role();

    -- Must be either an Admin OR the user deleting their own account
    IF v_caller_role IS DISTINCT FROM 'admin' AND v_caller_id <> p_target_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You do not have permission to delete this user account.'
        );
    END IF;

    -- Check if target user is an Administrator
    SELECT EXISTS (
        SELECT 1 FROM public.admins WHERE id = p_target_user_id
    ) INTO v_is_target_admin;

    -- Prevent deleting the last remaining Administrator
    IF v_is_target_admin THEN
        SELECT COUNT(*) INTO v_admin_count FROM public.admins;
        IF v_admin_count <= 1 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Cannot delete the last remaining administrator account.'
            );
        END IF;
    END IF;

    -- Delete from role tables and Supabase auth.users
    DELETE FROM public.admins WHERE id = p_target_user_id;
    DELETE FROM public.staff WHERE id = p_target_user_id;
    DELETE FROM auth.users WHERE id = p_target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_id', p_target_user_id,
        'message', 'User account permanently deleted.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_platform_user(UUID) TO authenticated;

