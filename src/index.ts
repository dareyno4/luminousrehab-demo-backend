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

app.listen(process.env.PORT || 8080, () => {
    console.log(`Server running on port ${process.env.PORT || 8080}`);
});