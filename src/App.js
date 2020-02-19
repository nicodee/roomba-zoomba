import React, { useState } from "react";
import "./App.css";

function Cell({ position, roombaPosition, direction }) {
  return (
    <div className="Cell" roombaPosition={roombaPosition} position={position}>
      {position.x === roombaPosition.x && position.y === roombaPosition.y ? (
        <Roomba direction={direction} />
      ) : null}
    </div>
  );
}

function createColumn(i, roombaPosition, direction) {
  let cells = [];
  for (var j = 0; j < 10; j++) {
    cells.push(
      <Cell
        position={{ x: i, y: j }}
        key={`${i}${j}`}
        roombaPosition={roombaPosition}
        direction={direction}
      />
    );
  }
  return (
    <div className="Column" key={i}>
      {cells}
    </div>
  );
}

function Grid({ roombaPosition, direction }) {
  let columns = [];
  for (var i = 0; i < 10; i++) {
    columns.push(createColumn(i, roombaPosition, direction));
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

function App() {
  const [roombaPosition, setRoombaPosition] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState("right");

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

  function handleMoveForward() {
    switch (direction) {
      case "right":
        if (roombaPosition.x < 9) {
          setRoombaPosition({
            ...roombaPosition,
            x: 1 + roombaPosition.x
          });
        }
        break;
      case "left":
        if (roombaPosition.x > -1 && roombaPosition.x !== 0) {
          setRoombaPosition({
            ...roombaPosition,
            x: roombaPosition.x - 1
          });
        }
        break;
      case "up":
        if (roombaPosition.y > -1 && roombaPosition.y !== 0) {
          setRoombaPosition({
            ...roombaPosition,
            y: roombaPosition.y - 1
          });
        }
        break;
      case "down":
        if (roombaPosition.y < 9) {
          setRoombaPosition({
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
      <div>Current Direction: {direction}</div>
      <div>
        Current Position: x: {roombaPosition.x} y: {roombaPosition.y}
      </div>

      <div>
        <button onClick={handleTurnRight}>Turn Right</button>
        <button onClick={handleMoveForward}>Move Forward</button>
      </div>
      <br />
      <Grid roombaPosition={roombaPosition} direction={direction} />
    </div>
  );
}

export default App;
