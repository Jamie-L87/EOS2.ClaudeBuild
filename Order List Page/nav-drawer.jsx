/* Shared navigation drawer — slides in from the left when Menu is clicked.
   Used by both Import.html and Order List Page.html.

   Usage:
     const [navOpen, setNavOpen] = useState(false);
     <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} current="import" />
*/

/* global React, IconClose, IconChevronRight, IconUpload */

(function () {
  const { useEffect } = React;

  const NAV_ITEMS = [
    {
      id: "import",
      label: "Import",
      sub: "Upload files or paste codes",
      href: "Import.html",
      icon: IconUpload,
    },
    {
      id: "orders",
      label: "Orders",
      sub: "Active, completed and archived",
      href: "Order List Page.html",
      // Inline-render a simple list-of-rows icon
      icon: (p) => (
        <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="1.5" />
          <path d="M3 10h18M8 5v14" />
        </svg>
      ),
    },
  ];

  function NavDrawer({ open, onClose, current }) {
    useEffect(() => {
      if (!open) return;
      const onKey = (e) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
      };
    }, [open, onClose]);

    return (
      <>
        {/* Backdrop */}
        <div
          onClick={onClose}
          aria-hidden={!open}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(9,9,9,0.32)",
            opacity: open ? 1 : 0,
            pointerEvents: open ? "auto" : "none",
            transition: "opacity .2s ease",
            zIndex: 90,
          }}
        />

        {/* Drawer panel */}
        <aside
          role="dialog"
          aria-label="Navigation"
          aria-modal="true"
          style={{
            position: "fixed", top: 0, left: 0, bottom: 0,
            width: 360, maxWidth: "85vw",
            background: "#fff",
            borderRight: "2px solid var(--ink)",
            transform: open ? "translateX(0)" : "translateX(-100%)",
            transition: "transform .25s cubic-bezier(.4,0,.2,1)",
            zIndex: 91,
            display: "flex", flexDirection: "column",
            boxShadow: open ? "var(--shadow-pop)" : "none",
          }}
        >
          {/* Drawer header */}
          <div style={{
            height: 92,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 24px",
            borderBottom: "1px solid var(--line)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontWeight: 700, letterSpacing: "0.05em",
                color: "var(--brand)", fontSize: 18,
              }}>EOS CLOUD</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="om-iconplus"
              style={{
                width: 44, height: 44, borderRadius: 22,
                border: "none", background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--ink)",
              }}
            >
              <IconClose size={20} stroke={1.8} />
            </button>
          </div>

          {/* Section label */}
          <div style={{
            padding: "20px 24px 8px",
            fontWeight: 700, letterSpacing: "0.06em",
            fontSize: 11, textTransform: "uppercase",
            color: "var(--ink-3)",
          }}>
            Navigate
          </div>

          {/* Nav items */}
          <nav style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV_ITEMS.map((item) => {
              const Ic = item.icon;
              const active = current === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className="om-nav-item"
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px",
                    borderRadius: "var(--radius)",
                    border: active ? "2px solid var(--brand)" : "2px solid transparent",
                    background: active ? "var(--brand-soft)" : "transparent",
                    textDecoration: "none",
                    color: active ? "var(--brand)" : "var(--ink)",
                    transition: "background .15s ease, color .15s ease, border-color .15s ease",
                  }}
                >
                  <span style={{
                    width: 40, height: 40, borderRadius: "var(--radius)",
                    background: active ? "var(--brand)" : "var(--line)",
                    color: active ? "#fff" : "var(--ink)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    transition: "background .15s ease, color .15s ease",
                  }}>
                    <Ic size={18} stroke={1.7} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700, letterSpacing: "0.010em", fontSize: 16, lineHeight: 1.2 }}>
                      {item.label}
                    </span>
                    <span style={{ display: "block", fontWeight: 500, letterSpacing: "0.010em", fontSize: 13, lineHeight: 1.3, color: active ? "var(--brand)" : "var(--ink-2)", marginTop: 2 }}>
                      {item.sub}
                    </span>
                  </span>
                  <IconChevronRight size={16} stroke={2} />
                </a>
              );
            })}
          </nav>

          {/* Spacer + drawer footer */}
          <div style={{ flex: 1 }} />
          <div style={{
            padding: "20px 24px",
            borderTop: "1px solid var(--line)",
            fontSize: 12, fontWeight: 500, letterSpacing: "0.010em",
            color: "var(--ink-2)",
          }}>
            EOS Cloud · Tsunami Axis Ltd
          </div>
        </aside>

        <style>{`
          .om-nav-item:hover { background: var(--bg-soft) !important; }
          .om-nav-item[data-active="true"]:hover { background: var(--brand-soft) !important; }
        `}</style>
      </>
    );
  }

  window.NavDrawer = NavDrawer;
})();
