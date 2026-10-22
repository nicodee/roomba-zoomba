import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HOUSE_ZONES, getCurrentZone } from "./components/3d/BlueprintMiniMap";
import { RoomVictoryModal } from "./components/3d/RoomVictoryModal";

describe("Story Verification: Room-by-room level progression and clean objectives (story-00937f5d)", () => {
  it("AC-1: Each domestic room level is assigned a distinct dust quota and boundary parameters", () => {
    expect(HOUSE_ZONES.length).toBeGreaterThanOrEqual(3);

    const [hallway, livingRoom, kitchen] = HOUSE_ZONES;

    expect(hallway.name).toBe("Entry Hallway");
    expect(hallway.dustQuota).toBe(20);

    expect(livingRoom.name).toBe("Grand Living Room");
    expect(livingRoom.dustQuota).toBe(40);

    expect(kitchen.name).toBe("Chef's Kitchen");
    expect(kitchen.dustQuota).toBe(35);
  });

  it("AC-2: Correctly maps distance to active room and tracks cleanliness percentage toward 100%", () => {
    const hallway = getCurrentZone(30);
    expect(hallway.id).toBe("hallway");

    const dustCollected = 15;
    const progressPct = Math.round((dustCollected / hallway.dustQuota) * 100);
    expect(progressPct).toBe(75);

    const livingRoom = getCurrentZone(90);
    expect(livingRoom.id).toBe("living_room");
  });

  it("AC-3 & AC-4: RoomVictoryModal renders full mission summary with clean time, battery, and coins", () => {
    const onProceedMock = vi.fn();

    const { getByTestId, getByText } = render(
      <RoomVictoryModal
        roomName="Entry Hallway"
        nextRoomName="Grand Living Room"
        cleanTimeSeconds={34.2}
        dustCollected={20}
        quota={20}
        batteryRemaining={84}
        coinsEarned={30}
        onProceed={onProceedMock}
      />
    );

    expect(getByTestId("room-victory-modal")).toBeInTheDocument();
    expect(getByText(/ROOM 100% CLEANED!/i)).toBeInTheDocument();
    expect(getByText(/ENTRY HALLWAY MISSION COMPLETE/i)).toBeInTheDocument();
    expect(getByText("34.2s")).toBeInTheDocument();
    expect(getByText("⭐ 20/20")).toBeInTheDocument();
    expect(getByText("84% ⚡")).toBeInTheDocument();
    expect(getByText("🪙 +30")).toBeInTheDocument();

    const proceedBtn = getByTestId("proceed-room-btn");
    expect(proceedBtn).toHaveTextContent(/ENTER GRAND LIVING ROOM/i);

    fireEvent.click(proceedBtn);
    expect(onProceedMock).toHaveBeenCalledTimes(1);
  });

  it("AC-4b: Pressing Space or Enter triggers level advancement in RoomVictoryModal", () => {
    const onProceedMock = vi.fn();

    render(
      <RoomVictoryModal
        roomName="Grand Living Room"
        nextRoomName="Chef's Kitchen"
        cleanTimeSeconds={45.0}
        dustCollected={40}
        quota={40}
        batteryRemaining={72}
        coinsEarned={60}
        onProceed={onProceedMock}
      />
    );

    fireEvent.keyDown(window, { key: " " });
    expect(onProceedMock).toHaveBeenCalledTimes(1);
  });
});
