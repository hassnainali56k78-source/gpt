addEventListener("fetch", e => e.respondWith(handle(e.request)));

async function handle(req) {
  const u = new URL(req.url);
  const name = u.searchParams.get("username");
  if (!name) return j({ error: "missing_username", use: "/info?username=<name>" }, 400);

  try {
    const r = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${name}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "x-ig-app-id": "936619743392459",
        "Accept": "application/json",
        "Referer": `https://www.instagram.com/${name}/`
      }
    });

    if (r.status === 404) return j({ error: "not_found" }, 404);
    if (!r.ok) return j({ error: "http_error", code: r.status }, 400);

    const d = await r.json(), udata = d?.data?.user;
    if (!udata) return j({ raw: d });

    const m = udata.edge_owner_to_timeline_media?.edges || [];
    const recent = m.slice(0, 8).map(x => {
      const n = x.node || x;
      return {
        id: n.id,
        code: n.shortcode,
        img: n.display_url,
        cap: n.edge_media_to_caption?.edges?.[0]?.node?.text || null
      };
    });

    return j({
      id: udata.id,
      username: udata.username,
      name: udata.full_name,
      bio: udata.biography,
      verified: udata.is_verified,
      private: udata.is_private,
      pic: udata.profile_pic_url_hd || udata.profile_pic_url,
      followers: udata.edge_followed_by?.count || 0,
      following: udata.edge_follow?.count || 0,
      posts: udata.edge_owner_to_timeline_media?.count || 0,
      recent
    });
  } catch (e) {
    return j({ error: "failed", msg: e.message }, 500);
  }
}

function j(o, s = 200) {
  return new Response(JSON.stringify(o, null, 2), {
    status: s,
    headers: { "Content-Type": "application/json" }
  });
}