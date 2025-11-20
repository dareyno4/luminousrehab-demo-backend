require("dotenv/config");
const express = require("express");
const cors = require("cors");
const { requireAuth } = require("./middleware/auth");
const { supabaseAdmin, supabaseUserScoped } = require("./lib/supabase");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req: any, res: any) => res.json({ok: true}));

app.get("/api/protected-data", requireAuth, async (req: any, res: any) => {
    const { orgId } = req.params;
    const { data, error } = await supabaseUserScoped
        .from("protected_table")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }
    
    res.json({ data });
});

// User activation endpoint (uses admin API with service role key)
app.post("/api/activate-user", async (req: any, res: any) => {
    try {
        const { activationCode, password, additionalData } = req.body;

        if (!activationCode || !password) {
            return res.status(400).json({ error: 'Missing activation code or password' });
        }

        // Verify the invitation
        const { data: invitation, error: inviteError } = await supabaseAdmin
            .from('user_invitations')
            .select('*')
            .eq('activation_code', activationCode)
            .eq('status', 'pending')
            .single();

        if (inviteError || !invitation) {
            return res.status(400).json({ error: 'Invalid or expired activation code' });
        }

        // Check expiration
        if (new Date(invitation.expires_at) < new Date()) {
            await supabaseAdmin
                .from('user_invitations')
                .update({ status: 'expired' })
                .eq('id', invitation.id);
            return res.status(400).json({ error: 'Activation code has expired' });
        }

        // Create auth user with admin API (auto-confirm email)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: invitation.email,
            password: password,
            email_confirm: true,
            user_metadata: {
                first_name: invitation.first_name,
                last_name: invitation.last_name,
                role: invitation.role,
                tenant_id: invitation.tenant_id,
            },
        });

        if (authError) {
            console.error('Auth error:', authError);
            return res.status(500).json({ error: `Failed to create account: ${authError.message}` });
        }

        if (!authData.user) {
            return res.status(500).json({ error: 'Failed to create user account' });
        }

        // Create user record in users table
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .insert({
                id: authData.user.id,
                email: invitation.email,
                first_name: invitation.first_name,
                last_name: invitation.last_name,
                role: invitation.role,
                tenant_id: invitation.tenant_id,
                phone_number: additionalData?.phone_number || invitation.phone_number,
                occupation: additionalData?.occupation || invitation.occupation,
                active: true,
                invitation_id: invitation.id,
                last_login: new Date().toISOString(),
            })
            .select()
            .single();

        if (userError) {
            console.error('User table error:', userError);
            // Cleanup auth user
            try {
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            } catch (cleanupError) {
                console.error('Failed to cleanup auth user:', cleanupError);
            }
            return res.status(500).json({ error: `Failed to create user record: ${userError.message}` });
        }

        // Mark invitation as activated
        await supabaseAdmin
            .from('user_invitations')
            .update({
                status: 'activated',
                activated_at: new Date().toISOString(),
            })
            .eq('id', invitation.id);

        res.json({
            success: true,
            user: userData,
            message: 'Account activated successfully!',
        });
    } catch (error: any) {
        console.error('Activation error:', error);
        res.status(500).json({ error: error.message || 'Failed to activate account' });
    }
});

// Tenant activation endpoint (creates first admin user for a tenant)
app.post("/api/activate-tenant", async (req: any, res: any) => {
    try {
        const { 
            tenantSubdomain, 
            activationCode, 
            email, 
            password, 
            firstName, 
            lastName 
        } = req.body;

        if (!tenantSubdomain || !activationCode || !email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. Verify tenant exists and get metadata
        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .select('id, name, metadata, status, baa_signed')
            .eq('subdomain', tenantSubdomain)
            .single();

        if (tenantError || !tenant) {
            return res.status(400).json({ error: 'Tenant not found' });
        }

        if (tenant.status !== 'active') {
            return res.status(400).json({ error: 'Tenant is not active' });
        }

        if (!tenant.baa_signed) {
            return res.status(400).json({ error: 'BAA must be signed before activation' });
        }

        // 2. Verify activation code
        const metadata = tenant.metadata || {};
        if (!metadata.activation_code || metadata.activation_code !== activationCode) {
            return res.status(400).json({ error: 'Invalid activation code' });
        }

        if (metadata.activation_used) {
            return res.status(400).json({ error: 'Activation code has already been used' });
        }

        // 3. Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                first_name: firstName,
                last_name: lastName,
                role: 'agency_admin',
                tenant_id: tenant.id,
            }
        });

        if (authError) {
            console.error('Auth creation error:', authError);
            return res.status(500).json({ error: `Failed to create auth user: ${authError.message}` });
        }

        if (!authData.user) {
            return res.status(500).json({ error: 'Failed to create auth user' });
        }

        // 4. Create user record in users table (using admin client to bypass RLS)
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .insert({
                id: authData.user.id,
                tenant_id: tenant.id,
                email: email,
                first_name: firstName,
                last_name: lastName,
                role: 'agency_admin',
                active: true,
                mfa_enabled: false,
                last_login: new Date().toISOString(),
            })
            .select()
            .single();

        if (userError) {
            console.error('User table error:', userError);
            // Cleanup auth user
            try {
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            } catch (cleanupError) {
                console.error('Failed to cleanup auth user:', cleanupError);
            }
            return res.status(500).json({ error: `Failed to create user record: ${userError.message}` });
        }

        // 5. Mark activation code as used
        const updatedMetadata = {
            ...metadata,
            activation_used: true,
            activation_used_at: new Date().toISOString(),
            activation_used_by: email,
        };

        await supabaseAdmin
            .from('tenants')
            .update({ metadata: updatedMetadata })
            .eq('id', tenant.id);

        // 6. Create audit log
        await supabaseAdmin
            .from('audit_logs')
            .insert({
                tenant_id: tenant.id,
                user_id: authData.user.id,
                entity_type: 'tenant',
                entity_id: tenant.id,
                action: 'tenant_activated',
                changes: {
                    admin_created: true,
                    admin_email: email,
                },
                metadata: {
                    activation_code_used: activationCode,
                },
            });

        res.json({
            success: true,
            user: userData,
            tenant: {
                id: tenant.id,
                name: tenant.name,
            },
            message: 'Tenant activated successfully!',
        });
    } catch (error: any) {
        console.error('Tenant activation error:', error);
        res.status(500).json({ error: error.message || 'Failed to activate tenant' });
    }
});

app.listen(process.env.PORT || 8080, () => {
    console.log(`Server running on port ${process.env.PORT || 8080}`);
});