import { useEffect, useRef, useState } from "react";

const TICK = 50;

export const Timer = () => {
  const cx = 150;
  const cy = 150;
  const RADIUS = 120;
  const circumference = 2 * Math.PI * RADIUS;

  const timeoutId = useRef(null);
  const inputRef = useRef(null);
  const [totalTime, setTotalTime] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds) {
      timeoutId.current = setTimeout(() => {
        setSeconds((sec) => parseFloat((sec - TICK / 1000).toFixed(2)));
      }, TICK);
    }

    return () => {
      clearTimeout(timeoutId.current);
    };
  }, [seconds]);

  const stokeDashOffset = circumference * (1 - seconds / totalTime);

  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-screen -mt-24">
      <svg width={300} height={300}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={RADIUS}
          fill="none"
          stroke="#e2e8f0"
          stroke-width="12"
        />

        {/* Progress Bar */}
        <circle
          cx={cx}
          cy={cy}
          r={RADIUS}
          fill="none"
          stroke="#6366f1"
          stroke-width="12"
          stroke-linecap="round"
          stroke-dasharray={circumference}
          stroke-dashoffset={-stokeDashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          // style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />

        {/* Seconds label */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="48"
          fontWeight="bold"
          fill="#6366f1"
        >
          {seconds.toFixed(0)}
        </text>
      </svg>

      <div className="flex gap-3">
        <input
          type="text"
          ref={inputRef}
          placeholder="Seconds..."
          className="px-4 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        <button
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-base cursor-pointer hover:bg-indigo-500 transition-colors"
          onClick={() => {
            const val = parseInt(inputRef.current?.value);
            if (Number.isNaN(val)) return;
            setSeconds(val);
            setTotalTime(val);
            inputRef.current.value = "";
          }}
        >
          Start
        </button>
      </div>
    </div>
  );
};
