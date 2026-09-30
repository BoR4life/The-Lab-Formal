import { createFileRoute } from "@tanstack/react-router";
import { LabAccount } from "@/components/lab-account";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <>
      <header className="top">
        <div className="top-inner">
          <p className="brand">
            <span className="product">
              The Lab<span className="stop">.</span>
            </span>
            <span className="track">Twelve Leads</span>
          </p>
        </div>
      </header>
      <main className="wrap">
        <div className="landing-head">
          <p className="eyebrow">Twelve Leads</p>
          <h1>
            The Lab<span className="stop">.</span> Your call.
          </h1>
        </div>
        <div className="entry">
          <figure className="plate heart">
            <img src="/still-heart-hero.jpg" alt="An anatomical heart." />
          </figure>
          <LabAccount />
        </div>
      </main>
    </>
  );
}
