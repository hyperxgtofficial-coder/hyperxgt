// Vercel Serverless Function: Official Supabase GoTrue Auth & Customer Profile API Engine
const https = require('https');

function httpsRequest(urlStr, method, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const postData = bodyObj ? JSON.stringify(bodyObj) : null;
      
      const reqHeaders = {
        'Content-Type': 'application/json',
        ...headers
      };
      if (postData) {
        reqHeaders['Content-Length'] = Buffer.byteLength(postData);
      }

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method || 'POST',
        headers: reqHeaders
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch(e) {
            resolve({ statusCode: res.statusCode, body: data });
          }
        });
      });

      req.on('error', err => reject(err));
      if (postData) req.write(postData);
      req.end();
    } catch(err) {
      reject(err);
    }
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const action = req.query.action || (req.body && req.body.action) || 'login';

    const supabaseUrl = (process.env.SUPABASE_URL || "https://hyperxgt-db.supabase.co").replace(/\/$/, '');
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";

    const commonHeaders = {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    };

    let redirectDomain = process.env.SITE_URL || 'https://hyperxgt.com';
    if (redirectDomain.includes("localhost") || redirectDomain.includes("127.0.0.1")) {
      redirectDomain = 'https://hyperxgt.com';
    }
    const redirectUrl = `${redirectDomain}/account.html`;

    // 1. SUPABASE SIGNUP / REGISTRATION (auth/v1/signup)
    if (action === 'register') {
      const { name, email, phone, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      const signUpUrl = `${supabaseUrl}/auth/v1/signup?redirect_to=${encodeURIComponent(redirectUrl)}`;
      const signUpBody = {
        email: email.toLowerCase().trim(),
        password: password,
        data: {
          full_name: name || "HyperXGT Driver",
          phone: phone || ""
        }
      };

      let userObj = null;
      let sessionData = null;
      let supabaseError = null;

      try {
        const suRes = await httpsRequest(signUpUrl, 'POST', commonHeaders, signUpBody);
        if (suRes.statusCode >= 200 && suRes.statusCode < 300 && suRes.body) {
          userObj = suRes.body.user || suRes.body;
          sessionData = suRes.body;
        } else if (suRes.body && (suRes.body.user || suRes.body.id)) {
          userObj = suRes.body.user || suRes.body;
        } else if (suRes.body && (suRes.body.msg || suRes.body.error_description || suRes.body.message)) {
          supabaseError = suRes.body.msg || suRes.body.error_description || suRes.body.message;
          // If Supabase created user but native mailer failed, extract user or proceed
          if (supabaseError.toLowerCase().includes("confirmation email")) {
            userObj = {
              id: "usr_" + Math.floor(100000 + Math.random() * 900000),
              email: email.toLowerCase().trim(),
              user_metadata: { full_name: name || "Driver", phone: phone || "" }
            };
          } else {
            return res.status(400).json({ error: supabaseError });
          }
        }
      } catch(err) {
        console.log("Supabase signup connection error:", err.message);
        supabaseError = err.message;
      }

      if (!userObj) {
        if (supabaseUrl.includes("dummy") || supabaseAnonKey.includes("dummy")) {
          return res.status(400).json({ 
            error: "SUPABASE_URL or SUPABASE_ANON_KEY is not set in Vercel Environment Variables. Please add SUPABASE_URL & SUPABASE_ANON_KEY in Vercel Settings." 
          });
        }
        return res.status(400).json({ error: supabaseError || "Failed to register user in Supabase Auth." });
      }

      // Trigger Branded Welcome & Verification Email Dispatch
      try {
        const origin = req.headers.host ? `https://${req.headers.host}` : redirectDomain;
        await httpsRequest(`${origin}/api/send-email`, 'POST', { 'Content-Type': 'application/json' }, {
          template: 'verification',
          toEmail: email,
          toName: name || 'Racer',
          confirmUrl: redirectUrl
        });
      } catch(e) {}

      // Supabase only returns a session when email confirmation is disabled. When it does
      // not, no token is issued — previously a synthetic "demo_token_<timestamp>" was sent,
      // which the browser stored as if it were a real session.
      const accessToken = (sessionData && sessionData.access_token) || null;

      return res.status(201).json({
        success: true,
        requiresConfirmation: !accessToken,
        message: accessToken
          ? "Registered successfully — you are signed in."
          : `Registered successfully! Confirm your email (${email}), then sign in.`,
        token: accessToken,
        refresh_token: (sessionData && sessionData.refresh_token) || null,
        user: {
          id: userObj.id || userObj.user_id,
          supabase_user_id: userObj.id,
          name: name || (userObj.user_metadata && userObj.user_metadata.full_name) || "Customer",
          email: email.toLowerCase().trim(),
          phone: phone || (userObj.user_metadata && userObj.user_metadata.phone) || "",
          verified: !!userObj.email_confirmed_at
        }
      });
    }

    // 2. SUPABASE LOGIN (auth/v1/token?grant_type=password)
    if (action === 'login') {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const tokenUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
      const loginBody = {
        email: email.toLowerCase().trim(),
        password: password
      };

      let authResult = null;

      try {
        const loginRes = await httpsRequest(tokenUrl, 'POST', commonHeaders, loginBody);
        if (loginRes.body && loginRes.body.access_token) {
          authResult = loginRes.body;
        } else if (loginRes.body && (loginRes.body.error_description || loginRes.body.msg)) {
          const apiError = loginRes.body.error_description || loginRes.body.msg;
          if (apiError.toLowerCase().includes("email not confirmed")) {
            return res.status(400).json({
              error: "Email not confirmed yet. Please click the 'Verify Email' button sent to your inbox, or disable 'Confirm Email' in your Supabase Auth settings."
            });
          }
          return res.status(401).json({ error: apiError });
        }
      } catch(err) {
        console.error("Supabase login connection error:", err.message);
        return res.status(503).json({ error: 'Authentication service is unreachable. Please try again shortly.' });
      }

      // AUTHENTICATION BYPASS FIX: this previously fell through to a fabricated user object
      // and a synthetic "token_<timestamp>", so whenever Supabase was unconfigured or did
      // not return a token, ANY email with ANY password received a successful session.
      // No verified access token means no session — full stop.
      if (!authResult || !authResult.access_token || !authResult.user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const loggedUser = authResult.user;

      return res.status(200).json({
        success: true,
        message: "Signed in successfully",
        token: authResult.access_token,
        refresh_token: authResult.refresh_token || null,
        user: {
          id: loggedUser.id,
          name: (loggedUser.user_metadata && loggedUser.user_metadata.full_name) || loggedUser.email.split('@')[0],
          email: loggedUser.email,
          phone: (loggedUser.user_metadata && loggedUser.user_metadata.phone) || "",
          address: (loggedUser.user_metadata && loggedUser.user_metadata.address) || "",
          city: (loggedUser.user_metadata && loggedUser.user_metadata.city) || "",
          state: (loggedUser.user_metadata && loggedUser.user_metadata.state) || "",
          pincode: (loggedUser.user_metadata && loggedUser.user_metadata.pincode) || "",
          verified: !!loggedUser.email_confirmed_at
        }
      });
    }

    // 3. SUPABASE FORGOT / RECOVER PASSWORD (auth/v1/recover)
    if (action === 'forgot_password') {
      const { email } = req.body || {};

      if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
      }

      const recoverUrl = `${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectUrl)}`;
      const recoverBody = {
        email: email.toLowerCase().trim()
      };

      try {
        const recRes = await httpsRequest(recoverUrl, 'POST', commonHeaders, recoverBody);
        if (recRes.statusCode >= 400 && recRes.body && recRes.body.msg) {
          return res.status(400).json({ error: recRes.body.msg });
        }
      } catch(err) {}

      // Trigger Branded Password Reset Email
      try {
        const origin = req.headers.host ? `https://${req.headers.host}` : redirectDomain;
        await httpsRequest(`${origin}/api/send-email`, 'POST', { 'Content-Type': 'application/json' }, {
          template: 'password_reset',
          toEmail: email,
          confirmUrl: redirectUrl
        });
      } catch(e) {}

      return res.status(200).json({
        success: true,
        message: `Password reset instructions sent to ${email}`
      });
    }

    // 4. LOGOUT (auth/v1/logout)
    if (action === 'logout') {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const logoutUrl = `${supabaseUrl}/auth/v1/logout`;
          await httpsRequest(logoutUrl, 'POST', {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${token}`
          });
        } catch(e) {}
      }

      return res.status(200).json({
        success: true,
        message: "Successfully signed out"
      });
    }

    // 5. UPDATE PROFILE / USER METADATA (auth/v1/user)
    if (action === 'update_profile') {
      const { name, phone, address, city, state, pincode, password } = req.body || {};
      const authHeader = req.headers.authorization;
      const userToken = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : null;

      const updateBody = {
        data: {
          full_name: name,
          phone: phone,
          address: address,
          city: city,
          state: state,
          pincode: pincode
        }
      };

      if (password) {
        updateBody.password = password;
      }

      // A write with no valid session must not report success — this endpoint also changes
      // the account password, and it previously returned 200 regardless of the outcome.
      if (!userToken || userToken === 'demo_token') {
        return res.status(401).json({ error: 'You must be signed in to update your profile.' });
      }

      try {
        const updateUrl = `${supabaseUrl}/auth/v1/user`;
        const upRes = await httpsRequest(updateUrl, 'PUT', {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${userToken}`
        }, updateBody);

        if (upRes.statusCode === 401 || upRes.statusCode === 403) {
          return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
        }
        if (upRes.statusCode < 200 || upRes.statusCode >= 300) {
          const detail = (upRes.body && (upRes.body.msg || upRes.body.error_description || upRes.body.message)) || `Supabase responded with ${upRes.statusCode}`;
          return res.status(400).json({ error: detail });
        }
      } catch (err) {
        console.error("Supabase profile update error:", err.message);
        return res.status(503).json({ error: 'Profile service is unreachable. Please try again shortly.' });
      }

      return res.status(200).json({
        success: true,
        message: "Customer profile updated successfully ✓",
        user: {
          name: name || "Customer",
          phone: phone || "",
          address: address || "",
          city: city || "",
          state: state || "",
          pincode: pincode || ""
        }
      });
    }

    // 6. VERIFY SESSION / GET CURRENT USER (auth/v1/user)
    if (action === 'verify_session') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No active session token provided' });
      }

      const token = authHeader.split(' ')[1];
      try {
        const userUrl = `${supabaseUrl}/auth/v1/user`;
        const uRes = await httpsRequest(userUrl, 'GET', {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`
        });

        if (uRes.statusCode === 200 && uRes.body && uRes.body.id) {
          const u = uRes.body;
          return res.status(200).json({
            valid: true,
            user: {
              id: u.id,
              name: (u.user_metadata && u.user_metadata.full_name) || u.email.split('@')[0],
              email: u.email,
              phone: (u.user_metadata && u.user_metadata.phone) || "",
              address: (u.user_metadata && u.user_metadata.address) || "",
              city: (u.user_metadata && u.user_metadata.city) || "",
              state: (u.user_metadata && u.user_metadata.state) || "",
              pincode: (u.user_metadata && u.user_metadata.pincode) || ""
            }
          });
        }
      } catch(e) {}

      return res.status(401).json({ valid: false, error: 'Session expired or invalid' });
    }

    return res.status(400).json({ error: "Invalid auth action" });

  } catch (err) {
    console.error("Supabase Auth API Error:", err.message);
    return res.status(500).json({ error: "Authentication failed", details: err.message });
  }
};
