import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";

describe("3D Runner arrow keys test", () => {
  it("pressing Left and Right arrows in 3D mode should not crash the app", () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();

    // Trigger Left arrow
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    });

    // Trigger Right arrow
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    });

    expect(container).toBeDefined();
  });
});
