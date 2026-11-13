import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const a = JSON.parse(readFileSync("/tmp/iso/accounts.json","utf8"));
const SR=process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(process.env.SUPABASE_URL, SR, { global:{fetch:(i,init={})=>{const h=new Headers(init.headers); if(h.get("Authorization")===`Bearer ${SR}`)h.delete("Authorization"); h.set("apikey",SR); return fetch(i,{...init,headers:h});}}, auth:{persistSession:false}});
const users = process.argv[2]==="users";
for (const n of ["a","b"]) {
  for (const t of ["brew_recipes","brew_ingredients","brew_settings","brew_drafts","brew_account_state"]) { const r = await admin.from(t).delete().eq("owner_id", a[n].id); if (r.error) console.log(t, r.error.message); }
  if (users) { const r = await admin.auth.admin.deleteUser(a[n].id); console.log("deleted user", n, r.error?.message ?? "ok"); }
}
console.log("cleaned");
