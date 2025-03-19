import React, { useRef, useState } from 'react';
import { SlRefresh } from "react-icons/sl";
import { generateSummary } from "../utils/api.js"
import { useAppContext } from '../providers/AppProvider.jsx';
import dayjs from "dayjs";


const GeneratedArticleComponent = ({ scanSummary }) => {
  if (Object.keys(scanSummary).length < 1) return


  const { summary, title, time } = scanSummary

  const parsedSummary = summary.split("\n").map((line, index) => {

    if (line === "") {
      return
    }

    // parse stock symbols in text
    return <p className="mb-2" key={index}>
      {line.split(/(\&\&[^\&]+\&\&)/).map((part, i) => {
        if (part.startsWith('&&') && part.endsWith('&&')) {
          return <span key={i} className="font-bold">{part.slice(2, -2)}</span>;
        }
        return part;
      })}
    </p>
  });

  return (
    <>
      <span className="text-sm text-text-muted">
        • <span className="italic">Summerad </span> {time}
      </span>
      <h2 className="text-4xl font-serif font-black text-text italic mb-4 pb-2">{title}</h2>
      <div className="text-sm font-sans text-text-article mb-4 prose prose">{parsedSummary}</div>
    </>

  )
}

export default function Scan() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState([]);
  const [message, setMessage] = useState("");
  const { scanSummary, setScanSummary } = useAppContext();
  const inpRef = useRef()

  const handleScan = async () => {
    setScanning(true);
    setMessage("");
    setProgress();

    try {
      const onProgress = (step) => {
        setProgress(step);
      };

      const generatedSummary = await generateSummary(inpRef.current.value, onProgress);
      generatedSummary.time = dayjs().format("HH:mm")

      if (generatedSummary.error) {
        setMessage(generatedSummary.error);
      } else {
        setScanSummary(generatedSummary);
      }
    } catch (error) {
      setMessage("An error occurred while generating the summary.");
    }

    setScanning(false);
  };

  return (
    <div className="container mx-auto max-w-6xl min-h-[80vh] px-4 py-8 bg-background text-text">
      <div className="flex flex-row  items-center gap-4 mb-8">
        <div className="flex flex-col items-center ">
          <h1 className="text-3xl font-bold text-text">Summera marknadsläget</h1>
          <p className=" text-text-article">Få en överblick över det nuvarande marknadsläget.</p>
        </div>
        <input className="border-b border-border w-24  px-4 outline-0 p-2" ref={inpRef} placeholder="Key" />
        <button
          onClick={handleScan}
          disabled={scanning}
          className="bg-foreground rounded-full text-text gap-2 border border-border font-bold py-2 px-2 text-xl transition-colors hover:text-secondary flex items-center justify-center"
        >
          {scanning ? <span className="spin"><SlRefresh /></span> : <SlRefresh />}
        </button>
      </div>
      {scanning ? (
        <div className="w-full max-w-md mt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 bg-background border border-border rounded-full text-xs flex flex-row justify-center items-center text-text-muted"></div>
              <p>{progress}...</p>
            </div>
            {progress == "Summerar datan" && (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-border rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-border rounded"></div>
                    <div className="h-4 bg-border rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <GeneratedArticleComponent scanSummary={scanSummary} />
      )}
      {message && <span>{message}</span>}
    </div>
  );
}

export function meta() {
  return [
    { title: "Scan Page" },
    { name: "description", content: "Scan your documents" },
  ];
}