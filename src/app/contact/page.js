import { getSite } from "@/lib/data";
import CopyLinkButton from "@/components/CopyLinkButton";
import RevealOnScroll from "@/components/RevealOnScroll";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Contact — Alex Stefan",
  description: "Get in touch with Alex Stefan — open to new roles and freelance projects.",
};

// Info only, by request — no message form.
export default async function ContactPage() {
  const site = await getSite();
  const { contact } = site;

  return (
    <div className="page active">
      <div className="top-accent-bar"></div>
      <div className="contact-solo">
        <div className="contact-solo-inner">
          <div className="section-label reveal">Get In Touch</div>
          <h1 className="reveal delay-1">Let&apos;s<br />Talk.</h1>

          <div className="contact-item reveal delay-2">
            <div className="contact-icon-wrap" aria-hidden="true">✉️</div>
            <div>
              <div className="c-label">Email</div>
              <div className="c-val"><a href={`mailto:${contact.email}`}>{contact.email}</a></div>
            </div>
            <CopyLinkButton value={contact.email} label="Copy email address" />
          </div>

          <div className="contact-item reveal delay-3">
            <div className="contact-icon-wrap" aria-hidden="true">🔗</div>
            <div>
              <div className="c-label">Behance</div>
              <div className="c-val">
                <a href={contact.behance} target="_blank" rel="noopener noreferrer">
                  {contact.behance.replace("https://www.", "")}
                </a>
              </div>
            </div>
            <CopyLinkButton value={contact.behance} label="Copy Behance link" />
          </div>

          <div className="contact-item" style={{ border: "none" }}>
            <div className="contact-icon-wrap" aria-hidden="true">📍</div>
            <div>
              <div className="c-label">Location</div>
              <div className="c-val">{contact.location}</div>
            </div>
          </div>
        </div>
      </div>
      <RevealOnScroll />
    </div>
  );
}
