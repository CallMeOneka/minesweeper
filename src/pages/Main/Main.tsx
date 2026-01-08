import { useState } from "react";
import styles from "./Main.module.scss";
import clsx from "clsx";

type Cell = {
  coordinates: { x: number; y: number };
  isEnemy: boolean;
  isOpen: boolean;
  isFlagged: boolean;
  value: number;
};

type Difficult = 9 | 16;

const getKey = (coordinates: Cell["coordinates"]) =>
  `${coordinates.x},${coordinates.y}`;

const getMaxEnemies = (difficult: Difficult) => {
  if (difficult === 9) return 10;
  if (difficult === 16) return 40;
  return 0;
};

const generateEnemies = (difficult: Difficult) => {
  const maxEnemies = getMaxEnemies(difficult);

  const enemies: string[] = [];

  while (enemies.length < maxEnemies) {
    const x = Math.floor(Math.random() * difficult);
    const y = Math.floor(Math.random() * difficult);
    const key = getKey({ x, y });

    if (enemies.includes(key)) continue;
    enemies.push(key);
  }

  return enemies;
};

const getNeighbors = (coordinates: Cell["coordinates"], max: number) => {
  const { x, y } = coordinates;
  return [
    { x: x - 1, y: y - 1 },
    { x, y: y - 1 },
    { x: x + 1, y: y - 1 },
    { x: x - 1, y },
    { x: x + 1, y },
    { x: x - 1, y: y + 1 },
    { x, y: y + 1 },
    { x: x + 1, y: y + 1 },
  ].filter(
    (value) => value.x >= 0 && value.y >= 0 && value.x < max && value.y < max
  );
};

const getValue = (
  enemies: string[],
  coordinates: Cell["coordinates"],
  max: number
) => {
  const neighbors = getNeighbors(coordinates, max);

  const enemyNeighbors = neighbors.filter((neighbor) =>
    enemies.includes(getKey(neighbor))
  );

  return enemyNeighbors.length;
};

const handleGenerateMap = (difficult: Difficult): Map<string, Cell> => {
  const enemies = generateEnemies(difficult);

  const map = new Array(difficult).fill(null).map((_, index) =>
    new Array(difficult).fill(null).map((_, index2) => {
      const coordinates = { x: index, y: index2 };

      return {
        coordinates,
        isEnemy: enemies.includes(getKey(coordinates)),
        isOpen: false,
        isFlagged: false,
        value: null,
      };
    })
  );

  return new Map(
    map
      .flat()
      .map((value) => [
        getKey(value.coordinates),
        { ...value, value: getValue(enemies, value.coordinates, difficult) },
      ])
  );
};

export const Main = () => {
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">(
    "playing"
  );

  const [map, setMap] = useState(handleGenerateMap(9));

  const difficult = Math.sqrt(map.size) as Difficult;

  const handleStartGame = (difficult: Difficult) => {
    setGameStatus("playing");
    setMap(handleGenerateMap(difficult));
  };

  const handleOpenCell = (key: string, newMap: Map<string, Cell>) => {
    const value = newMap.get(key)!;

    newMap.set(key, {
      ...value,
      isOpen: true,
    });

    return newMap;
  };

  const handleOpenNeighbors = (
    coordinates: Cell["coordinates"],
    key: string,
    newMap: Map<string, Cell>
  ) => {
    const neighborsToOpen = getNeighbors(coordinates, difficult);

    const processedNeighbors = new Set<string>(key);

    while (neighborsToOpen.length > 0) {
      const neighbor = neighborsToOpen.shift()!;

      if (processedNeighbors.has(getKey(neighbor))) continue;

      const neighborKey = getKey(neighbor);
      const neighborValue = map.get(neighborKey)!;

      if (neighborValue.isOpen || neighborValue.isFlagged) continue;

      processedNeighbors.add(neighborKey);

      handleOpenCell(neighborKey, newMap);

      if (!neighborValue.value) {
        neighborsToOpen.push(...getNeighbors(neighbor, difficult));
      }
    }
  };

  const handleClickCell = (key: string) => {
    if (gameStatus !== "playing") return;

    const value = map.get(key)!;

    if (value.isOpen || value.isFlagged) return;

    const newMap = new Map(map);

    handleOpenCell(key, newMap);

    if (!value.value) {
      handleOpenNeighbors(value.coordinates, key, newMap);
    }

    setMap(newMap);

    if (
      Array.from(newMap.values()).every(
        (value) => value.isOpen || value.isEnemy
      )
    ) {
      setGameStatus("won");
      return;
    }

    if (value.isEnemy) {
      setGameStatus("lost");
      return;
    }
  };

  const handleRightClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    key: string
  ) => {
    e.preventDefault();

    if (gameStatus !== "playing") return;

    setMap((prev) => {
      const value = map.get(key)!;

      if (value.isOpen) return prev;

      const newMap = new Map(prev);
      newMap.set(key, { ...value, isFlagged: !value.isFlagged });
      return newMap;
    });
  };

  return (
    <>
      <main className={styles.main}>
        <div className={styles.settings}>
          <button
            type='button'
            className={styles.settingButton}
            onClick={() => handleStartGame(9)}
          >
            9
          </button>
          <button
            type='button'
            className={styles.settingButton}
            onClick={() => handleStartGame(16)}
          >
            16
          </button>
        </div>
        <div
          className={styles.game}
          style={{ "--difficult": difficult } as React.CSSProperties}
        >
          {Array.from(map.entries()).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleClickCell(key)}
              onContextMenu={(e) => handleRightClick(e, key)}
              className={clsx(styles.cell, {
                [styles.open]: value.isOpen,
                [styles.flagged]: value.isFlagged,
                [styles.enemy]: value.isOpen && value.isEnemy,
              })}
              disabled={value.isOpen || value.isFlagged}
            >
              {value.value && value.isOpen ? value.value : ""}
            </button>
          ))}
        </div>
      </main>
      {gameStatus !== "playing" && (
        <div className={styles.overlay}>
          <div className={styles.content}>
            <div>
              {gameStatus === "lost" && "Game Over! You lost!"}
              {gameStatus === "won" && "You won!"}
            </div>
            <button
              className={styles.restartButton}
              onClick={() => handleStartGame(difficult)}
            >
              Restart
            </button>
          </div>
        </div>
      )}
    </>
  );
};
