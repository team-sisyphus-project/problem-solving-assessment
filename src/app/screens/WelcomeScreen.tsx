/*
 * WelcomeScreen — welcome intro (`/invite/:token`, ahead of the 4-step flow)
 * ---------------------------------------------------------------------------
 * Spec: Welcome intro — impact 3D version (option A)
 *   components/button/base.md    (single CTA)
 *   foundations/i18n-strings.md  (screens.welcome namespace)
 *
 * A single welcome page the candidate arriving from the invite link sees
 * **before** facing the identity verification form. Its one and only purpose
 * is to change the first impression from "standardized test" to "a place you
 * were casually invited to", so the screen holds just one block of copy and
 * one CTA (no skip, no back — the spec's single-action assumption).
 *
 * It is not a flow step. It appears neither in FLOW_STEPS nor in the step
 * indicator, and renders as a full-screen hero outside the shell (AppShell).
 * The existing 4-step structure is untouched.
 *
 * The screen composition is the same **overlapping** structure as the
 * reference video — the 3D object floats over the sky-and-clouds backdrop,
 * with eyebrow → title → subcopy → CTA center-aligned in front of it. Because
 * the object is not placed beside or below the copy, even at the same size it
 * reads as a background objet rather than dominating the screen.
 *
 * In environments that cannot use motion/3D (prefers-reduced-motion, no WebGL
 * support, load failure), the object is replaced by a static SVG while the
 * same copy and layout are kept (spec flow 5).
 *
 * This screen always appears regardless of submission status. The brand mark
 * in the header is also the door that leads here, so being able to come back
 * to the first screen even after submitting keeps candidates from feeling
 * trapped. When someone who already submitted presses the CTA, the shell
 * shows the **previous submission notice** at the first flow step and asks
 * there whether to start over (it does not lock).
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { firstStepPath } from "../flow";
import { strings } from "../i18n";
import { BrandMark } from "../shell/BrandMark";
import { GlassAsterisk } from "./welcome/GlassAsterisk";
import { SkyBackdrop } from "./welcome/SkyBackdrop";
import { StaticAsterisk } from "./welcome/StaticAsterisk";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Subscribes to whether the current environment requests reduced motion (setting changes apply immediately) */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // In environments without matchMedia (jsdom, etc.), default to motion enabled.
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const s = strings.screens.welcome;

  const prefersReducedMotion = usePrefersReducedMotion();
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  // Fall back to the static object when reduced motion is requested or 3D cannot be shown.
  const useStaticObject = prefersReducedMotion || webglUnavailable;

  return (
    <div className="welcome">
      {/* Base sky — covered by the 3D canvas when it loads, but on the fallback path this painting remains */}
      <SkyBackdrop variant="hero" className="welcome__sky" />

      {useStaticObject ? (
        <div className="welcome__object" aria-hidden="true">
          <StaticAsterisk />
        </div>
      ) : (
        <GlassAsterisk onUnavailable={() => setWebglUnavailable(true)} />
      )}

      <header className="welcome__brand">
        <BrandMark tone="on-sky" />
      </header>

      <main className="welcome__content">
        {/* Copy layered over the object — the actual focus of this screen */}
        <p className="welcome__eyebrow">{s.eyebrow}</p>
        <h1 className="welcome__title">{s.title}</h1>
        <p className="welcome__description">{s.description}</p>

        <button
          type="button"
          className="btn btn--hero"
          onClick={() => navigate(firstStepPath(token))}
        >
          {s.primaryAction}
        </button>
      </main>

      {/* Accessible name for the decorative object — announces the visual element to screen readers in one line */}
      <span className="visually-hidden">{s.visualLabel}</span>
    </div>
  );
}
