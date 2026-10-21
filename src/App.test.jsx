import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { RunnerHUD } from "./components/3d/RunnerHUD";

test("renders runner HUD metrics: distance and dust count", () => {
  const { getByTestId, getByText } = render(
    <RunnerHUD distance={120} dustCount={15} />
  );
  expect(getByText(/ROOMBA ZOOMBA 3D/i)).toBeInTheDocument();
  expect(getByTestId("distance-stat")).toHaveTextContent("120m");
  expect(getByTestId("dust-stat")).toHaveTextContent("15");
});

test("renders magnet active status bar when powerup is active", () => {
  const { getByText } = render(
    <RunnerHUD distance={50} dustCount={5} activeMagnet={true} magnetTimeLeft={6.5} />
  );
  expect(getByText(/VACUUM MAGNET ACTIVE!/i)).toBeInTheDocument();
});

test("renders game over modal on crash and calls onRestart when clicked", () => {
  const handleRestart = vi.fn();
  const { getByTestId, getByText } = render(
    <RunnerHUD
      distance={340}
      dustCount={42}
      isGameOver={true}
      onRestart={handleRestart}
    />
  );

  expect(getByTestId("gameover-modal")).toBeInTheDocument();
  expect(getByText(/ROOMBA CRASHED!/i)).toBeInTheDocument();
  expect(getByText(/340 meters/i)).toBeInTheDocument();

  const restartBtn = getByText(/RUN AGAIN/i);
  fireEvent.click(restartBtn);
  expect(handleRestart).toHaveBeenCalledTimes(1);
});
