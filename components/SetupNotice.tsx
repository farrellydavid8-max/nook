// Shown when the Supabase environment variables haven't been added yet.
export default function SetupNotice() {
  return (
    <div className="empty" style={{ paddingInline: 24 }}>
      <strong style={{ color: "var(--fg)" }}>Nook isn&apos;t connected to its database yet.</strong>
      <br />
      Add NEXT_PUBLIC_SUPABASE_URL and the Supabase key in Vercel → Settings → Environment Variables, then redeploy.
    </div>
  );
}
