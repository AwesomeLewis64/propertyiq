import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Brand from "./Brand";
import {
  LEGAL_UPDATED,
  legalDocuments,
  legalIds,
  legalIdFromHash,
  type LegalId,
} from "./legalContent";

function LegalFooter({ current }: { current: LegalId | null }) {
  return (
    <footer className="iq-legal-footer">
      <div className="iq-legal-footer-inner">
        <p className="iq-legal-copyright">
          © 2026 PropertyIQ. All rights reserved.
        </p>
        <p className="iq-legal-summary">
          PropertyIQ provides software-assisted real estate analysis for
          informational and educational purposes only. Results are estimates,
          not professional appraisals, investment advice, or guarantees of
          financial performance.
        </p>
        <nav aria-label="Legal and contact">
          {legalIds.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={current === id ? "page" : undefined}
            >
              {legalDocuments[id].label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

function LegalPage({ id, onBack }: { id: LegalId; onBack: () => void }) {
  const doc = legalDocuments[id];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [id]);
  return (
    <div className="iq-legal-page">
      <a
        className="skip-link"
        href="#legal-document"
        onClick={(event) => {
          event.preventDefault();
          heading.current?.focus();
        }}
      >
        Skip to legal document
      </a>
      <header className="topbar">
        <button
          className="brand"
          onClick={onBack}
          aria-label="Return to PropertyIQ"
        >
          <Brand />
        </button>
        <button className="button small" onClick={onBack}>
          <ArrowLeft size={16} /> Back to PropertyIQ
        </button>
      </header>
      <main className="iq-legal-main" id="legal-document">
        <div className="iq-legal-intro">
          <span className="iq-eyebrow">PROPERTYIQ · LEGAL & TRANSPARENCY</span>
          <h1 ref={heading} tabIndex={-1}>
            {doc.title}
          </h1>
          <p className="iq-legal-date">
            Last updated: <time dateTime="2026-10-08">{LEGAL_UPDATED}</time>
          </p>
          <nav className="iq-legal-tabs" aria-label="Legal documents">
            {legalIds.map((item) => (
              <a
                key={item}
                href={`#${item}`}
                aria-current={id === item ? "page" : undefined}
              >
                {legalDocuments[item].label}
              </a>
            ))}
          </nav>
        </div>
        {id === "contact" && (
          <p className="contact-link">
            <a href="mailto:abc@gmail.com">Email abc@gmail.com</a>
          </p>
        )}
        <div className="iq-legal-layout">
          <aside className="iq-legal-contents" aria-label="On this page">
            <span className="iq-eyebrow">ON THIS PAGE</span>
            {doc.sections.map((section, i) => (
              <button
                key={section.title}
                onClick={() => {
                  const target = document.getElementById(`legal-section-${i}`);
                  target?.scrollIntoView({ block: "start" });
                  target?.focus({ preventScroll: true });
                }}
              >
                {section.title}
              </button>
            ))}
            <p>
              <ShieldCheck size={17} /> Current version: browser-local analysis.
            </p>
          </aside>
          <article className="iq-legal-document" aria-label={doc.label}>
            {doc.introduction.map((text) => (
              <p key={text}>{text}</p>
            ))}
            {doc.sections.map((section, i) => (
              <section
                key={section.title}
                aria-labelledby={`legal-section-${i}`}
              >
                <h2 id={`legal-section-${i}`} tabIndex={-1}>
                  {section.title}
                </h2>
                {section.paragraphs.map((text) => (
                  <p key={text}>{text}</p>
                ))}
                {section.bullets && (
                  <ul>
                    {section.bullets.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                )}
                {section.after?.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </section>
            ))}
            <div className="iq-legal-return">
              <button className="button" onClick={onBack}>
                <ArrowLeft size={16} /> Return to your work
              </button>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}

export default function LegalShell({ children }: { children: ReactNode }) {
  const [legal, setLegal] = useState(() =>
    legalIdFromHash(window.location.hash),
  );
  const returnHash = useRef(legal ? "" : window.location.hash);
  const previousHash = useRef(window.location.hash);
  const returnScroll = useRef(0);
  const returnFocus = useRef<HTMLElement | null>(null);
  const returnTitle = useRef(document.title);
  const wasLegal = useRef(false);
  useEffect(() => {
    const onHashChange = () => {
      const next = legalIdFromHash(window.location.hash);
      const previous = legalIdFromHash(previousHash.current);
      if (next && !previous) {
        returnHash.current = previousHash.current;
        returnScroll.current = window.scrollY;
        returnFocus.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        returnTitle.current = document.title;
      }
      previousHash.current = window.location.hash;
      setLegal(next);
    };
    window.addEventListener("hashchange", onHashChange);
    // Workspace navigation uses replaceState rather than hashchange. Capture its
    // current hash before a legal anchor changes it, including modified clicks.
    const captureLink = (event: MouseEvent) => {
      const target =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        target &&
        legalIdFromHash(target.hash) &&
        !legalIdFromHash(window.location.hash)
      ) {
        previousHash.current = window.location.hash;
      }
    };
    document.addEventListener("click", captureLink, true);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", captureLink, true);
    };
  }, []);
  useEffect(() => {
    if (legal) {
      wasLegal.current = true;
      document.title = `${legalDocuments[legal].label} | PropertyIQ`;
      window.scrollTo(0, 0);
    } else if (wasLegal.current) {
      wasLegal.current = false;
      document.title = returnTitle.current;
      window.scrollTo(0, returnScroll.current);
      returnFocus.current?.focus({ preventScroll: true });
    }
  }, [legal]);
  return (
    <>
      {/* Keep mounted: legal navigation must not discard in-progress analysis. */}
      <div
        className={legal ? "iq-workspace-held" : undefined}
        aria-hidden={legal ? true : undefined}
        inert={legal !== null}
      >
        {children}
      </div>
      {legal && (
        <LegalPage
          id={legal}
          onBack={() => {
            window.location.hash = returnHash.current;
          }}
        />
      )}
      <LegalFooter current={legal} />
    </>
  );
}
