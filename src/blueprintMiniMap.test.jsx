import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BlueprintMiniMap, getCurrentZone, HOUSE_ZONES } from "./components/3d/BlueprintMiniMap";

describe("Story Verification: Architectural floor plan mini-map and room guide (story-922c9b68)", () => {
  it("AC-1: Renders the entire house layout with all domestic zones (Hallway, Living Room, Kitchen)", () => {
    const { getByTestId, getByText } = render(
      <BlueprintMiniMap distance={10} playerLane={0} dustCount={5} />
    );

    expect(getByTestId("blueprint-minimap")).toBeInTheDocument();
    expect(getByText(/DOMESTIC FLOOR PLAN/i)).toBeInTheDocument();
    expect(getByText(/ENTRY HALLWAY/i)).toBeInTheDocument();
    expect(getByText(/KITCHEN/i)).toBeInTheDocument();
    expect(getByText(/LIVING ROOM/i)).toBeInTheDocument();
  });

  it("AC-2: Renders real-time player beacon tracking Roomba coordinates", () => {
    const { getByTestId } = render(
      <BlueprintMiniMap distance={35} playerLane={1} dustCount={10} />
    );

    const beacon = getByTestId("player-beacon");
    expect(beacon).toBeInTheDocument();
    expect(beacon.getAttribute("style")).toContain("translate(140px");
  });

  it("AC-3: Room cleanliness increments toward 100% as dust is vacuumed", () => {
    // Hallway dust quota is 20. 15 collected = 75%
    const { getAllByText } = render(
      <BlueprintMiniMap distance={25} playerLane={0} dustCount={15} />
    );

    const matches = getAllByText("75%");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("AC-4: Flashes telegraphing radar marker when approaching doorway threshold within 20m", () => {
    // Hallway doorway is at 60m. At 48m, distance to door is 12m (<20m)
    const { getByTestId, getByText } = render(
      <BlueprintMiniMap distance={48} playerLane={0} dustCount={18} />
    );

    expect(getByTestId("radar-door-ping")).toBeInTheDocument();
    expect(getByText(/THRESHOLD IN 12m!/i)).toBeInTheDocument();
  });

  it("AC-4b: Radar marker does NOT show when far from doorway (>20m)", () => {
    const { queryByTestId } = render(
      <BlueprintMiniMap distance={10} playerLane={0} dustCount={5} />
    );

    expect(queryByTestId("radar-door-ping")).toBeNull();
  });

  it("Zone Transitions: Transition logic correctly resolves rooms", () => {
    expect(getCurrentZone(20).id).toBe("hallway");
    expect(getCurrentZone(100).id).toBe("living_room");
    expect(getCurrentZone(180).id).toBe("kitchen");
  });
});
