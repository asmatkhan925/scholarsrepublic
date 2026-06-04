const BACKEND_BASE_URL = "https://scholarsrepublic.org";
const DUE_POSTS_PATH = "/api/admin/agent/social/facebook/due-posts/";
const POST_RESULT_PATH = "/api/admin/agent/social/facebook/post-result/";
const DUE_REELS_PATH = "/api/admin/agent/social/facebook/due-reels/";
const GRAPH_VERSION = "v25.0";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function getHeader(request, name) {
  return request.headers.get(name) || "";
}

function hasManualAccess(request, env) {
  const expected = env.GPT_FACEBOOK_POST_TOKEN || "";
  const provided = getHeader(request, "X-GPT-Facebook-Token");

  return Boolean(expected && provided && expected === provided);
}

function hasSocialWorkerAccess(request, env) {
  const expected = env.SCHOLARS_SOCIAL_WORKER_TOKEN || "";
  const provided = getHeader(request, "X-Social-Worker-Token");

  return Boolean(expected && provided && expected === provided);
}

function requireEnv(env, names) {
  const missing = names.filter((name) => !env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required Worker secrets: ${missing.join(", ")}`);
  }
}

async function readJson(request) {
  if (!request.body) {
    return {};
  }

  try {
    return await request.json();
  } catch {
    return null;
  }
}

function graphPostUrl(env, edge) {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${env.FACEBOOK_PAGE_ID}/${edge}`;
}

function facebookPostUrl(pageId, postId) {
  if (!postId) {
    return "";
  }

  const id = String(postId);
  const parts = id.split("_");

  if (parts.length >= 2 && parts[1]) {
    return `https://www.facebook.com/${pageId}/posts/${parts[1]}`;
  }

  return "";
}

async function postToFacebook(env, duePost) {
  requireEnv(env, ["FACEBOOK_PAGE_ID", "FACEBOOK_PAGE_ACCESS_TOKEN"]);

  const message = String(duePost.message || "").trim();
  const imageUrl = String(duePost.image_url || "").trim();
  const linkUrl = String(duePost.link_url || "").trim();
  const body = new URLSearchParams();

  body.set("access_token", env.FACEBOOK_PAGE_ACCESS_TOKEN);

  let endpoint = "";

  if (imageUrl) {
    endpoint = graphPostUrl(env, "photos");
    body.set("url", imageUrl);
    body.set("caption", message);
  } else {
    endpoint = graphPostUrl(env, "feed");
    body.set("message", message);

    if (linkUrl) {
      body.set("link", linkUrl);
    }
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage =
      data?.error?.message || `Facebook Graph API returned HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  const facebookPostId = data.post_id || data.id || "";

  return {
    facebook_post_id: facebookPostId,
    facebook_post_url: facebookPostUrl(env.FACEBOOK_PAGE_ID, facebookPostId),
  };
}

async function postReelToFacebook(env, dueReel) {
  requireEnv(env, ["FACEBOOK_PAGE_ID", "FACEBOOK_PAGE_ACCESS_TOKEN"]);

  const videoUrl = String(dueReel.video_url || "").trim();
  const caption = String(dueReel.caption || dueReel.message || "").trim();

  if (!videoUrl) {
    throw new Error("Missing reel video URL.");
  }

  const body = new URLSearchParams();
  body.set("access_token", env.FACEBOOK_PAGE_ACCESS_TOKEN);
  body.set("file_url", videoUrl);
  body.set("description", caption);

  const response = await fetch(graphPostUrl(env, "videos"), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage =
      data?.error?.message || `Facebook Graph API returned HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  return {
    facebook_video_id: data.id || "",
    facebook_post_id: data.post_id || "",
    raw_response: data,
  };
}

async function notifyPostResult(env, payload) {
  requireEnv(env, ["SCHOLARS_SOCIAL_WORKER_TOKEN"]);

  const response = await fetch(`${BACKEND_BASE_URL}${POST_RESULT_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Social-Worker-Token": env.SCHOLARS_SOCIAL_WORKER_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Backend post-result returned HTTP ${response.status}`);
  }

  return response.json().catch(() => ({}));
}

async function notifyReelResult(env, planId, status, payload) {
  requireEnv(env, ["SCHOLARS_AGENT_TOKEN"]);

  const endpoint = status === "posted" ? "posted" : "failed";
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/admin/agent/social/facebook/reels/${planId}/${endpoint}/`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Agent-Token": env.SCHOLARS_AGENT_TOKEN,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Backend reel ${endpoint} callback returned HTTP ${response.status}`);
  }

  return response.json().catch(() => ({}));
}

async function fetchDuePosts(env, limit) {
  requireEnv(env, ["SCHOLARS_SOCIAL_WORKER_TOKEN"]);

  const response = await fetch(`${BACKEND_BASE_URL}${DUE_POSTS_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Social-Worker-Token": env.SCHOLARS_SOCIAL_WORKER_TOKEN,
    },
    body: JSON.stringify({ limit }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Backend due-posts returned HTTP ${response.status}`);
  }

  if (Array.isArray(data)) {
    return {
      ok: true,
      due_count: data.length,
      returned_count: data.length,
      reason: data.length ? "" : "no_due_posts",
      items: data,
    };
  }

  return {
    ...data,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

async function fetchDueReels(env, limit) {
  requireEnv(env, ["SCHOLARS_AGENT_TOKEN"]);

  const response = await fetch(`${BACKEND_BASE_URL}${DUE_REELS_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Agent-Token": env.SCHOLARS_AGENT_TOKEN,
    },
    body: JSON.stringify({ limit }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Backend due-reels returned HTTP ${response.status}`);
  }

  return {
    ...data,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

function resultPayloadForPost(duePost, status, facebookResult = {}, errorMessage = "") {
  const itemType = String(duePost.type || "opportunity").trim() || "opportunity";

  return {
    type: itemType,
    plan_id: duePost.plan_id,
    opportunity_id: duePost.opportunity_id,
    collection_id: duePost.collection_id,
    status,
    facebook_post_id: facebookResult.facebook_post_id || "",
    facebook_post_url: facebookResult.facebook_post_url || "",
    message: duePost.message || "",
    image_url: duePost.image_url || "",
    image_source: duePost.image_source || "",
    link_url: duePost.link_url || "",
    error_message: errorMessage,
  };
}

async function runDuePosts(env, limit = 10) {
  requireEnv(env, [
    "FACEBOOK_PAGE_ID",
    "FACEBOOK_PAGE_ACCESS_TOKEN",
    "SCHOLARS_SOCIAL_WORKER_TOKEN",
  ]);

  const duePostResponse = await fetchDuePosts(env, limit);
  const duePosts = duePostResponse.items;
  const results = [];

  if (duePosts.length === 0) {
    return {
      requested_limit: limit,
      due_count: Number(duePostResponse.due_count || 0),
      returned_count: 0,
      posted_today: Number(duePostResponse.posted_today || 0),
      daily_cap: Number(duePostResponse.daily_cap || 0),
      daily_remaining: Number(duePostResponse.daily_remaining || 0),
      per_run_cap: Number(duePostResponse.per_run_cap || 0),
      min_spacing_minutes: Number(duePostResponse.min_spacing_minutes || 0),
      latest_posted_at: duePostResponse.latest_posted_at || null,
      next_allowed_post_at: duePostResponse.next_allowed_post_at || null,
      reason: duePostResponse.reason || "no_due_posts",
      posted_count: 0,
      failed_count: 0,
      results,
    };
  }

  for (const duePost of duePosts) {
    const itemType = String(duePost.type || "opportunity").trim() || "opportunity";

    try {
      const facebookResult = await postToFacebook(env, duePost);

      await notifyPostResult(
        env,
        resultPayloadForPost(duePost, "posted", facebookResult),
      );

      results.push({
        type: itemType,
        plan_id: duePost.plan_id,
        opportunity_id: duePost.opportunity_id,
        collection_id: duePost.collection_id,
        status: "posted",
        facebook_post_id: facebookResult.facebook_post_id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Posting failed.";

      try {
        await notifyPostResult(
          env,
          resultPayloadForPost(duePost, "failed", {}, errorMessage),
        );
      } catch {
        console.error("Failed to notify backend about Facebook posting failure.");
      }

      console.error("Facebook scheduled post failed.");
      results.push({
        type: itemType,
        plan_id: duePost.plan_id,
        opportunity_id: duePost.opportunity_id,
        collection_id: duePost.collection_id,
        status: "failed",
      });
    }
  }

  return {
    requested_limit: limit,
    due_count: Number(duePostResponse.due_count || duePosts.length),
    returned_count: Number(duePostResponse.returned_count || duePosts.length),
    posted_today: Number(duePostResponse.posted_today || 0),
    daily_cap: Number(duePostResponse.daily_cap || 0),
    daily_remaining: Number(duePostResponse.daily_remaining || 0),
    per_run_cap: Number(duePostResponse.per_run_cap || 0),
    min_spacing_minutes: Number(duePostResponse.min_spacing_minutes || 0),
    latest_posted_at: duePostResponse.latest_posted_at || null,
    next_allowed_post_at: duePostResponse.next_allowed_post_at || null,
    reason: duePostResponse.reason || "",
    posted_count: results.filter((item) => item.status === "posted").length,
    failed_count: results.filter((item) => item.status === "failed").length,
    results,
  };
}

async function runDueReels(env, limit = 1) {
  requireEnv(env, [
    "FACEBOOK_PAGE_ID",
    "FACEBOOK_PAGE_ACCESS_TOKEN",
    "SCHOLARS_AGENT_TOKEN",
  ]);

  const dueReelResponse = await fetchDueReels(env, limit);
  const dueReels = dueReelResponse.items;
  const results = [];

  if (dueReels.length === 0) {
    return {
      requested_limit: limit,
      due_count: Number(dueReelResponse.due_count || 0),
      returned_count: 0,
      posted_today: Number(dueReelResponse.posted_today || 0),
      daily_cap: Number(dueReelResponse.daily_cap || 0),
      daily_remaining: Number(dueReelResponse.daily_remaining || 0),
      reason: dueReelResponse.reason || "no_due_reels",
      posted_count: 0,
      failed_count: 0,
      results,
    };
  }

  for (const dueReel of dueReels) {
    const planId = dueReel.plan_id;

    try {
      const facebookResult = await postReelToFacebook(env, dueReel);

      await notifyReelResult(env, planId, "posted", {
        ...facebookResult,
        caption: dueReel.caption || "",
        video_url: dueReel.video_url || "",
        upload_surface: "page_videos",
      });

      results.push({
        type: "reel",
        plan_id: planId,
        status: "posted",
        facebook_post_id: facebookResult.facebook_post_id,
        facebook_video_id: facebookResult.facebook_video_id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Reel posting failed.";

      try {
        await notifyReelResult(env, planId, "failed", {
          error_message: errorMessage,
          caption: dueReel.caption || "",
          video_url: dueReel.video_url || "",
          upload_surface: "page_videos",
        });
      } catch {
        console.error("Failed to notify backend about Facebook reel posting failure.");
      }

      console.error("Facebook scheduled reel failed.");
      results.push({
        type: "reel",
        plan_id: planId,
        status: "failed",
        error: errorMessage,
      });
    }
  }

  return {
    requested_limit: limit,
    due_count: Number(dueReelResponse.due_count || dueReels.length),
    returned_count: Number(dueReelResponse.returned_count || dueReels.length),
    posted_today: Number(dueReelResponse.posted_today || 0),
    daily_cap: Number(dueReelResponse.daily_cap || 0),
    daily_remaining: Number(dueReelResponse.daily_remaining || 0),
    reason: dueReelResponse.reason || "",
    posted_count: results.filter((item) => item.status === "posted").length,
    failed_count: results.filter((item) => item.status === "failed").length,
    results,
  };
}

function scheduledHourUTC(controller) {
  if (controller?.scheduledTime) {
    return new Date(controller.scheduledTime).getUTCHours();
  }

  const cron = String(controller?.cron || "").trim();
  const hourField = cron.split(/\s+/)[1] || "";
  const firstHour = hourField.split(",")[0] || "";
  const hour = Number(firstHour);

  return Number.isInteger(hour) ? hour : null;
}

function shouldRunScheduledReels(controller) {
  return scheduledHourUTC(controller) === 15;
}

async function runScheduledAutomation(controller, env) {
  const hour = scheduledHourUTC(controller);
  const cron = String(controller?.cron || "");
  const errors = [];

  console.log(
    `Scheduled Facebook automation started: cron=${cron || "-"} utc_hour=${hour ?? "-"}`,
  );

  try {
    const postResult = await runDuePosts(env, 10);
    console.log(
      `Scheduled normal posts completed: posted_count=${postResult.posted_count} failed_count=${postResult.failed_count} reason=${postResult.reason || "-"}`,
    );
  } catch (error) {
    errors.push(error);
    console.error(
      `Scheduled normal posts failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  if (!shouldRunScheduledReels(controller)) {
    console.log(`Scheduled reel posting skipped: utc_hour=${hour ?? "-"} is not 15`);
  } else {
    console.log("Scheduled reel posting attempted: utc_hour=15 limit=1");
    try {
      const reelResult = await runDueReels(env, 1);
      console.log(
        `Scheduled reel posting completed: posted_count=${reelResult.posted_count} failed_count=${reelResult.failed_count} reason=${reelResult.reason || "-"}`,
      );
    } catch (error) {
      errors.push(error);
      console.error(
        `Scheduled reel posting failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  if (errors.length > 0) {
    throw errors[0];
  }
}

async function handleManualPost(request, env) {
  if (!hasManualAccess(request, env)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const payload = await readJson(request);

  if (payload === null) {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const message = String(payload.message || payload.text || "").trim();
  const linkUrl = String(payload.link_url || payload.link || "").trim();

  if (!message) {
    return jsonResponse({ error: "Missing message." }, 400);
  }

  try {
    const facebookResult = await postToFacebook(env, {
      message,
      link_url: linkUrl,
      image_url: "",
    });

    return jsonResponse({
      ok: true,
      facebook_post_id: facebookResult.facebook_post_id,
      facebook_post_url: facebookResult.facebook_post_url,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Facebook post failed.",
      },
      502,
    );
  }
}

async function handleRunDuePosts(request, env) {
  if (!hasManualAccess(request, env)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const payload = await readJson(request);

  if (payload === null) {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const limit = Math.max(1, Math.min(Number(payload.limit || 10), 30));

  try {
    return jsonResponse({
      ok: true,
      ...(await runDuePosts(env, limit)),
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Scheduled posting failed.",
      },
      502,
    );
  }
}

async function handleRunDueReels(request, env) {
  if (!hasManualAccess(request, env)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const payload = await readJson(request);

  if (payload === null) {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const limit = Math.max(1, Math.min(Number(payload.limit || 1), 1));

  try {
    return jsonResponse({
      ok: true,
      ...(await runDueReels(env, limit)),
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Scheduled reel posting failed.",
      },
      502,
    );
  }
}

async function handlePostOne(request, env) {
  if (!hasSocialWorkerAccess(request, env)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const payload = await readJson(request);

  if (payload === null) {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  try {
    const facebookResult = await postToFacebook(env, payload);
    return jsonResponse({
      ok: true,
      status: "posted",
      facebook_post_id: facebookResult.facebook_post_id,
      facebook_post_url: facebookResult.facebook_post_url,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Facebook post failed.",
      },
      502,
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/") {
      return handleManualPost(request, env);
    }

    if (request.method === "POST" && url.pathname === "/run-due-posts") {
      return handleRunDuePosts(request, env);
    }

    if (request.method === "POST" && url.pathname === "/run-due-reels") {
      return handleRunDueReels(request, env);
    }

    if (request.method === "POST" && url.pathname === "/post-one") {
      return handlePostOne(request, env);
    }

    return jsonResponse({ error: "Not found." }, 404);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduledAutomation(controller, env));
  },
};

export { scheduledHourUTC, shouldRunScheduledReels };
