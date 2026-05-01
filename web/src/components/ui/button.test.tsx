import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders the label", () => {
    render(<Button>Ask Flux</Button>);
    expect(screen.getByRole("button", { name: "Ask Flux" })).toBeInTheDocument();
  });

  it("applies the primary variant class by default", () => {
    render(<Button>Ask</Button>);
    expect(screen.getByRole("button", { name: "Ask" })).toHaveClass("bg-primary");
  });

  it("applies the ghost variant when requested", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole("button", { name: "Ghost" });
    expect(btn.className).toContain("hover:bg-surface");
  });

  it("respects the disabled prop", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });
});
