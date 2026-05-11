import { Link } from "@tanstack/react-router";
import { Linkedin, Twitter, Mail, Youtube } from "lucide-react";
import logo from "@/assets/logo.png";
import { LegalDisclaimerLink } from "./LegalDisclaimer";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <img src={logo} alt="Hudson Crest Capital" className="h-14 w-auto" />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              AI driven institutional trading across global markets. Disciplined execution.
              Engineered intelligence.
            </p>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Company
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/about" className="hover:text-foreground">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/approach" className="hover:text-foreground">
                  Our Approach
                </Link>
              </li>
              <li>
                <Link to="/careers" className="hover:text-foreground">
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Platform
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/strategies" className="hover:text-foreground">
                  Strategies
                </Link>
              </li>
              <li>
                <Link to="/technology" className="hover:text-foreground">
                  Technology
                </Link>
              </li>
              <li>
                <Link to="/global-desks" className="hover:text-foreground">
                  Global Desks
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Investors
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/performance" className="hover:text-foreground">
                  Performance
                </Link>
              </li>
              <li>
                <Link to="/insights" className="hover:text-foreground">
                  Insights
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-foreground">
                  Contact Us
                </Link>
              </li>
              <li>
                <a href="mailto:investors@hudsoncrest.example" className="hover:text-foreground">
                  Investor Relations
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div>
            © {new Date().getFullYear()} Hudson Crest Capital. All rights reserved. · Regulated
            where applicable. SEC Registered Investment Adviser.
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link to="/disclosures" className="hover:text-foreground">
              Disclosures
            </Link>
            <LegalDisclaimerLink className="hover:text-foreground" label="Disclaimer" />
            <div className="flex items-center gap-3 pl-2">
              <a
                href="https://www.linkedin.com/company/hudson-crest-capital"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="hover:text-foreground"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com/hudsoncrestcap"
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter / X"
                className="hover:text-foreground"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="https://www.youtube.com/@hudsoncrestcapital"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="hover:text-foreground"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a
                href="mailto:investors@hudsoncrest.example"
                aria-label="Email investor relations"
                className="hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
