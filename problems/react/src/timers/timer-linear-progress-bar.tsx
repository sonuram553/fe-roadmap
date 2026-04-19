import { useEffect, useRef, useState } from "react";

const TICK = 50; // tick after TICK milliseconds

export const Timer = () => {
  const inputRef = useRef(null);
  const timeoutId = useRef(null);
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

  const getTimeRemaining = () => {
    return seconds;
  };

  // shrinks from 100% → 0% as time elapses
  const shrinkProgressBar = () => {
    return `${(100 * getTimeRemaining()) / totalTime}%`;
  };

  // grows from 0% → 100% as time elapses
  const growProgressBar = () => {
    return `${100 - (100 * getTimeRemaining()) / totalTime}%`;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8 max-w-sm mx-auto mt-20 border border-gray-200 rounded-xl shadow-md">
      <div className="flex w-full gap-2">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-base outline-none focus:border-indigo-500 transition-colors"
          type="text"
          ref={inputRef}
          placeholder="Seconds"
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

      <h2
        className={`text-5xl font-bold ${seconds === 0 ? "text-red-500" : "text-indigo-600"}`}
      >
        {seconds.toFixed(0)}
      </h2>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full"
          style={{ width: shrinkProgressBar() }}
        ></div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
        <div
          className="bg-emerald-500 h-2 rounded-full"
          style={{ width: growProgressBar() }}
        ></div>
      </div>
    </div>
  );
};
