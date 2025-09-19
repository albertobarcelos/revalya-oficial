import { Layout } from "@/components/layout/Layout";
import { InviteList } from "@/components/invites/InviteList";

export default function Invites() {
  return (
    <Layout>
      <div className="container py-6">
        <InviteList />
      </div>
    </Layout>
  );
}
