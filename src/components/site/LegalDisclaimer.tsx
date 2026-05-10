import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export function LegalDisclaimerLink({
  className = "hover:text-foreground",
  label = "Important Disclaimer",
}: {
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={className}>
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Important Disclaimer</DialogTitle>
          <DialogDescription>
            Please read carefully before using this site or any information it contains.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Hudson Crest Capital is a registered investment adviser with the U.S. Securities and
              Exchange Commission (SEC). Registration does not imply any particular level of skill
              or training. Affiliates may be authorised by the UK Financial Conduct Authority (FCA)
              and the Monetary Authority of Singapore (MAS) where applicable.
            </p>
            <p>
              The information on this website is provided for general informational purposes only
              and does not constitute an offer to sell, or a solicitation of an offer to buy, any
              security, investment product, or advisory service in any jurisdiction where such an
              offer or solicitation would be unlawful. Nothing herein should be construed as
              investment, legal, accounting, or tax advice.
            </p>
            <p>
              <span className="font-semibold text-foreground">
                Past performance is not indicative of future results.
              </span>{" "}
              All investments involve risk, including the possible loss of principal. Alternative
              investment strategies may employ leverage, derivatives, and short selling, may be
              illiquid, and are suitable only for sophisticated investors who can bear such risks.
              Performance figures, where shown, are net of fees unless otherwise stated and may
              reflect hypothetical or back-tested results, which have inherent limitations.
            </p>
            <p>
              Forward-looking statements regarding markets, AI signals, or strategy positioning
              reflect current views and assumptions; actual outcomes may differ materially. Hudson
              Crest Capital makes no representation or warranty as to the accuracy or completeness
              of third-party data referenced on this site.
            </p>
            <p>
              This site is not directed at any person in any jurisdiction where its publication or
              availability is prohibited. By accessing this site, you agree to our{" "}
              <Link
                to="/terms"
                onClick={() => setOpen(false)}
                className="underline hover:text-foreground"
              >
                Terms of Use
              </Link>
              ,{" "}
              <Link
                to="/privacy"
                onClick={() => setOpen(false)}
                className="underline hover:text-foreground"
              >
                Privacy Policy
              </Link>
              , and full{" "}
              <Link
                to="/disclosures"
                onClick={() => setOpen(false)}
                className="underline hover:text-foreground"
              >
                Regulatory Disclosures
              </Link>
              .
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
