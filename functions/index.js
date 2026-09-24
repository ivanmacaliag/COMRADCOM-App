const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// ─── YOUR CONFIG ─────────────────────────────────────────────────────────────
// This is a secret password you make up. You will type this exact string
// in the Meta Developer Portal when you register the webhook.
const VERIFY_TOKEN = "comradcom_fb_webhook_secret_2024";

// You will paste your Facebook Page Access Token here later (Step 2 of the browser steps).
// Leave it as-is for now — we will update it after you get the token.
const PAGE_ACCESS_TOKEN = "PASTE_YOUR_PAGE_ACCESS_TOKEN_HERE";

// Your Facebook Page ID — you will fill this in during setup.
const PAGE_ID = "PASTE_YOUR_PAGE_ID_HERE";
// ─────────────────────────────────────────────────────────────────────────────

/**
 * fbWebhook — Main webhook endpoint for Facebook Page events.
 *
 * Facebook sends a GET request first to verify this URL is real.
 * Then it sends POST requests every time something happens on your Page.
 */
exports.fbWebhook = onRequest(async (req, res) => {

  // ── PART A: Verification Handshake (Facebook tests your URL) ──────────────
  if (req.method === "GET") {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified by Facebook.");
      return res.status(200).send(challenge);
    }
    console.error("❌ Webhook verification failed — token mismatch.");
    return res.status(403).send("Verification failed.");
  }

  // ── PART B: Receive new Facebook Page post events ─────────────────────────
  if (req.method === "POST") {
    const body = req.body;

    // Facebook wraps all page events under object: "page"
    if (body.object === "page") {
      for (const entry of (body.entry || [])) {
        for (const change of (entry.changes || [])) {

          const val = change.value || {};

          // We only care about NEW posts added to the page feed
          if (change.field === "feed" && val.item === "post" && val.verb === "add") {
            const postId = val.post_id;

            if (!postId) continue;

            // ── Deduplication: skip if already saved ──
            const existing = await db.collection("posts")
              .where("fbPostId", "==", postId)
              .limit(1)
              .get();

            if (!existing.empty) {
              console.log(`Skipping duplicate post: ${postId}`);
              continue;
            }

            // ── Fetch full post details from Facebook Graph API ──
            try {
              const url = `https://graph.facebook.com/v19.0/${postId}` +
                `?fields=message,full_picture,permalink_url,created_time` +
                `&access_token=${PAGE_ACCESS_TOKEN}`;

              const response = await fetch(url);
              const postData = await response.json();

              if (postData.error) {
                console.error("Graph API error:", JSON.stringify(postData.error));
                continue;
              }

              const message = postData.message || "(No text)";
              // First line of the post becomes the title
              const title = message.split("\n")[0].slice(0, 100) || "New Facebook Post";

              // ── Save to Firestore posts collection ──
              const docRef = await db.collection("posts").add({
                fbPostId:  postId,
                title:     title,
                content:   message,
                image:     postData.full_picture  || null,
                link:      postData.permalink_url || null,
                author:    "COMRADCOM Facebook Page",
                category:  "Social Media",
                source:    "facebook",
                tags:      ["Facebook", "Social Media"],
                timestamp: FieldValue.serverTimestamp(),
                comments:  [],
                location:  "Network Philippines",
              });

              console.log(`✅ New Facebook post saved! Doc ID: ${docRef.id} | Title: ${title}`);

            } catch (err) {
              console.error("❌ Error saving Facebook post:", err.message);
            }
          }
        }
      }
    }

    // Always respond 200 immediately so Facebook knows we received the event
    return res.status(200).send("EVENT_RECEIVED");
  }

  return res.status(405).send("Method Not Allowed");
});
