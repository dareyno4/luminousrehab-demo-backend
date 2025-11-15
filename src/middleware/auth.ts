const { supabaseUserScoped } = require('../lib/supabase');

interface AuthRequest {
    headers: {
        authorization?: string;
    };
    userId?: string;
}

function requireAuth(req: AuthRequest, res: any, next: (error?: any) => void) {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i,"");
    if(!token) return res.status(401).json({error: "Missing token"});
    //pass token through so RLS sees auth.uid()
    (supabaseUserScoped as any).auth.setAuth(token);
    req.userId = "jwt";
    next();
}

module.exports = { requireAuth };