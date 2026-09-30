import { createFileRoute } from "@tanstack/react-router";
import { LabAccount } from "@/components/lab-account";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <main className="wrap">
      <div className="landing-head">
        <p className="eyebrow">Twelve Leads</p>
        <h1>
          The Lab<span className="stop">.</span>
        </h1>
      </div>
      <LabAccount />
    </main>
  );
}
