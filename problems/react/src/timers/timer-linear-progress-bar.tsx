import { useEffect, useRef, useState } from "react";

const TICK = 50; // tick after TICK milliseconds

export const Timer = () => {
  const secondsInputRef = useRef(null);
  const minutesInputRef = useRef(null);
  const timeoutId = useRef(null);
  const [totalTime, setTotalTime] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    if (!seconds && !minutes) return;

    timeoutId.current = setTimeout(() => {
      if (seconds > 0) {
        setSeconds((sec) => parseFloat((sec - TICK / 1000).toFixed(2)));
      } else if (minutes > 0) {
        setMinutes((mins) => mins - 1);
        setSeconds(59);
      }
    }, TICK);

    return () => {
      clearTimeout(timeoutId.current);
    };
  }, [seconds, minutes]);

  const getTimeRemaining = () => {
    return seconds + minutes * 60;
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
      <div className="flex justify-center items-center gap-2">
        <input
          className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-base text-center outline-none focus:border-indigo-500 transition-colors"
          type="text"
          ref={minutesInputRef}
          placeholder="MM"
        />
        <input
          className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-base text-center outline-none focus:border-indigo-500 transition-colors"
          type="text"
          ref={secondsInputRef}
          placeholder="SS"
        />

        <button
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-base cursor-pointer hover:bg-indigo-500 transition-colors"
          onClick={() => {
            const seconds = parseInt(secondsInputRef.current?.value);
            const minutes = parseInt(minutesInputRef.current?.value);
            if (Number.isNaN(seconds) || Number.isNaN(minutes)) return;
            setSeconds(seconds);
            setMinutes(minutes);
            setTotalTime(seconds + minutes * 60);
            secondsInputRef.current.value = "";
            minutesInputRef.current.value = "";
          }}
        >
          Start
        </button>
      </div>

      <h2
        className={`text-5xl font-medium font-mono tabular-nums my-4 ${seconds === 0 && minutes === 0 ? "text-red-500" : "text-indigo-600"}`}
      >
        {String(minutes).padStart(2, "0")}:
        {String(Math.ceil(seconds)).padStart(2, "0")}
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
