import React, { useEffect, useRef, useState } from 'react';
import { SlRefresh } from "react-icons/sl";
import { FiSearch } from 'react-icons/fi';

import { generateSummary } from "../utils/api.js"
import { useAppContext } from '../providers/AppProvider.jsx';
import dayjs from "dayjs";
import { useAuthContext } from "../providers/AuthProvider.jsx";
import LogInModal from "../modals/logInModal.jsx";
import { useModal } from "../providers/ModalProvider.jsx";


const GeneratedArticleComponent = ({ scanSummary }) => {
  if (Object.keys(scanSummary).length < 1) return


  const { summary, title, time } = scanSummary

  const parsedSummary = summary.split("\n").map((line, index) => {

    if (line === "") {
      return
    }

    // parse stock symbols in text

    const parts = line.split(/(\[.*?\]\(.*?\)|\&\&[^\&]+\&\&|\*\*[^\*]+\*\*|##[^#]+##|\/red\/[^\/]+\/red\/|\/green\/[^\/]+\/green\/)/);
    return (
      <p className="mb-2 text-text-article" key={index}>
        {parts.map((part, i) => {

          if (part.startsWith('&&') && part.endsWith('&&')) {
            return <span key={i} className="font-bold">{part.slice(2, -2)}</span>;
          } else if (part.startsWith('**') && part.endsWith('**')) {
            return <strong className="" key={i}>{part.slice(2, -2)}</strong>;
          } else if (part.startsWith('##') && part.endsWith('##')) {
            return <h2 key={i} className="text-xl font-semibold">{part.slice(2, -2)}</h2>;
          } else if (part.startsWith('/red/') && part.endsWith('/red/')) {
            return <span key={i} className="text-amber-400">{part.slice(5, -5)}</span>;
          } else if (part.startsWith('/green/') && part.endsWith('/green/')) {
            return <span key={i} className="text-primary">{part.slice(7, -7)}</span>;
          }
          return part;
        })}
      </p >
    );
  });

  return (
    <>
      <span className="text-sm text-text-muted text-start">
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

  const { isPaidUser, isFreeUser } = useAuthContext();
  const { openModal } = useModal();

  const inpRef = useRef()

  const handleScan = async () => {
    setScanning(true);
    setMessage("");
    setProgress();

    try {
      const onProgress = (step) => {
        setProgress(step);
      };

      const generatedSummary = await generateSummary(onProgress);
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

  const PlaceholderItem = () => (
    <div className="bg-foreground   p-4 mb-4">
      <div className="h-6 bg-border  w-3/4 mb-2 "></div>
      <div className="h-4 bg-border  w-1/2 mb-2 "></div>
      <div className="h-4 bg-border  w-5/6 "></div>
    </div>
  );

  return (
    <div className="container mx-auto max-w-4xl min-h-[80vh] px-4 py-8 bg-background text-text">
      <h1 className="text-4xl font-bold text-text">Marknadslägesscanner</h1>
      <p className="text-text-article mb-8">Få en snabb och omfattande överblick över det nuvarande marknadsläget.</p>

      {isFreeUser ? (
        <div className="bg-foreground border border-border p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-2">Generera marknadsöversikt</h2>
              <p className="text-text-muted">Klicka på knappen för att skanna marknaden och få en detaljerad sammanfattning.</p>
            </div>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="bg-foreground border border-border text-text hover:cursor-pointer rounded-full py-3 px-6 text-lg transition-colors hover:bg-primary-dark flex items-center justify-center"
            >
              {scanning ? (
                <span className="flex items-center">
                  <SlRefresh className="spin mr-2" /> <span className=" text-base">Skannar...</span>
                </span>
              ) : (
                <span className="flex items-center">
                  <SlRefresh className="mr-2" /> <span className=" text-base">Generera</span>
                </span>
              )}
            </button>
          </div>

          {scanning ? (
            <div className="w-full mt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 bg-primary rounded-full animate-pulse"></div>
                  <p className="text-text-muted">{progress}...</p>
                </div>
                {progress === "Summerar datan" && (
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
          ) : Object.keys(scanSummary).length === 0 ? (
            <div className="w-full">
              <PlaceholderItem />
              <PlaceholderItem />
            </div>
          ) : (
            <GeneratedArticleComponent scanSummary={scanSummary} />
          )}

          {message && <span className="text-red-500 mt-4 block">{message}</span>}
        </div>
      ) : (
        <div className="bg-foreground border border-border rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-text mb-4"><span role="img" aria-label="locked">🔒</span> Låst funktion</h2>
          <p className="text-text-muted mb-2">Få en snabb marknadsöversikt på ett knapptryck</p>
          <p className="text-text-muted mb-6">Skapa ett konto / Logga in för att ta del av denna funktion</p>
          <button
            className="primary-btn"
            onClick={() => openModal(<LogInModal />)}
          >
            Skapa konto / logga in
          </button>
        </div>
      )}
    </div>
  );
}

export function meta() {
  return [
    { title: "Scan Page" },
    { name: "description", content: "Scan your documents" },
  ];
}