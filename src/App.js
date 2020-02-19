import React, { useState } from "react";
import "./App.css";

function Cell({ position, roombaPosition, direction, blockers }) {
  const cellIsBlocker = isCellAnObstacle(blockers, position);
  return (
    <div className="Cell" roombaPosition={roombaPosition} position={position}>
      {!cellIsBlocker ? (
        position.x === roombaPosition.x && position.y === roombaPosition.y ? (
          <Roomba direction={direction} />
        ) : null
      ) : (
        <span role="img" aria-label="obstacle" className="obstacle">
          🙅‍♂️
        </span>
      )}
    </div>
  );
}

function createColumn(i, roombaPosition, direction, blockers) {
  let cells = [];
  for (var j = 0; j < 10; j++) {
    cells.push(
      <Cell
        position={{ x: i, y: j }}
        key={`${i}${j}`}
        roombaPosition={roombaPosition}
        direction={direction}
        blockers={blockers}
      />
    );
  }
  return (
    <div className="Column" key={i}>
      {cells}
    </div>
  );
}

function Grid({ roombaPosition, direction, blockers }) {
  let columns = [];
  for (var i = 0; i < 10; i++) {
    columns.push(createColumn(i, roombaPosition, direction, blockers));
  }
  return <div className="Grid">{columns}</div>;
}

function Roomba({ direction }) {
  return (
    <div className="Roomba">
      <span role="img" aria-label="roomba" className={direction}>
        👉
      </span>
    </div>
  );
}

function isCellAnObstacle(obstacles, nextCell) {
  return obstacles.some(obstacle => {
    return nextCell.x === obstacle.x && nextCell.y === obstacle.y;
  });
}

function App() {
  const [roombaPosition, setRoombaPosition] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState("right");
  const blockers = [
    { x: 7, y: 8 },
    { x: 4, y: 3 },
    { x: 9, y: 0 },
    { x: 6, y: 6 }
  ];

  function handleTurnRight() {
    switch (direction) {
      case "right":
        setDirection("down");
        break;
      case "left":
        setDirection("up");
        break;
      case "up":
        setDirection("right");
        break;
      case "down":
        setDirection("left");
        break;
      default:
        break;
    }
  }

  function proceedToNextCell(nextCell) {
    !isCellAnObstacle(blockers, nextCell) && setRoombaPosition(nextCell);
  }

  function handleMoveForward() {
    switch (direction) {
      case "right":
        if (roombaPosition.x < 9) {
          proceedToNextCell({
            ...roombaPosition,
            x: 1 + roombaPosition.x
          });
        }
        break;
      case "left":
        if (roombaPosition.x > -1 && roombaPosition.x !== 0) {
          proceedToNextCell({
            ...roombaPosition,
            x: roombaPosition.x - 1
          });
        }
        break;
      case "up":
        if (roombaPosition.y > -1 && roombaPosition.y !== 0) {
          proceedToNextCell({
            ...roombaPosition,
            y: roombaPosition.y - 1
          });
        }
        break;
      case "down":
        if (roombaPosition.y < 9) {
          proceedToNextCell({
            ...roombaPosition,
            y: roombaPosition.y + 1
          });
        }
        break;

      default:
        break;
    }
  }

  return (
    <div className="App">
      <div className="buttons">
        <button onClick={handleTurnRight}>Turn Right</button>
        <button onClick={handleMoveForward}>Move Forward</button>
      </div>
      <br />
      <Grid
        roombaPosition={roombaPosition}
        direction={direction}
        blockers={blockers}
      />

      <br />
      <a href="https://github.com/nicodee/roomba-zoomba" target="blank">
        Link to repo on Github
      </a>
    </div>
  );
}

export default App;
