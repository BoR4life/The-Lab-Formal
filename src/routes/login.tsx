import { createFileRoute } from "@tanstack/react-router";
import { LabAccount } from "@/components/lab-account";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <>
      <SiteHeader />
      <main className="wrap narrow">
        <LabAccount />
      </main>
    </>
  );
}
